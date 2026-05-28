import express from "express";
import cors from "cors";

import tenantRoutes from "./api/routes/tenant.routes.js";
import authRoutes from "./api/routes/auth.routes.js";
import userRoutes from "./api/routes/user.routes.js";
import documentRoutes from "./api/routes/document.routes.js";
import chatRoutes from "./api/routes/chat.routes.js";
import conversationRoutes from "./api/routes/conversation.routes.js";

import { errorMiddleware } from "./middleware/error.middleware.js";
import { prisma } from "./lib/prisma.js";
import { chatModel } from "./config/gemini.js";
import { env } from "./config/env.js";

const app = express();

app.use(
  cors({
    origin: env().FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", async (_req, res) => {
  let databaseStatus = "disconnected";
  let geminiStatus = "unavailable";
  let isHealthy = true;

  // 1. Verify PostgreSQL Database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseStatus = "connected";
  } catch (err) {
    databaseStatus = "error";
    isHealthy = false;
    console.error("Healthcheck: Database connection failed", err);
  }

  // 2. Verify Gemini API connectivity (minimal token call)
  try {
    await chatModel.generateContent({
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
      generationConfig: { maxOutputTokens: 1 }
    });
    geminiStatus = "available";
  } catch (err) {
    geminiStatus = "error";
    isHealthy = false;
    console.error("Healthcheck: Gemini connection failed", err);
  }

  res.status(isHealthy ? 200 : 500).json({
    status: isHealthy ? "healthy" : "unhealthy",
    database: databaseStatus,
    gemini: geminiStatus,
    timestamp: new Date().toISOString(),
  });
});


app.use("/tenant", tenantRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/conversations",conversationRoutes);



app.use(errorMiddleware);
export default app;