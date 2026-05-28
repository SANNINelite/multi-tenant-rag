import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/rbac.middleware.js";
import { upload } from "../../config/multer.js";
import { uploadDocument } from "../controllers/document.controller.js";

const router = express.Router();

router.post("/upload", protect, authorizeRoles("owner", "admin", "member"), upload.single("file"), uploadDocument);

export default router;