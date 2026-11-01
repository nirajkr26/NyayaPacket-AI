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

  // 1. Inspect protected header for algorithm
  let header: { alg?: string; typ?: string } = {};
  try {
    header = decodeProtectedHeader(token);
  } catch (err: any) {
    if (!isDevOrTest) {
      throw new UnauthorizedError(`Malformed JWT header: ${err.message}`);
    }
  }

  const isSymmetricAlg =
    header.alg === "HS256" || header.alg === "HS384" || header.alg === "HS512";

  // 2. Production / Live JWKS Verification for Asymmetric Tokens (EdDSA, RS256, ES256)
  // Only attempt JWKS verification if the algorithm is not an HMAC algorithm
  if (!isSymmetricAlg) {
    const jwks = getJWKS();
    if (jwks) {
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
  }

  // 3. HMAC Verification if JWT_SECRET is configured
  if (isSymmetricAlg && env.JWT_SECRET) {
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

  // 4. Development & Test Fallback: safely extract payload for mock/demo accounts
  if (isDevOrTest || !env.JWKS_URL) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payloadBuf = Buffer.from(parts[1]!, "base64url");
        const payload = JSON.parse(payloadBuf.toString("utf-8"));
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
