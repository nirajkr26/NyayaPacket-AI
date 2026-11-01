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
  JWT_SECRET: z.string().optional(),
  AWS_ENDPOINT_URL_S3: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("auto"),
  S3_BUCKET_NAME: z.string().default("nyayapacket-ai"),
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
  const isTest = process.env.NODE_ENV === "test";
  const raw = { ...process.env };

  // Fallback to local test services if secrets are empty in test environment
  if (isTest) {
    if (!raw.DATABASE_URL || raw.DATABASE_URL.trim() === "") {
      raw.DATABASE_URL = "postgresql://postgres:postgrespassword@localhost:5432/nyayapacket_test?schema=public";
    }
    if (!raw.REDIS_URL || raw.REDIS_URL.trim() === "") {
      raw.REDIS_URL = "redis://localhost:6379";
    }
  }

  // Ensure connection pool options for PostgreSQL (Neon / PgBouncer pooler)
  if (raw.DATABASE_URL && !raw.DATABASE_URL.includes("connection_limit")) {
    const sep = raw.DATABASE_URL.includes("?") ? "&" : "?";
    raw.DATABASE_URL = `${raw.DATABASE_URL}${sep}connection_limit=20&pool_timeout=30`;
    process.env.DATABASE_URL = raw.DATABASE_URL;
  }

  const result = envSchema.safeParse(raw);
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    throw new Error("Invalid environment configuration");
  }
  return result.data;
}

export const env = loadEnv();
