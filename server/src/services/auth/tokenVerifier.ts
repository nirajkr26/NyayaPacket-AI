import { createRemoteJWKSet, jwtVerify, decodeProtectedHeader } from "jose";
import type { JWTPayload } from "jose";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { UnauthorizedError } from "../../utils/errors.js";

let remoteJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!remoteJWKS && env.JWKS_URL) {
    try {
      remoteJWKS = createRemoteJWKSet(new URL(env.JWKS_URL), {
        cacheMaxAge: 600000, // 10 minutes cache
        cooldownDuration: 30000, // 30 seconds cooldown
      });
    } catch (err: any) {
      logger.error({ err: err.message, url: env.JWKS_URL }, "Failed to initialize remote JWKS set");
    }
  }
  return remoteJWKS;
}

export interface VerifiedAuthPayload extends JWTPayload {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  role?: string;
  metadata?: Record<string, any>;
}

export async function verifyNeonJwt(token: string): Promise<VerifiedAuthPayload> {
  if (!token || typeof token !== "string") {
    throw new UnauthorizedError("Bearer token is missing or malformed");
  }

  const isDevOrTest = env.NODE_ENV === "development" || env.NODE_ENV === "test";

  // 1. Fast-path in Development & Test for demo/test tokens
  if (isDevOrTest) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        if (
          parts[2] === "mock_signature" ||
          parts[2] === "test-signature" ||
          !env.JWKS_URL
        ) {
          const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf-8"));
          if (payload && payload.sub) {
            return payload as VerifiedAuthPayload;
          }
        }
      }
    } catch {
      // Fall through to standard validation
    }
  }

  // 2. Inspect protected header for algorithm
  let header: { alg?: string; typ?: string } = {};
  try {
    header = decodeProtectedHeader(token);
  } catch (err: any) {
    if (isDevOrTest) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf-8"));
          if (payload && payload.sub) return payload as VerifiedAuthPayload;
        }
      } catch {
        // ignore
      }
    }
    throw new UnauthorizedError(`Malformed JWT header: ${err.message}`);
  }

  const alg = header.alg;

  // 3. HMAC Verification if JWT_SECRET is configured or dev token
  if (alg === "HS256" || alg === "HS384" || alg === "HS512") {
    if (env.JWT_SECRET) {
      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        if (!payload.sub) {
          throw new UnauthorizedError("Token missing subject claim ('sub')");
        }
        return payload as VerifiedAuthPayload;
      } catch (err: any) {
        if (!isDevOrTest) {
          throw new UnauthorizedError(`Invalid authentication token: ${err.message}`);
        }
      }
    }

    // In dev/test with HMAC and no/failed JWT_SECRET, allow valid JSON payload
    if (isDevOrTest) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf-8"));
          if (payload && payload.sub) return payload as VerifiedAuthPayload;
        }
      } catch {
        // ignore
      }
    }

    throw new UnauthorizedError("HMAC token signature validation failed");
  }

  // 4. Asymmetric JWKS Verification against Neon Auth (EdDSA, RS256, ES256)
  const isJwksAlg = alg === "EdDSA" || alg === "RS256" || alg === "ES256";
  const jwks = getJWKS();

  if (isJwksAlg && jwks) {
    try {
      const { payload } = await jwtVerify(token, jwks);
      if (!payload.sub) {
        throw new UnauthorizedError("Token missing subject claim ('sub')");
      }
      return payload as VerifiedAuthPayload;
    } catch (err: any) {
      logger.warn({ err: err.message }, "JWKS verification failed");
      if (!isDevOrTest) {
        throw new UnauthorizedError(`Invalid authentication token: ${err.message}`);
      }
    }
  }

  // 5. Development & Test Fallback
  if (isDevOrTest) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf-8"));
        if (payload && payload.sub) {
          return payload as VerifiedAuthPayload;
        }
      }
    } catch {
      // Fall through to error
    }
  }

  throw new UnauthorizedError("Authentication service is unavailable or token is invalid");
}
