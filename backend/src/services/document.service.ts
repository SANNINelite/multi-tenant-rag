import fs from "fs";

// @ts-ignore
import pdf from "pdf-parse/lib/pdf-parse.js";
export const extractPdfText =
  async (
    filePath: string
  ) => {

    const buffer =
      fs.readFileSync(filePath);

    const data =
      await pdf(buffer);

    return data.text;
};

import { chunkText } from "../utils/chunkText.js";
export const generateChunks =
  (
    text: string,
    chunkSize = 300,
    overlap = 50
  ) => {
    const words =
      text.split(/\s+/);
    const chunks: string[] = [];
    for (
      let i = 0;
      i < words.length;
      i += chunkSize - overlap
    ) {
      const chunk =
        words
          .slice(i, i + chunkSize)
          .join(" ");
      chunks.push(chunk);
    }

    return chunks;
};