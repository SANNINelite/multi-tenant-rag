import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";

export const signupService = async (
  name: string,
  email: string,
  password: string,
  tenantId: string
) => {

  const existingUser =
    await prisma.user.findUnique({
      where: {
        email,
      },
    });

  if (existingUser) {
    throw new AppError(
      "User already exists",
      409
    );
  }

  const tenant =
    await prisma.tenant.findUnique({
      where: {
        id: tenantId,
      },
    });

  if (!tenant) {
    throw new AppError(
      "Tenant not found",
      404
    );
  }

  const hashedPassword =
    await bcrypt.hash(password, 10);

  const userCount = await prisma.user.count({
    where: { tenantId },
  });
  const role = userCount === 0 ? "owner" : "member";

  const workspaceRolesObj = { [tenantId]: role };

  const user =
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        tenantId,
        role,
        workspaceRoles: JSON.stringify(workspaceRolesObj),
      },
    });

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

  const {
    password: _,
    ...userWithoutPassword
  } = user;

  return {
    user: userWithoutPassword,
    tenant,
    token,
  };
};

export const loginService = async (
  email: string,
  password: string
) => {

  const user =
    await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        tenant: true,
      },
    });

  if (!user) {
    throw new AppError(
      "Invalid email or password",
      401
    );
  }

  const isPasswordValid =
    await bcrypt.compare(
      password,
      user.password
    );

  if (!isPasswordValid) {
    throw new AppError(
      "Invalid email or password",
      401
    );
  }

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

  const {
    password: _,
    ...userWithoutPassword
  } = user;

  return {
    user: userWithoutPassword,
    tenant: user.tenant,
    token,
  };
};