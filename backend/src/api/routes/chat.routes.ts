import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/rbac.middleware.js";
import { askQuestion, queryChat } from "../controllers/chat.controller.js";

const router = express.Router();

router.post("/query", protect, authorizeRoles("owner", "admin", "member"), queryChat);
router.post("/ask/:conversationId", protect, authorizeRoles("owner", "admin", "member"), askQuestion);

export default router;