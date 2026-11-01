# NyayaPacket AI — Production Deployment & Operations Guide

## 1. Executive Summary & Architecture Overview

NyayaPacket AI is architected as a secure, DPDP Act 2023 compliant LegalTech platform for India.
The system employs a decoupled, asynchronous microservices architecture:

1. **Client Application**: React 19 Single-Page Application (SPA) built with Vite, Tailwind CSS (v4), Axios, and TanStack Query.
2. **API Server**: Express.js REST API with strict Zod validation, JWT/JWKS token verification, and PostgreSQL row-level authorization.
3. **Background Worker Engine**: Dedicated BullMQ workers orchestrating:
   - Multimodal OCR extraction via Google Gemini Vision
   - Speech-to-Text transcription via Deepgram Nova-2
   - Case analysis & fact timeline synthesis via Gemini LLM
   - Headless PDF Case Packet compilation via Puppeteer with SHA-256 tamper-proof hashing.
4. **Data Tier**:
   - **Neon PostgreSQL**: Single source of truth for identities, case records, claims, access grants, and audit trails.
   - **Upstash Redis**: TLS-secured message queue broker and ephemeral rate limiting cache.
   - **Neon Private S3 Storage**: Encrypted object storage with 15-minute presigned upload and download URLs.

---

## 2. Environment Variables Specification

All sensitive production secrets must be provisioned via secret managers (e.g., AWS Secrets Manager, Doppler, or Neon Secrets).

### Server & Worker (`server/.env`)

| Variable | Description | Example / Format |
|---|---|---|
| `NODE_ENV` | Runtime environment mode | `production` |
| `PORT` | API Server listening port | `5000` |
| `DATABASE_URL` | Neon PostgreSQL Connection String (Pooler or Direct) | `postgresql://user:pass@ep-xyz.ap-southeast-1.aws.neon.tech/nyayapacket?sslmode=require` |
| `REDIS_URL` | Upstash Redis connection URI with TLS | `rediss://default:password@xyz.upstash.io:6379` |
| `AUTH_URL` | Better Auth / Neon Auth base URL | `https://auth.nyayapacket.in` |
| `JWKS_URL` | Identity provider cryptographic public keys | `https://auth.nyayapacket.in/.well-known/jwks.json` |
| `JWT_SECRET` | Fallback signature verification secret (min 32 chars) | `your_64_character_random_hex_string_here` |
| `S3_ENDPOINT` | Private S3 API endpoint URL | `https://s3.ap-south-1.amazonaws.com` |
| `S3_REGION` | S3 Region | `ap-south-1` |
| `S3_BUCKET_NAME` | S3 Private Bucket for Evidence & Dossiers | `nyayapacket-prod-evidence` |
| `S3_ACCESS_KEY_ID` | IAM access key | `AKIAIOSFODNN7EXAMPLE` |
| `S3_SECRET_ACCESS_KEY` | IAM secret access key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `GEMINI_API_KEY` | Google Gemini Vision & LLM Key | `AIzaSy...` |
| `DEEPGRAM_API_KEY` | Deepgram Nova-2 STT Key | `...` |

### Client (`client/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Base API endpoint for client requests | `/api/v1` (or `https://api.nyayapacket.in/api/v1`) |

---

## 3. Database Migration Runbook

Before launching any new release:

```bash
# 1. Apply database migrations to production PostgreSQL
cd server
bunx prisma migrate deploy

# 2. Seed statutory categories and practice areas (idempotent)
bun run prisma/seed.ts
```

---

## 4. Docker & Container Deployment

### Local Production Emulation

```bash
docker compose up -d --build
```

### Health Verification

```bash
curl -f http://localhost:5000/health
curl -f http://localhost:5000/ready
```

---

## 5. Security & DPDP Act 2023 Compliance Checklist

1. **PostgreSQL as Sole Authorization Authority**: Client permissions and scoped access grants (`canViewSummary`, `canViewEvidence`, `canDownload`) are strictly evaluated on every database transaction.
2. **Private Evidence Storage**: No public S3 buckets. Evidence files are only accessible via short-lived (15-min) presigned download URLs granted after role and grant verification.
3. **Admin Privacy Safeguards**: Administrative personnel are restricted to case metadata by default; direct access to citizen evidence and statements is blocked.
4. **Immutable Security Audit Trail**: Every case creation, evidence upload, consultation booking, access grant issuance, and revocation is recorded in `AuditLog` with actor ID, timestamp, and metadata.
5. **Tamper-Evident Dossiers**: All compiled PDF packets include cover sheets with cryptographic SHA-256 digests allowing any court or advocate to independently verify file authenticity.
