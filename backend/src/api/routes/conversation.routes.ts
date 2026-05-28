import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/rbac.middleware.js";
import {
    createConversation,
    getConversations,
    addDocumentsToConversation,
    updateConversation,
} from "../controllers/conversation.controller.js";

const router = express.Router();

router.post(
  "/create",
  protect,
  authorizeRoles("owner", "admin", "member"),
  createConversation
);

router.get(
  "/",
  protect,
  getConversations
);

router.post(
  "/:conversationId/add-documents",
  protect,
  authorizeRoles("owner", "admin", "member"),
  addDocumentsToConversation
);

router.put(
  "/:conversationId",
  protect,
  authorizeRoles("owner", "admin", "member"),
  updateConversation
);

export default router;