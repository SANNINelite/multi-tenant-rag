import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";

interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const protect = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {

  const authHeader =
    req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {
    throw new AppError(
      "Unauthorized",
      401
    );
  }

  const token =
    authHeader.split(" ")[1];

  try {

    const decoded =
      jwt.verify(
        token,
        env().JWT_SECRET
      ) as JwtPayload;

    req.user = decoded;

    next();

  } catch {
    throw new AppError(
      "Invalid token",
      401
    );
  }
};