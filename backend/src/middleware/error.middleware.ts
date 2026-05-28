import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/AppError.js";

export const errorMiddleware = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("Error caught by middleware:", error);

  let statusCode = 500;
  let message = "Internal server error";

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Map standard Prisma database errors to semantic HTTP statuses
    switch (error.code) {
      case "P2002":
        statusCode = 409;
        message = `Unique constraint violation: A record with this value already exists.`;
        break;
      case "P2025":
        statusCode = 404;
        message = "Requested database record not found.";
        break;
      default:
        statusCode = 400;
        message = `Database query error: ${error.message}`;
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "Database validation failed. Please verify submitted fields.";
  }

  return res.status(statusCode).json({
    success: false,
    message,
  });
};