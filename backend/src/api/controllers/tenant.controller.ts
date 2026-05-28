import { Request, Response } from "express";
import fs from "fs";

import { createTenantService } from "../../services/tenant.service.js";
import { createTenantSchema } from "../validators/tenant.validator.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { extractPdfText, generateChunks } from "../../services/document.service.js";
import { createEmbedding } from "../../services/embedding.service.js";
import { retrieveRelevantChunks } from "../../services/retrieval.service.js";
import { chatModel } from "../../config/gemini.js";
import {
  detectPromptInjection,
  checkConfidenceThreshold,
  getRAGSystemPrompt,
} from "../../services/guardrail.service.js";

export const createTenant = asyncHandler(
  async (
    req: Request,
    res: Response
  ) => {

    const validation =
      createTenantSchema.safeParse(req.body);

    if (!validation.success) {
      throw new AppError(
        "Invalid tenant data",
        400
      );
    }

    const { name } = validation.data;

    const tenant =
      await createTenantService(name);

    return res.status(201).json({
      success: true,
      data: tenant,
    });
  }
);

export const getTenant = asyncHandler(
  async (
    req: Request,
    res: Response
  ) => {
    const id = req.params.id as string;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    return res.status(200).json({
      success: true,
      data: tenant,
    });
  }
);

export const uploadTenantDocument = asyncHandler(
  async (
    req: AuthRequest,
    res: Response
  ) => {
    const tenantId = req.params.tenantId as string;
    if (!req.file) {
      throw new AppError("No file uploaded", 400);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    const extractedText = await extractPdfText(req.file.path);
    const document = await prisma.document.create({
      data: {
        title: req.file.originalname,
        originalName: req.file.originalname,
        filePath: req.file.path,
        extractedText,
        tenantId,
        uploadedBy: req.user?.userId || "system",
      },
    });

    const chunks = generateChunks(extractedText);
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await createEmbedding(chunks[i]);
      await prisma.chunk.create({
        data: {
          content: chunks[i],
          chunkIndex: i,
          embedding,
          documentId: document.id,
          tenantId,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Document uploaded and processed successfully",
      document,
      chunksStored: chunks.length,
    });
  }
);

export const getTenantDocuments = asyncHandler(
  async (
    req: Request,
    res: Response
  ) => {
    const tenantId = req.params.tenantId as string;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    const documents = await prisma.document.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: documents,
    });
  }
);

export const deleteTenantDocument = asyncHandler(
  async (
    req: Request,
    res: Response
  ) => {
    const tenantId = req.params.tenantId as string;
    const documentId = req.params.documentId as string;

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId,
      },
    });

    if (!document) {
      throw new AppError("Document not found or does not belong to this tenant", 404);
    }

    // 1. Delete vector chunks manual cascade
    await prisma.chunk.deleteMany({
      where: {
        documentId,
      },
    });

    // 2. Delete file from disk if exists
    if (fs.existsSync(document.filePath)) {
      try {
        fs.unlinkSync(document.filePath);
      } catch (err) {
        console.error("Failed to delete document file from disk:", err);
      }
    }

    // 3. Delete document record
    await prisma.document.delete({
      where: {
        id: documentId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Document and its vector embeddings deleted successfully",
    });
  }
);

export const queryTenantRAG = asyncHandler(
  async (
    req: AuthRequest,
    res: Response
  ) => {
    const tenantId = req.params.tenantId as string;
    const { query } = req.body;

    if (!query) {
      throw new AppError("Query is required", 400);
    }

    // Guardrail 1: Prompt Injection Check
    const promptInjectionCheck = detectPromptInjection(query);
    if (!promptInjectionCheck.isSafe) {
      return res.status(400).json({
        success: false,
        error: promptInjectionCheck.reason,
        fallback: promptInjectionCheck.fallbackAnswer,
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    // Retrieve relevant chunks exclusively within this tenant
    const chunks = await retrieveRelevantChunks(query, tenantId);

    // Guardrail 2: Low Confidence Check
    if (chunks.length === 0) {
      return res.status(200).json({
        success: true,
        answer: "I'm sorry, but I couldn't find enough reliable information in your workspace documents to answer this question.",
        confidence: 0,
        sources: [],
      });
    }

    const maxSimilarity = Math.max(...chunks.map((c) => c.similarity));
    const confidenceCheck = checkConfidenceThreshold(maxSimilarity);
    if (!confidenceCheck.isSafe) {
      return res.status(200).json({
        success: true,
        answer: confidenceCheck.fallbackAnswer,
        confidence: maxSimilarity,
        sources: chunks.map((c) => ({
          content: c.content,
          similarity: c.similarity,
        })),
      });
    }

    // Guardrail 3: Out-of-Scope System Prompt Context
    const context = chunks.map((c) => c.content).join("\n\n");
    const prompt = getRAGSystemPrompt(context);

    // Generate response using Gemini
    const result = await chatModel.generateContent(
      prompt + `\n\nQuestion: ${query}`
    );

    const answer = result.response.text().trim();

    return res.status(200).json({
      success: true,
      answer,
      confidence: maxSimilarity,
      sources: chunks.map((c) => ({
        content: c.content,
        similarity: c.similarity,
      })),
    });
  }
);

export const getTenantMembers = asyncHandler(
  async (
    req: Request,
    res: Response
  ) => {
    const tenantId = req.params.tenantId as string;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    // Fetch all users in the system to filter by workspaceRoles map
    const allUsers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    const members = allUsers
      .filter((user) => {
        try {
          const roles = JSON.parse(user.workspaceRoles || "{}");
          return (tenantId in roles) || (user.tenantId === tenantId);
        } catch {
          return user.tenantId === tenantId;
        }
      })
      .map((user) => {
        let workspaceRole = "";
        try {
          const roles = JSON.parse(user.workspaceRoles || "{}");
          workspaceRole = roles[tenantId];
        } catch {}

        // Fallback: if no workspace-specific role is saved, but this is the user's active tenant, use their active role
        if (!workspaceRole) {
          if (user.tenantId === tenantId) {
            workspaceRole = user.role;
          } else {
            workspaceRole = "member";
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: workspaceRole,
          createdAt: user.createdAt,
        };
      });

    return res.status(200).json({
      success: true,
      data: members,
    });
  }
);

export const updateTenantMemberRole = asyncHandler(
  async (
    req: AuthRequest,
    res: Response
  ) => {
    const tenantId = req.params.tenantId as string;
    const userId = req.params.userId as string;
    const { role } = req.body;

    if (!role || !["admin", "member", "viewer"].includes(role)) {
      throw new AppError("Invalid role. Role must be admin, member, or viewer.", 400);
    }

    // 1. Fetch user by ID
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new AppError("User not found.", 404);
    }

    // 2. Parse their workspaceRoles map and verify they joined this workspace
    let workspaceRolesMap: Record<string, string> = {};
    try {
      workspaceRolesMap = JSON.parse(targetUser.workspaceRoles || "{}");
    } catch {
      workspaceRolesMap = {};
    }

    const isMember = (tenantId in workspaceRolesMap) || (targetUser.tenantId === tenantId);
    if (!isMember) {
      throw new AppError("User is not a member of this workspace.", 400);
    }

    // 3. Prevent modifying the owner
    const currentWorkspaceRole = workspaceRolesMap[tenantId] || (targetUser.tenantId === tenantId ? targetUser.role : "member");
    if (currentWorkspaceRole === "owner") {
      throw new AppError("Cannot modify the role of the workspace owner.", 403);
    }

    // 3.1. Admins are only permitted to manage roles of member and viewer
    if (req.user!.role === "admin" && (currentWorkspaceRole === "admin" || currentWorkspaceRole === "owner")) {
      throw new AppError("Admins can only manage member and viewer roles.", 403);
    }

    // 4. Update the role in the map
    workspaceRolesMap[tenantId] = role;

    // 5. If this is the user's active tenant, update their active role as well
    const updateData: any = {
      workspaceRoles: JSON.stringify(workspaceRolesMap),
    };
    if (targetUser.tenantId === tenantId) {
      updateData.role = role;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully updated user role in workspace to ${role}`,
    });
  }
);