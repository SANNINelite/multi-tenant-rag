import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware.js"; 
import { retrieveRelevantChunks } from "../../services/retrieval.service.js";
import { prisma } from "../../lib/prisma.js";
import { chatModel } from "../../config/gemini.js";
import {
  detectPromptInjection,
  checkConfidenceThreshold,
  getRAGSystemPrompt,
} from "../../services/guardrail.service.js";

export const queryChat =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query is required",
      });
    }

    const chunks =
      await retrieveRelevantChunks(
        query,
        req.user!.tenantId
      );
    return res.status(200).json({
      success: true,
      query,
      matches:
        chunks.map((chunk) => ({
          content:
            chunk.content,

          similarity:
            chunk.similarity,
        })),
    });
};

export const askQuestion =
  async (
    req: AuthRequest,
    res: Response
  ) => {

    const query =
      req.body?.query;

    const conversationId =
      req.params.conversationId as string;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query required",
      });
    }

    // Guardrail 1: Prompt injection check
    const injectionCheck = detectPromptInjection(query);
    if (!injectionCheck.isSafe) {
      return res.status(400).json({
        success: false,
        message: injectionCheck.reason,
        answer: injectionCheck.fallbackAnswer,
      });
    }

    const conversation =
      await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
        include: {
          documents: true,
        },
      });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Tenant isolation: verify conversation belongs to requesting tenant
    if (conversation.tenantId !== req.user!.tenantId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Cross-tenant access is prohibited.",
      });
    }

    const previousMessages =
      await prisma.message.findMany({
        where: {
          conversationId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    const history =
      previousMessages
        .map(
          (msg) =>
            `${msg.role}: ${msg.content}`
        )
        .join("\n");

    const documentIds = conversation.documents.map((d) => d.id);

    const matches =
      await retrieveRelevantChunks(
        query,
        req.user!.tenantId,
        documentIds
      );

    // Guardrail 2: Low confidence / empty retrieval check
    if (matches.length === 0) {
      return res.status(200).json({
        success: true,
        answer: "I'm sorry, but I couldn't find enough reliable information in your workspace documents to answer this question.",
        retrievedChunks: 0,
      });
    }

    const maxSimilarity = Math.max(...matches.map((c) => c.similarity));
    const confidenceCheck = checkConfidenceThreshold(maxSimilarity);
    if (!confidenceCheck.isSafe) {
      return res.status(200).json({
        success: true,
        answer: confidenceCheck.fallbackAnswer,
        retrievedChunks: matches.length,
      });
    }

    // Guardrail 3: Out-of-scope system prompt with context grounding
    const context =
      matches
        .map((match) => match.content)
        .join("\n\n");

    const prompt = getRAGSystemPrompt(context, history);

    const result = await chatModel.generateContent(
      prompt + `\n\nQuestion: ${query}`
    );

    const answer = result.response.text().trim();

    await prisma.message.createMany({
      data: [
        {
          role: "user",
          content: query,
          conversationId,
        },
        {
          role: "assistant",
          content: answer,
          conversationId,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      answer,
      retrievedChunks: matches.length,
    });
};  