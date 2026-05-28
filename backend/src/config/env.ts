import { z } from "zod";

/**
 * Validates all required environment variables at startup.
 * Application will fail-fast with clear error messages if misconfigured.
 */
const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .url("DATABASE_URL must be a valid connection string"),

  JWT_SECRET: z
    .string()
    .min(8, "JWT_SECRET must be at least 8 characters"),

  GEMINI_API_KEY: z
    .string()
    .min(1, "GEMINI_API_KEY is required"),

  PORT: z
    .string()
    .default("5000")
    .transform(Number),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  FRONTEND_URL: z
    .string()
    .default("http://localhost:5173"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env;

export const validateEnv = (): Env => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Environment validation failed:");
    result.error.issues.forEach((issue) => {
      console.error(`   → ${issue.path.join(".")}: ${issue.message}`);
    });
    process.exit(1);
  }

  _env = result.data;
  return _env;
};

export const env = (): Env => {
  if (!_env) {
    return validateEnv();
  }
  return _env;
};

// Run validation immediately on module load
validateEnv();

