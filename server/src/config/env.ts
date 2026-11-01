import { z } from "zod";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from server root .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const envSchema = z.object({
  PORT: z
    .string()
    .default("5000")
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  AUTH_URL: z.string().optional(),
  JWKS_URL: z.string().optional(),
  AWS_ENDPOINT_URL_S3: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("auto"),
  GEMINI_API_KEY: z.string().optional(),
  DEEPGRAM_API_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().default("*"),
  RATE_LIMIT_MAX: z
    .string()
    .default("200")
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default("900000") // 15 minutes
    .transform((val) => parseInt(val, 10)),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    throw new Error("Invalid environment configuration");
  }
  return result.data;
}

export const env = loadEnv();
