import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware.js";
import { AppError } from "../utils/AppError.js";

/**
 * Role hierarchy for the multi-tenant workspace system.
 * Higher index = more privileges.
 */
const ROLE_HIERARCHY = ["viewer", "member", "admin", "owner"] as const;

export type Role = (typeof ROLE_HIERARCHY)[number];

/**
 * Middleware factory that restricts route access to specified roles.
 *
 * Usage:
 *   router.delete("/resource", protect, authorizeRoles("owner", "admin"), handler);
 */
export const authorizeRoles = (...allowedRoles: Role[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const userRole = req.user.role as Role;

    if (!allowedRoles.includes(userRole)) {
      throw new AppError(
        `Forbidden: This action requires one of the following roles: ${allowedRoles.join(", ")}.`,
        403
      );
    }

    next();
  };
};
