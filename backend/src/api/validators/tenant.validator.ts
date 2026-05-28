import { z } from "zod";

export const createTenantSchema = z.object({
  name: z
    .string()
    .min(2, "Tenant name too short")
    .max(50, "Tenant name too long"),
});