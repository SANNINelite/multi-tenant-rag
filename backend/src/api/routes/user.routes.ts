import express from "express";
import { getMe, switchTenant } from "../controllers/user.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me",protect,getMe);
router.post("/switch-tenant",protect,switchTenant);

export default router;