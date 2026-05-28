import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { prisma } from "../../lib/prisma.js";
import { extractPdfText, generateChunks } from "../../services/document.service.js";
import { createEmbedding } from "../../services/embedding.service.js";
import fs from "fs";

export const uploadDocument =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }
    const extractedText =
  await extractPdfText(req.file.path);
const document =
  await prisma.document.create({
    data: {
      title:
        req.file.originalname,
      originalName:
        req.file.originalname,
      filePath:
        req.file.path,
      extractedText,
      tenantId:
        req.user!.tenantId,
      uploadedBy:
        req.user!.userId,
    },
});
const chunks =
  generateChunks(extractedText);
for (
  let i = 0;
  i < chunks.length;
  i++
) {
  const embedding =
    await createEmbedding(
      chunks[i]
    );
  await prisma.chunk.create({
    data: {
      content:
        chunks[i],
      chunkIndex: i,
      embedding,
      documentId:
        document.id,
      tenantId:
        req.user!.tenantId,
    },
  });
}
  fs.unlinkSync(req.file.path);
    return res.status(201).json({
  success: true,
  message:
    "Document processed successfully",
  chunksStored:
    chunks.length,
  document,
});
};