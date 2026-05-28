import { chatModel }
from "../config/gemini.js";

export const generateAnswer =
  async (
    query: string,
    context: string,
    history?: string
  ) => {

    const prompt = `
You are a helpful AI assistant.

Answer ONLY from the provided context.

Previous Conversation:
${history || "No previous history"}

Context:
${context}

Question:
${query}
`;

    const result =
      await chatModel.generateContent(
        prompt
      );

    return result.response.text();
};