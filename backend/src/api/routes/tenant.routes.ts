import { Router, Response, NextFunction } from "express";
import {
  createTenant,
  getTenant,
  uploadTenantDocument,
  getTenantDocuments,
  deleteTenantDocument,
  queryTenantRAG,
  getTenantMembers,
  updateTenantMemberRole,
} from "../controllers/tenant.controller.js";
import { protect, AuthRequest } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/rbac.middleware.js";
import { upload } from "../../config/multer.js";
import { AppError } from "../../utils/AppError.js";

const router = Router();

// Strict tenant isolation guardrail middleware
const verifyTenantAccess = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    throw new AppError("Unauthorized", 401);
  }
  
  // Enforce isolation by matching JWT tenantId with target URL parameter
  if (req.user.tenantId !== req.params.tenantId) {
    throw new AppError("Forbidden: Cross-tenant access is prohibited.", 403);
  }
  next();
};

// 1. Create Tenant
router.post("/", createTenant);

// 2. Get Tenant metadata
router.get("/:id", getTenant);

// 3. Upload Tenant Knowledge Document
router.post(
  "/:tenantId/documents",
  protect,
  verifyTenantAccess,
  authorizeRoles("owner", "admin", "member"),
  upload.single("file"),
  uploadTenantDocument
);

// 4. Get Tenant Knowledge Documents list
router.get(
  "/:tenantId/documents",
  protect,
  verifyTenantAccess,
  getTenantDocuments
);

// 5. Delete Tenant Knowledge Document — restricted to owner/admin
router.delete(
  "/:tenantId/documents/:documentId",
  protect,
  verifyTenantAccess,
  authorizeRoles("owner", "admin"),
  deleteTenantDocument
);

// 6. Query Tenant RAG Context (with security, out-of-scope, & confidence guardrails)
router.post(
  "/:tenantId/query",
  protect,
  verifyTenantAccess,
  authorizeRoles("owner", "admin", "member"),
  queryTenantRAG
);

// 7. Get Tenant members list
router.get(
  "/:tenantId/members",
  protect,
  verifyTenantAccess,
  getTenantMembers
);

// 8. Update Tenant member's role (restricted to owner and admin roles)
router.put(
  "/:tenantId/members/:userId/role",
  protect,
  verifyTenantAccess,
  authorizeRoles("owner", "admin"),
  updateTenantMemberRole
);

export default router;