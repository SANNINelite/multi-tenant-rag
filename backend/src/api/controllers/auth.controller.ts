import { Request, Response } from "express";
import { signupSchema, loginSchema } from "../validators/auth.validator.js";
import { signupService, loginService } from "../../services/auth.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const signup = asyncHandler(
  async (
    req: Request,
    res: Response
  ) => {

    const validation =
      signupSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.flatten(),
      });
    }

    const {
      name,
      email,
      password,
      tenantId,
    } = validation.data;

    const result =
      await signupService(
        name,
        email,
        password,
        tenantId
      );

    return res.status(201).json({
      success: true,
      data: result,
    });
  }
);

export const login = asyncHandler(
  async (
    req: Request,
    res: Response
  ) => {

    const validation =
      loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.flatten(),
      });
    }

    const {
      email,
      password,
    } = validation.data;

    const result =
      await loginService(
        email,
        password
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  }
);