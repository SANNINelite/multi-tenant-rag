import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "./env.js";

const genAI =
  new GoogleGenerativeAI(
    env().GEMINI_API_KEY
  );

export const embeddingModel =
  genAI.getGenerativeModel({
    model: "gemini-embedding-001",
  });

export const chatModel =
  genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });