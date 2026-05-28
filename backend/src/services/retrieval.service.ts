import { prisma }
from "../lib/prisma.js";

import { createEmbedding }
from "./embedding.service.js";

import { cosineSimilarity }
from "../utils/cosineSimilarity.js";

export const retrieveRelevantChunks =
  async (
    query: string,
    tenantId: string,
    documentIds?: string[] | string
  ) => {
    const queryEmbedding =
      await createEmbedding(query);

    let targetIds: string[] | undefined = undefined;
    if (Array.isArray(documentIds)) {
      targetIds = documentIds;
    } else if (typeof documentIds === "string") {
      targetIds = [documentIds];
    }

    const chunks =
      await prisma.chunk.findMany({
        where: {
          tenantId,
          ...(targetIds && targetIds.length > 0 && {
            documentId: {
              in: targetIds,
            },
          }),
        },
      });

    const scoredChunks =
      chunks.map((chunk) => {

        const similarity =
          cosineSimilarity(

            queryEmbedding,

            chunk.embedding as number[]
          );

        return {
          ...chunk,
          similarity,
        };
      });

    scoredChunks.sort(
      (a, b) =>
        b.similarity - a.similarity
    );
    return scoredChunks.slice(0, 3);
};