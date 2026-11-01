
# NyayaPacket AI

> **Your Story. Organized. Your Legal Journey, Simplified.**

NyayaPacket AI is an enterprise-grade LegalTech and citizen legal empowerment platform purpose-built for the Indian legal ecosystem. It bridges the critical divide between distressed citizens and legal advocates by converting fragmented personal narratives, WhatsApp screenshots, UPI receipts, rent agreements, handwritten notices, voice memos, and police complaints into verified, source-linked, cryptographically stamped, and lawyer-ready Court Dossiers.

---

## 📑 Table of Contents

- [Executive Overview & Problem Statement](#-executive-overview--problem-statement)
- [System Architecture](#️-system-architecture)
- [Key Portals & Capabilities](#-key-portals--capabilities)
  - [Citizen Portal](#1-citizen-portal)
  - [Advocate Workspace](#2-advocate-workspace)
  - [Platform Administration](#3-platform-administration)
- [Database & Relational Model](#-database--relational-model)
- [Core Functional Pipelines](#-core-functional-pipelines)
  - [1. Dynamic AI Intake Interview](#1-dynamic-ai-intake-interview)
  - [2. Multimodal Evidence Vault & Processing](#2-multimodal-evidence-vault--processing)
  - [3. AI Case Synthesis & Source Provenance](#3-ai-case-synthesis--source-provenance)
  - [4. Citizen Verification & Tamper-Evident Dossier Generation](#4-citizen-verification--tamper-evident-dossier-generation)
  - [5. Granular Scoped Access Grants & Dual-Channel Collaboration](#5-granular-scoped-access-grants--dual-channel-collaboration)
- [Zero-Trust Security & Anti-IDOR Architecture](#-zero-trust-security--anti-idor-architecture)
- [Technology Stack](#️-technology-stack)
- [Local Setup & Development Guide](#-local-setup--development-guide)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Database Setup & Migrations](#database-setup--migrations)
  - [Running the Services](#running-the-services)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [API Reference Overview](#-api-reference-overview)
- [Documentation Index](#-documentation-index)

---

## 🎯 Executive Overview & Problem Statement

India’s judicial system faces an unprecedented backlog of over 50 million pending cases across District Courts, High Courts, and the Supreme Court. A substantial cause of delay occurs before formal pleadings even reach courtrooms:

1. **Information Asymmetry & Emotional Burden**: Citizens unfamiliar with legal frameworks struggle to articulate actionable claims, often bringing disheveled folders of unorganized WhatsApp exports, bank records, and physical receipts.
2. **Advocate Intake Inefficiency**: Lawyers expend billable hours sifting through unstructured records, attempting to reconstruct chronological facts, cross-check transaction dates, and extract party details.
3. **Lack of Evidentiary Provenance**: Documents shared over messaging apps lack verifiable integrity hashes, chain-of-custody tracking, and explicit client verification sign-offs.

**NyayaPacket AI solves this intake friction:**
- Empowers citizens through an empathetic, multi-turn AI legal interviewer.
- Automatically transcribes audio notes via Deepgram Nova-3 and runs multimodal document OCR via Google Gemini.
- Synthesizes chronologies with source-grounded references to prevent hallucination.
- Requires citizen sign-off before generating a tamper-evident, SHA-256 stamped PDF Court Dossier.
- Facilitates legal consultations with Bar Council-verified advocates protected by granular, time-bound, cryptographically revocable access grants.

---

## 🏛️ System Architecture

NyayaPacket AI is engineered as a high-performance **Modular Monolith** paired with a decoupled **Asynchronous Background Worker**:

```mermaid
flowchart TB
    subgraph Client["Frontend Client (React 19 + TypeScript + Vite + Tailwind CSS v4)"]
        CP["Citizen Portal & Dispute Launchpad"]
        LP["Advocate Workspace & Onboarding"]
        AP["Admin Governance Console"]
        AuthClient["Better Auth Session Client"]
    end

    subgraph API["Backend API Service (Bun + Express.js + Strict TypeScript)"]
        Gateway["REST API Router (/api/v1)"]
        JWKSMid["JWKS Token Verifier (jose)"]
        RBACMid["PostgreSQL-Authoritative RBAC Guard"]
        AuthzMid["Anti-IDOR Resource Evaluator (canAccessCase)"]
        
        subgraph DomainModules["Domain Modules"]
            CaseMod["Cases & Case Parties"]
            InterviewMod["AI Legal Interview & Statements"]
            EvidenceMod["Evidence Vault & Presigned S3 Relay"]
            AnalysisMod["AI Synthesis & Fact Chronology"]
            PacketMod["Puppeteer PDF Dossier Engine"]
            ConsultMod["Consultations & Scoped Grants"]
            LawyerMod["Lawyer Verification & Directory"]
            AdminMod["Admin Metrics, Queues & Audit Logs"]
        end
    end

    subgraph Infrastructure["Infrastructure & Persistence"]
        Postgres[("Neon PostgreSQL (Pooled SSL)")]
        RedisQueue[("Upstash Redis (TLS rediss://)")]
        PrivateS3[("Neon Private S3 Object Storage")]
    end

    subgraph Workers["Asynchronous Background Workers (BullMQ)"]
        BullMQRouter["BullMQ Task Router"]
        VisionWorker["Multimodal OCR Worker (Gemini Vision API)"]
        AudioWorker["Audio Transcriber (Deepgram Nova-3 STT)"]
        SynthesisWorker["AI Synthesis Worker (Gemini LLM)"]
        PDFWorker["PDF Renderer (Puppeteer Chromium)"]
    end

    Client --> Gateway
    Gateway --> JWKSMid --> RBACMid --> AuthzMid --> DomainModules
    DomainModules --> Postgres
    DomainModules --> RedisQueue
    DomainModules --> PrivateS3
    RedisQueue --> BullMQRouter
    BullMQRouter --> VisionWorker & AudioWorker & SynthesisWorker & PDFWorker
    VisionWorker & AudioWorker & SynthesisWorker & PDFWorker --> Postgres
    VisionWorker & AudioWorker & SynthesisWorker & PDFWorker --> PrivateS3
```

---

## 💻 Key Portals & Capabilities

### 1. Citizen Portal
- **Interactive Dispute Launchpad**: Immediate 1-click access to common dispute categories (Consumer Protection & E-Commerce, Tenancy & Deposit Recovery, Labour & Wages, Debt Recovery) and one-click sample case generation for testing.
- **Guided AI Intake**: Structured chat assistant that asks targeted questions based on the dispute domain, extracting incident dates, claim amounts, and involved parties.
- **Secure Evidence Vault**: Drag-and-drop file uploader computing client-side SHA-256 hashes before uploading to private S3 buckets. Direct S3 uploads fall back seamlessly to server-relay streaming when browser preflights are blocked.
- **Fact Timeline & Verification**: Chronological timeline generated by AI where citizens review, dispute, or verify every factual assertion before formal submission.
- **1-Click Court Packet Generation**: Produces a standardized, beautifully rendered PDF legal dossier complete with QR codes, table of contents, evidentiary appendices, and SHA-256 digital stamps.
- **Advocate Search & Access Control**: Browse verified advocates, request consultations (Online Video or In-Person), and grant time-limited, revocable viewing scopes.

### 2. Advocate Workspace
- **Bar Council Verification**: Structured onboarding flow capturing Bar Council Enrollment Number, State Bar Council, year of enrollment, practice areas, and identity documentation.
- **Public Directory Listing**: Verified advocates receive a public listing displaying practice jurisdictions, experience, bio, and hourly rates.
- **Consultation Inbox**: Accept, reschedule, or decline citizen consultation requests with integrated Google Meet / video conference routing.
- **Scoped Shared Dossiers**: Access only authorized citizen cases. Permissions (`canViewSummary`, `canViewEvidence`, `canDownload`) are strictly enforced at the database level.
- **Dual-Channel Collaboration**:
  - *Public / Client-Shared Advice*: Comments and actionable legal steps visible directly to the citizen.
  - *Internal Work-Product Notes*: Privileged notes accessible exclusively to the advocate.

### 3. Platform Administration
- **Executive Governance Console**: Real-time KPI dashboard tracking registered citizens, verified advocates, dispute volume, and compiled court packets.
- **Advocate Accreditation Queue**: Review pending advocate credentials, inspect uploaded bar license certificates, and approve or reject submissions.
- **BullMQ Live Queue Health**: Monitor job states (`waiting`, `active`, `completed`, `failed`, `delayed`) across document processing, audio transcription, and PDF generation queues.
- **User Suspension & Security Enforcement**: Instantly suspend or reactivate platform accounts with immediate token and cache invalidation.
- **Strict Privacy Safeguard**: Administrative users are restricted to case metadata and cannot inspect citizen evidence files or confidential dispute statements.

---

## 🗄️ Database & Relational Model

The platform is backed by a 24-model relational schema in Neon PostgreSQL, enforced by Prisma ORM:

```mermaid
erDiagram
    USER ||--o| LAWYER_PROFILE : "registers as"
    USER ||--o{ CASE : "owns"
    USER ||--o{ STATEMENT : "writes"
    USER ||--o{ INTERVIEW_SESSION : "conducts"
    USER ||--o{ EVIDENCE : "uploads"
    USER ||--o{ CONSULTATION_REQUEST : "requests"
    USER ||--o{ ACCESS_GRANT : "grants access"
    USER ||--o{ CASE_COMMENT : "comments"
    USER ||--o{ ACTION_ITEM : "assigned"
    USER ||--o{ CASE_VERIFICATION : "verifies"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ AUDIT_LOG : "triggers"

    LAWYER_PROFILE ||--o{ LAWYER_VERIFICATION_DOC : "submits"
    LAWYER_PROFILE ||--o{ LAWYER_PRACTICE_AREA : "practices"
    PRACTICE_AREA ||--o{ LAWYER_PRACTICE_AREA : "categorizes"
    LAWYER_PROFILE ||--o{ CONSULTATION_REQUEST : "receives"
    LAWYER_PROFILE ||--o{ ACCESS_GRANT : "held by"
    LAWYER_PROFILE ||--o{ CASE_COMMENT : "attaches notes"

    CASE_CATEGORY ||--o{ CASE : "classifies"
    CASE ||--o{ CASE_PARTY : "involves"
    CASE ||--o{ CASE_STATUS_HISTORY : "tracks"
    CASE ||--o{ STATEMENT : "contains"
    CASE ||--o{ INTERVIEW_SESSION : "records"
    CASE ||--o{ EVIDENCE : "stores"
    CASE ||--o{ TIMELINE_EVENT : "chronicles"
    CASE ||--o{ AI_RUN : "analyzed by"
    CASE ||--o{ CASE_VERIFICATION : "signed off"
    CASE ||--o{ PACKET_GENERATION : "compiles into"
    CASE ||--o{ ACCESS_GRANT : "governs"
    CASE ||--o{ CASE_COMMENT : "annotated with"
    CASE ||--o{ ACTION_ITEM : "tracks tasks"

    INTERVIEW_SESSION ||--o{ INTERVIEW_MESSAGE : "contains"
    TIMELINE_EVENT ||--o{ TIMELINE_SOURCE : "referenced by"
    EVIDENCE ||--o{ TIMELINE_SOURCE : "cites"
    STATEMENT ||--o{ TIMELINE_SOURCE : "cites"
    AI_RUN ||--o{ AI_OUTPUT_SOURCE : "justified by"
```

### Core Schema Models

| Model | Purpose | Key Attributes |
| :--- | :--- | :--- |
| **`User`** | Platform user registry | `id`, `authUserId`, `email`, `role` (`CITIZEN`, `LAWYER`, `ADMIN`), `isActive` |
| **`LawyerProfile`** | Advocate accreditation | `barCouncilNumber`, `stateBarCouncil`, `verificationStatus` (`PENDING`, `APPROVED`, `REJECTED`) |
| **`Case`** | Core legal matter | `caseNumber`, `title`, `status`, `priority`, `ownerId`, `categoryId` |
| **`Evidence`** | Document and media vault | `storageKey`, `sha256`, `mimeType`, `fileType`, `extractedText`, `processingStatus` |
| **`TimelineEvent`** | Fact chronology ledger | `eventDate`, `title`, `description`, `verificationStatus`, `sourceLinks` |
| **`CaseVerification`**| Immutable citizen sign-off | `snapshotVersion`, `verifiedById`, `verifiedAt`, `sha256` |
| **`PacketGeneration`**| Compiled legal dossiers | `version`, `storageKey`, `sha256`, `status`, `snapshotData` |
| **`AccessGrant`** | Scoped authorization | `caseId`, `lawyerProfileId`, `canViewSummary`, `canViewEvidence`, `canDownload`, `expiresAt` |
| **`ConsultationRequest`**| Legal appointment booking| `citizenId`, `lawyerProfileId`, `mode` (`ONLINE`, `IN_PERSON`), `status`, `scheduledAt` |

---

## ⚡ Core Functional Pipelines

### 1. Dynamic AI Intake Interview
- Citizens are greeted by a conversational interview assistant tailored to their case category.
- Messages are processed sequentially, and the assistant suggests follow-up inquiries (e.g., *"Did you receive a written notice?"*, *"What was the transaction reference ID?"*).
- At the conclusion of the intake dialogue, the interview is compiled into persistent, structured `Statement` records attributed directly to the case owner.

### 2. Multimodal Evidence Vault & Processing
- The browser calculates a **SHA-256 hash** of the selected file using the Web Crypto API.
- The client requests a presigned S3 upload URL with a strict 15-minute expiration (`TTL=900`).
- If direct presigned upload fails due to CORS or network restrictions, the client automatically switches to a streaming server-relay endpoint.
- Once uploaded, an event is dispatched to BullMQ:
  - **Images & Scanned PDFs**: Processed by Google Gemini Multimodal Vision API to extract OCR text and compute recognition confidence scores.
  - **Audio Memos & Recordings**: Transcribed with punctuation and formatting via **Deepgram Nova-3 Speech-to-Text**.

### 3. AI Case Synthesis & Source Provenance
- Synthesizes uploaded evidence text, user statements, and party descriptions into:
  1. **Executive Legal Summary**: Factual backdrop, core grievances, and relief sought.
  2. **Chronological Event Timeline**: Parsed dates, event summaries, and explicit source references.
  3. **Identified Legal Claims**: Relevant Indian statutes (Consumer Protection Act 2019, Section 138 NI Act, Contract Act 1872, etc.).
  4. **Preliminary Strength Assessment**: Strengths, procedural hurdles, and missing documentation alerts.
- **Anti-Hallucination Guard**: Every assertion references a verified `evidenceId` or `statementId`. Unreferenced assertions are flagged during validation.

### 4. Citizen Verification & Tamper-Evident Dossier Generation
- AI outputs are strictly drafts until reviewed and verified by the citizen.
- The citizen reviews the chronology, edits discrepancies, and provides a formal digital sign-off.
- A cryptographic snapshot is stored in `CaseVerification`.
- When triggered, Puppeteer compiles an executive court-ready PDF featuring:
  - **Standard Court Cover Sheet**: Case number, jurisdiction, date of incident, party roll.
  - **Verifiable SHA-256 Digest**: Embedded in the footer of every page.
  - **Verification Snapshot Seal**: Proving the citizen verified the contents prior to compilation.
  - **Appendices & Evidence Index**: Structured document exhibits.

### 5. Granular Scoped Access Grants & Dual-Channel Collaboration
- Citizens retain full ownership of their data. Sharing a case requires an explicit `AccessGrant`.
- Grants can be scoped individually:
  - `canViewSummary`: Allows review of the legal summary and timeline only.
  - `canViewEvidence`: Permits access to evidence OCR transcripts and documents.
  - `canDownload`: Permits downloading the compiled PDF Court Dossier.
- All grants feature configurable expiration (`expiresAt`) and can be revoked immediately by the citizen with a single click.

---

## 🔒 Zero-Trust Security & Anti-IDOR Architecture

NyayaPacket AI enforces defense-in-depth across every layer:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Citizen / Advocate / Admin
    participant Gateway as Express Gateway (/api/v1)
    participant AuthGuard as Better Auth / JWKS Guard
    participant DB as Neon PostgreSQL
    participant Evaluator as canAccessCase Evaluator
    participant S3 as Private S3 Storage

    Client->>Gateway: Request with Bearer JWT
    Gateway->>AuthGuard: Verify JWT against remote JWKS
    AuthGuard->>DB: Fetch authoritative User record (Role, isActive)
    
    alt User is Suspended
        DB-->>Gateway: User Account Suspended
        Gateway-->>Client: 403 Forbidden (ACCOUNT_SUSPENDED)
    end

    Gateway->>Evaluator: canAccessCase(userId, caseId, requiredScope)

    alt Citizen is Case Owner
        Evaluator-->>Gateway: Granted (OWNER)
    else Advocate has Active AccessGrant
        Evaluator->>DB: Query AccessGrant (active, non-expired, scope enabled)
        alt Grant Valid
            Evaluator-->>Gateway: Granted (SCOPED_ADVOCATE)
        else Grant Missing or Expired
            Evaluator-->>Gateway: 403 Forbidden (GRANT_REQUIRED)
        end
    else Admin accessing Case Metadata
        Evaluator-->>Gateway: Granted (ADMIN_METADATA_ONLY)
    else Admin accessing Evidence Binaries / Statements
        Evaluator-->>Gateway: 403 Forbidden (ADMIN_PRIVACY_GUARD)
    else Unrelated Third-Party
        Evaluator-->>Gateway: 404 / 403 Anti-IDOR Blocked
    end

    Gateway->>S3: Generate time-limited presigned URL (15m TTL)
    S3-->>Gateway: Presigned URL with HMAC signature
    Gateway-->>Client: 200 OK with Scoped Resource Payload
```

### Core Security Tenets

1. **PostgreSQL as Single Source of Truth**: Better Auth verifies identity; PostgreSQL strictly governs roles, account statuses, and lawyer verification.
2. **Zero Insecure Direct Object References (IDOR)**: Centralized resource authorization (`canAccessCase`) checks case ownership and active, non-revoked `AccessGrant` records on every request.
3. **Private Evidence Storage**: No public S3 buckets. Presigned upload and download URLs enforce 15-minute TTLs and cryptographic SHA-256 integrity checks.
4. **Admin Privacy Safeguards**: Platform administrators are restricted to case metadata by default; direct access to citizen evidence is blocked.
5. **Cryptographic Sealing**: Dossiers and evidence files are stamped with SHA-256 digests computed at ingestion.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Runtime & Language** | [Bun](https://bun.sh/) (v1.2+ / v1.3+), Node.js (v24), TypeScript (Strict Mode) |
| **Backend API** | Express.js, Prisma ORM, Jose (JWKS verification), Zod validation |
| **Database** | Neon PostgreSQL (Serverless Pooled Database, SSL enforced) |
| **Authentication** | Better Auth / Neon Auth (JWKS token signature verification) |
| **Background Queues** | BullMQ, Upstash Redis (TLS `rediss://`) |
| **Object Storage** | Neon Private S3 Storage (AWS SDK v3 `@aws-sdk/client-s3`, presigned URLs) |
| **AI & Multimodal OCR** | Google Gemini Multimodal Vision API (`gemini-3.5-flash-lite`, `gemini-1.5-flash`) |
| **Audio Transcription** | Deepgram Nova-3 Speech-to-Text API |
| **PDF Dossier Compiler** | Puppeteer (Headless Chromium) |
| **Frontend Framework** | React 19, Vite, TypeScript, React Router v7 |
| **UI & Styling** | Tailwind CSS (v4), shadcn/ui design tokens, Lucide React, Glassmorphism |
| **Client State** | TanStack React Query v5, Axios |

---

## 🚀 Local Setup & Development Guide

### Prerequisites
- [Bun](https://bun.sh/) (v1.2 or higher)
- [Node.js](https://nodejs.org/) (v20 or higher)
- Access to a PostgreSQL instance (Neon recommended)
- Access to an Upstash Redis instance (with TLS enabled)
- Google Gemini API Key
- Deepgram API Key

### Environment Variables

#### Server Configuration (`server/.env`)
```bash
# Neon Better Auth
AUTH_URL="https://your-neon-auth-endpoint.tech/neondb/auth"
JWKS_URL="https://your-neon-auth-endpoint.tech/neondb/auth/.well-known/jwks.json"

# Neon PostgreSQL
DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"

# Upstash Redis (BullMQ Queues)
REDIS_URL="rediss://default:token@your-upstash-host.upstash.io:6379"

# S3 Compatible Storage (Neon Bucket)
AWS_ENDPOINT_URL_S3="https://your-storage-endpoint.tech"
AWS_ACCESS_KEY_ID="your_access_key"
AWS_SECRET_ACCESS_KEY="your_secret_key"
AWS_REGION="ap-southeast-1"
S3_BUCKET_NAME="nyayapacket-ai"

# AI & Transcription Services
GEMINI_API_KEY="your_gemini_api_key"
GEMINI_MODEL="gemini-3.5-flash-lite"
DEEPGRAM_API_KEY="your_deepgram_api_key"

# Server Port
PORT=5000
NODE_ENV="development"
```

#### Client Configuration (`client/.env`)
```bash
VITE_API_URL="/api/v1"
```

### Database Setup & Migrations

```bash
cd server

# Install backend dependencies
bun install

# Run database migrations
bunx prisma migrate dev

# Seed standard dispute categories and initial data
bun run src/scripts/seed.ts
```

### Running the Services

Start each service in a separate terminal:

```bash
# 1. Start the Backend API Server (Port 5000)
cd server
bun run dev

# 2. Start the Asynchronous BullMQ Background Worker
cd server
bun run src/worker.ts

# 3. Start the Frontend Client (Port 3000)
cd client
bun install
bun run dev
```

Visit `http://localhost:3000` to access the application.

---

## 🧪 Testing & Quality Assurance

NyayaPacket AI maintains a comprehensive automated testing suite:

```bash
# Run all backend integration and security tests
cd server
bun test

# Run targeted security and authentication suites
bun test src/__tests__/auth.test.ts src/__tests__/adminNotifications.test.ts

# Run frontend typecheck and production build verification
cd client
bun run build
```

### Security Test Matrix (SEC-01 to SEC-13)

- **SEC-01**: Reject unauthenticated requests with 401 Unauthorized.
- **SEC-02**: Enforce PostgreSQL role verification and block role escalation.
- **SEC-03**: Enforce immediate API block upon account suspension (403 Forbidden).
- **SEC-04**: Anti-IDOR protection preventing unauthorized access to other citizens' cases.
- **SEC-05**: Scoped access verification for advocates via active `AccessGrant` records.
- **SEC-06**: Immediate rejection of revoked or expired access grants.
- **SEC-07**: Restrict administrative users from accessing citizen evidence files.
- **SEC-08**: Enforce 15-minute TTL on S3 presigned URLs.
- **SEC-09**: Validate SHA-256 integrity on all uploaded evidence files.
- **SEC-10**: Cryptographic sealing of compiled PDF case dossiers.

---

## 📖 API Reference Overview

The backend exposes a structured RESTful API under `/api/v1`:

### Authentication & Users
- `POST /api/v1/auth/provision` — Auto-provision or hydrate authenticated user in PostgreSQL.
- `GET /api/v1/users/me` — Retrieve current user profile and role details.
- `PATCH /api/v1/users/me` — Update personal profile details (prevents self-role escalation).

### Case Management
- `GET /api/v1/cases` — List cases owned by the citizen or shared with the advocate.
- `POST /api/v1/cases` — Create a new dispute matter.
- `GET /api/v1/cases/:id` — Retrieve full case dossier details.
- `PATCH /api/v1/cases/:id` — Update case metadata or status.

### AI Intake & Statements
- `POST /api/v1/cases/:id/interview/start` — Initialize an AI legal interview session.
- `POST /api/v1/cases/:id/interview/message` — Send a message and receive guidance.
- `POST /api/v1/cases/:id/interview/compile` — Compile interview into case statements.

### Evidence Vault
- `POST /api/v1/cases/:id/evidence/upload-url` — Generate a presigned S3 PUT URL (15m TTL).
- `POST /api/v1/cases/:id/evidence/upload-relay` — Server-relay upload streaming fallback.
- `POST /api/v1/cases/:id/evidence/complete` — Record evidence and queue OCR/transcription.
- `GET /api/v1/cases/:id/evidence` — List all evidence items with extraction statuses.
- `GET /api/v1/cases/:id/evidence/:evidenceId/download` — Obtain presigned S3 download URL.

### AI Synthesis & Verification
- `POST /api/v1/cases/:id/analysis/run` — Trigger AI case chronology and claim synthesis.
- `GET /api/v1/cases/:id/timeline` — Retrieve synthesized fact timeline.
- `POST /api/v1/cases/:id/verification` — Submit citizen sign-off snapshot.

### PDF Dossier Generation
- `POST /api/v1/cases/:id/packets/generate` — Compile tamper-evident PDF Court Dossier.
- `GET /api/v1/cases/:id/packets` — List generated packet versions.
- `GET /api/v1/cases/:id/packets/:version/download` — Obtain presigned packet download URL.

### Advocate Directory & Access Grants
- `GET /api/v1/lawyers` — Browse verified advocate directory.
- `POST /api/v1/consultations` — Request a legal consultation.
- `PATCH /api/v1/consultations/:id` — Accept, reschedule, or decline consultation.
- `POST /api/v1/cases/:id/grants` — Issue scoped, time-bound access grant to an advocate.
- `DELETE /api/v1/cases/:id/grants/:grantId` — Immediately revoke an advocate's access grant.

### Platform Administration
- `GET /api/v1/admin/dashboard/metrics` — Retrieve system-wide KPI metrics.
- `GET /api/v1/admin/users` — Search and manage platform users.
- `PATCH /api/v1/admin/users/:id/status` — Suspend or reactivate user accounts.
- `GET /api/v1/admin/lawyers/pending` — List pending advocate accreditation applications.
- `POST /api/v1/admin/lawyers/:id/verify` — Approve or reject advocate accreditation.
- `GET /api/v1/admin/queues/status` — Monitor live BullMQ background queue counts.
- `GET /api/v1/admin/audit-logs` — Retrieve immutable platform security audit events.

---

## 📚 Documentation Index

Detailed architectural specifications and engineering standards are available in the [`docs/`](docs/) directory:

- [**Project Understanding**](docs/PROJECT_UNDERSTANDING.md) — Platform vision, ethical boundaries, role profiles, and dispute journeys.
- [**Implementation Decisions**](docs/IMPLEMENTATION_DECISIONS.md) — Technical choices regarding Better Auth, Gemini Vision, Deepgram, Upstash Redis, and Neon S3.
- [**Security Design**](docs/SECURITY_DESIGN.md) — Zero-trust authorization matrix, Anti-IDOR evaluation, and cryptographic integrity controls.
- [**Testing Strategy**](docs/TESTING_STRATEGY.md) — Automated testing architecture and release-blocking security regression suites.
- [**Feature Checklist**](docs/FEATURE_CHECKLIST.md) — Technical specifications and requirements breakdown.

---

## ⚖️ License & Disclaimers

NyayaPacket AI is provided for legal empowerment and workflow assistance. It organizes factual evidence, transcribes documentation, and prepares structured dispute dossiers for legal review. It does not provide legal advice, establish attorney-client privilege independently of licensed advocates, or replace qualified legal counsel.
