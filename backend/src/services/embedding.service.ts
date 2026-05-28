import { embeddingModel }
from "../config/gemini.js";

export const createEmbedding =
  async (text: string) => {

    const result =
      await embeddingModel.embedContent(
        text
      );

    return result.embedding.values;
};