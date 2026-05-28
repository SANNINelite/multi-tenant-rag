import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

export const createConversation = async (
  req: AuthRequest,
  res: Response
) => {
  const { documentId, documentIds } = req.body;

  let connectIds: string[] = [];
  if (Array.isArray(documentIds)) {
    connectIds = documentIds;
  } else if (typeof documentId === "string") {
    connectIds = [documentId];
  }

  // Tenant isolation: verify all documents belong to the requesting tenant
  if (connectIds.length > 0) {
    const ownedDocs = await prisma.document.findMany({
      where: {
        id: { in: connectIds },
        tenantId: req.user!.tenantId,
      },
      select: { id: true },
    });

    if (ownedDocs.length !== connectIds.length) {
      throw new AppError("Forbidden: One or more documents do not belong to this workspace.", 403);
    }
  }

  const conversation = await prisma.conversation.create({
    data: {
      tenantId: req.user!.tenantId,
      userId: req.user!.userId,
      documents: {
        connect: connectIds.map((id: string) => ({ id })),
      },
    },
    include: {
      documents: true,
      messages: true,
    },
  });

  return res.status(201).json({
    success: true,
    conversation,
  });
};

export const getConversations = async (
  req: AuthRequest,
  res: Response
) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      tenantId: req.user!.tenantId,
    },
    include: {
      documents: true,
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.status(200).json({
    success: true,
    conversations,
  });
};

export const addDocumentsToConversation = async (
  req: AuthRequest,
  res: Response
) => {
  const conversationId = req.params.conversationId as string;
  const { documentIds } = req.body;

  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    throw new AppError("documentIds array is required", 400);
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  if (conversation.tenantId !== req.user!.tenantId) {
    throw new AppError("Forbidden: Cross-tenant modification prohibited.", 403);
  }

  // Tenant isolation: verify all documents belong to the requesting tenant
  const ownedDocs = await prisma.document.findMany({
    where: {
      id: { in: documentIds },
      tenantId: req.user!.tenantId,
    },
    select: { id: true },
  });

  if (ownedDocs.length !== documentIds.length) {
    throw new AppError("Forbidden: One or more documents do not belong to this workspace.", 403);
  }

  const updatedConversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      documents: {
        connect: documentIds.map((id: string) => ({ id })),
      },
    },
    include: {
      documents: true,
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return res.status(200).json({
    success: true,
    conversation: updatedConversation,
  });
};

export const updateConversation = async (
  req: AuthRequest,
  res: Response
) => {
  const conversationId = req.params.conversationId as string;
  const { title } = req.body;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  if (conversation.tenantId !== req.user!.tenantId) {
    throw new AppError("Forbidden: Cross-tenant modification prohibited.", 403);
  }

  const updatedConversation = await (prisma.conversation as any).update({
    where: { id: conversationId },
    data: {
      title: title,
    },
    include: {
      documents: true,
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return res.status(200).json({
    success: true,
    conversation: updatedConversation,
  });
};