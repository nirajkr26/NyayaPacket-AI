import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface AppConfig {
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  PORT: number;
  CLIENT_ORIGIN: string;
  NODE_ENV: string;
}

export function loadConfig(): AppConfig {
  const MONGODB_URI = process.env.MONGODB_URI?.trim();
  if (!MONGODB_URI) {
    throw new Error('Configuration error: MONGODB_URI is required. Please check your .env file.');
  }

  const JWT_SECRET = process.env.JWT_SECRET?.trim();
  if (!JWT_SECRET) {
    throw new Error('Configuration error: JWT_SECRET is required. Please check your .env file.');
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
  const NODE_ENV = process.env.NODE_ENV || 'development';

  return {
    MONGODB_URI,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    PORT,
    CLIENT_ORIGIN,
    NODE_ENV,
  };
}

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}
