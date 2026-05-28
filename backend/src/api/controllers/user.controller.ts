import { Response } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { env } from "../../config/env.js";

export const getMe = (
  req: AuthRequest,
  res: Response
) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

export const switchTenant = asyncHandler(
  async (
    req: AuthRequest,
    res: Response
  ) => {
    const { tenantId } = req.body;
    if (!tenantId) {
      throw new AppError("tenantId is required", 400);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new AppError("Workspace/Tenant not found", 404);
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!currentUser) {
      throw new AppError("User not found", 404);
    }

    let workspaceRolesMap: Record<string, string> = {};
    try {
      workspaceRolesMap = JSON.parse(currentUser.workspaceRoles || "{}");
    } catch (e) {
      workspaceRolesMap = {};
    }

    // 1. Auto-save current active role for the current workspace before switching away
    workspaceRolesMap[currentUser.tenantId] = currentUser.role;

    // 2. Resolve role in target workspace
    let targetRole = workspaceRolesMap[tenantId];
    if (!targetRole) {
      // Default to member if the user has no role assigned yet in this workspace
      targetRole = "member";
      workspaceRolesMap[tenantId] = "member";
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        tenantId,
        role: targetRole,
        workspaceRoles: JSON.stringify(workspaceRolesMap),
      },
    });

    // Re-sign JWT token with new tenantId and correct targetRole
    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
      },
      env().JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      user: userWithoutPassword,
      tenant,
      token,
    });
  }
);