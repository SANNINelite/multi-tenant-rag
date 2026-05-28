import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";

export const createTenantService = async (
  name: string
) => {

  const existingTenant = await prisma.tenant.findFirst({
    where: {
      name,
    },
  });

  if (existingTenant) {
    throw new AppError(
      "Tenant already exists",
      409
    );
  }

  const tenant = await prisma.tenant.create({
    data: {
      name,
    },
  });

  return tenant;
};