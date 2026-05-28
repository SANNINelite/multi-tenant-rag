export interface GuardrailResult {
  isSafe: boolean;
  reason?: string;
  fallbackAnswer?: string;
}

export const detectPromptInjection = (query: string): GuardrailResult => {
  const promptInjectionKeywords = [
    "ignore previous instructions",
    "ignore instructions",
    "system prompt",
    "ignore above",
    "override prompt",
    "bypass rules",
    "you are now",
    "instead of answering"
  ];

  const lowerQuery = query.toLowerCase();
  const matched = promptInjectionKeywords.some((keyword) =>
    lowerQuery.includes(keyword)
  );

  if (matched) {
    return {
      isSafe: false,
      reason: "Prompt injection attempt detected.",
      fallbackAnswer:
        "Security Guardrail: Suspicious query behavior detected. Your request cannot be processed.",
    };
  }

  return { isSafe: true };
};

export const checkConfidenceThreshold = (
  maxSimilarity: number,
  threshold = 0.35
): GuardrailResult => {
  if (maxSimilarity < threshold) {
    return {
      isSafe: false,
      reason: "Low confidence retrieval.",
      fallbackAnswer:
        "I'm sorry, but I couldn't find enough reliable information in your workspace documents to confidently answer this question.",
    };
  }

  return { isSafe: true };
};

export const getRAGSystemPrompt = (context: string, history?: string): string => {
  return `You are a secure, multi-tenant AI assistant.

CRITICAL INSTRUCTIONS:
1. Answer the Question ONLY using the facts mentioned in the Context.
2. If the answer cannot be directly derived from the Context, or if the question is out-of-scope/unrelated to the Context, you MUST respond exactly with: "I'm sorry, but this question is out-of-scope and cannot be answered using the available workspace documents."
3. Strictly refuse to answer general knowledge, speculative, or external questions not grounded in the Context.

Previous Chat History:
${history || "No previous history."}

Context:
${context}
`;
};
