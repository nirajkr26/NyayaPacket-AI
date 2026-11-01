# NyayaPacket AI

> **Your Story. Organized. Your Legal Journey, Simplified.**

NyayaPacket AI is a production-grade LegalTech and citizen legal aid platform engineered for the Indian legal ecosystem. It transforms unstructured personal narratives, receipts, WhatsApp screenshots, rental agreements, audio notes, and PDFs into structured, source-linked, citizen-verified, and lawyer-ready legal case packets.

---

## 🏛️ System Architecture

NyayaPacket AI is built as a **Modular Monolith** with a dedicated background worker process:

```mermaid
flowchart TB
    subgraph Client["Frontend (React 19 + TypeScript + Vite + Tailwind v4)"]
        CP["Citizen Portal"]
        LP["Lawyer Portal"]
        AP["Admin Portal"]
        BetterAuthClient["Better Auth Client"]
    end

    subgraph API["Backend API (Bun + Express.js + TypeScript)"]
        Gateway["REST API Router (/api/v1)"]
        AuthMid["JWKS Token Verifier (jose)"]
        RBACMid["RBAC & Status Guards"]
        AuthzMid["Resource Evaluator (canAccessCase)"]
        
        subgraph Modules["Domain Modules"]
            CaseM["Cases & Parties"]
            InterviewM["AI Interview & Statements"]
            EvidenceM["Evidence & Signed URLs"]
            AnalysisM["AI Case Synthesis"]
            PacketM["Puppeteer PDF Generator"]
            ConsultM["Consultations & Scoped Grants"]
            LawyerM["Lawyer Verification & Directory"]
            AdminM["Admin Monitoring & Auditing"]
        end
    end

    subgraph StorageQueues["Infrastructure & Persistence"]
        PG[("Neon PostgreSQL")]
        RedisQueue[("Upstash Redis (TLS rediss://)")]
        PrivateS3[("Neon Private S3 Storage")]
    end

    subgraph Workers["Asynchronous Workers (BullMQ)"]
        BullMQ["BullMQ Job Processor"]
        OCRWorker["Vision OCR (Gemini API)"]
        AudioWorker["Audio Transcriber (Deepgram Nova-2)"]
        AIWorker["AI Synthesis (Gemini LLM)"]
        PDFWorker["PDF Renderer (Puppeteer)"]
    end

    Client --> Gateway
    Gateway --> AuthMid --> RBACMid --> AuthzMid --> Modules
    Modules --> PG
    Modules --> RedisQueue
    Modules --> PrivateS3
    RedisQueue --> BullMQ
    BullMQ --> OCRWorker & AudioWorker & AIWorker & PDFWorker
    BullMQ --> PG
    BullMQ --> PrivateS3
```

---

## 🗄️ Database Entity-Relationship Diagram (ERD)

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
    USER ||--o{ ACTION_ITEM : "creates / assigned"
    USER ||--o{ CASE_VERIFICATION : "verifies"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ AUDIT_LOG : "triggers"

    LAWYER_PROFILE ||--o{ LAWYER_VERIFICATION_DOC : "submits"
    LAWYER_PROFILE ||--o{ LAWYER_PRACTICE_AREA : "practices"
    PRACTICE_AREA ||--o{ LAWYER_PRACTICE_AREA : "categorizes"
    LAWYER_PROFILE ||--o{ LAWYER_AVAILABILITY : "configures"
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
    CASE ||--o{ CONSULTATION_REQUEST : "discussed in"
    CASE ||--o{ ACCESS_GRANT : "governs"
    CASE ||--o{ CASE_COMMENT : "annotated with"
    CASE ||--o{ ACTION_ITEM : "tracks tasks"

    INTERVIEW_SESSION ||--o{ INTERVIEW_MESSAGE : "contains"
    TIMELINE_EVENT ||--o{ TIMELINE_SOURCE : "referenced by"
    EVIDENCE ||--o{ TIMELINE_SOURCE : "cites"
    STATEMENT ||--o{ TIMELINE_SOURCE : "cites"

    AI_RUN ||--o{ AI_OUTPUT_SOURCE : "justified by"
    EVIDENCE ||--o{ AI_OUTPUT_SOURCE : "sources"
    STATEMENT ||--o{ AI_OUTPUT_SOURCE : "sources"

    USER {
        string id PK
        string authUserId UK
        string email UK
        string phone UK
        string fullName
        string role
        boolean isActive
    }

    LAWYER_PROFILE {
        string id PK
        string userId FK
        string barCouncilNumber UK
        string stateBarCouncil
        int enrollmentYear
        string verificationStatus
        boolean isListed
        boolean isAvailable
    }

    CASE {
        string id PK
        string caseNumber UK
        string title
        string ownerId FK
        string categoryId FK
        string status
        string priority
        datetime incidentDate
    }

    EVIDENCE {
        string id PK
        string caseId FK
        string uploadedById FK
        string storageKey UK
        string fileType
        string sha256
        string processingStatus
        string extractedText
    }

    STATEMENT {
        string id PK
        string caseId FK
        string authorId FK
        string type
        string content
    }

    TIMELINE_EVENT {
        string id PK
        string caseId FK
        datetime eventDate
        string title
        string verificationStatus
    }

    CASE_VERIFICATION {
        string id PK
        string caseId FK
        string verifiedById FK
        int snapshotVersion
        datetime verifiedAt
    }

    PACKET_GENERATION {
        string id PK
        string caseId FK
        int version
        string storageKey UK
        string sha256
        json snapshotData
    }

    ACCESS_GRANT {
        string id PK
        string caseId FK
        string lawyerProfileId FK
        boolean canViewSummary
        boolean canViewEvidence
        boolean canDownload
        datetime expiresAt
        datetime revokedAt
    }

    CONSULTATION_REQUEST {
        string id PK
        string citizenId FK
        string lawyerProfileId FK
        string caseId FK
        string status
        string mode
        datetime scheduledAt
    }
```

---

## 🔄 Case Lifecycle & Pipeline State Machine

Every case progresses through a deterministic, auditable lifecycle driven by citizen actions, background AI pipelines, and lawyer collaboration:

```mermaid
stateDiagram-v2
    [*] --> NEW_CASE: Citizen creates case

    NEW_CASE --> INTERVIEW_IN_PROGRESS: Start dynamic AI intake interview
    INTERVIEW_IN_PROGRESS --> INTERVIEW_IN_PROGRESS: Multi-turn Q&A & Voice input
    INTERVIEW_IN_PROGRESS --> EVIDENCE_COLLECTION: Interview compiled to Statements

    EVIDENCE_COLLECTION --> EVIDENCE_COLLECTION: Presigned S3 upload & BullMQ OCR/Transcription
    EVIDENCE_COLLECTION --> AI_DRAFT_GENERATED: Trigger AI Case Synthesis (Gemini LLM)

    AI_DRAFT_GENERATED --> CITIZEN_VERIFICATION: Citizen reviews chronology & claims
    CITIZEN_VERIFICATION --> CITIZEN_VERIFICATION: Citizen inline edits / disputes facts
    CITIZEN_VERIFICATION --> READY_FOR_LAWYER: Citizen signs off verification snapshot

    READY_FOR_LAWYER --> READY_FOR_LAWYER: Puppeteer compiles tamper-evident PDF Packet (SHA-256)
    READY_FOR_LAWYER --> ACTION_PLAN_ACTIVE: Consultation accepted & Scoped AccessGrant issued

    ACTION_PLAN_ACTIVE --> ACTION_PLAN_ACTIVE: Lawyer & Citizen track Action Items & Comments
    ACTION_PLAN_ACTIVE --> CLOSED: Resolution completed
    CLOSED --> ARCHIVED: Retained for record keeping
    ARCHIVED --> [*]
```

---

## 🛡️ Zero-Trust Authorization & Anti-IDOR Security Flow

NyayaPacket AI enforces strict multi-tenant data isolation. PostgreSQL is the authoritative source for access control:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Citizen / Lawyer / Admin
    participant Gateway as Express Gateway (/api/v1)
    participant Auth as Better Auth / JWKS Guard
    participant DB as Neon PostgreSQL
    participant Evaluator as canAccessCase Evaluator
    participant Resource as Case / Evidence / Packet

    Client->>Gateway: HTTP Request with Bearer Token
    Gateway->>Auth: Validate JWT Signature against JWKS
    Auth->>DB: Query User record (role, isActive)
    
    alt User is inactive / suspended
        DB-->>Gateway: User is suspended
        Gateway-->>Client: 403 Forbidden (Account Suspended)
    end

    Auth-->>Gateway: Authenticated User (ID, Role)
    Gateway->>Evaluator: canAccessCase(userId, caseId, requiredPermission)
    
    alt User is Case Owner (Citizen)
        Evaluator-->>Gateway: Access Granted (Owner)
    else User is Lawyer
        Evaluator->>DB: Check LawyerProfile (verificationStatus == APPROVED)
        Evaluator->>DB: Check AccessGrant (active, not revoked, not expired)
        alt Valid Grant with required scope
            Evaluator-->>Gateway: Access Granted (Scoped)
        else Missing / Revoked Grant
            Evaluator-->>Gateway: Access Denied (403 Forbidden)
        end
    else User is Admin
        alt Request is for Case Metadata
            Evaluator-->>Gateway: Access Granted (Admin Metadata Only)
        else Request is for Citizen Evidence / Statements
            Evaluator-->>Gateway: Access Denied (403 Admin Privacy Guard)
        end
    else Unrelated User
        Evaluator-->>Gateway: Access Denied (404 / 403 Anti-IDOR)
    end

    Gateway->>Resource: Execute Operation
    Resource-->>Client: 200 OK with Authorized Payload
```

---

## ⚡ Asynchronous Processing & Document Pipeline

Time-intensive document processing and PDF compilation are offloaded to BullMQ worker queues backed by Upstash Redis:

```mermaid
flowchart LR
    subgraph Ingestion["1. Evidence Ingestion"]
        Upload["Client Upload"] -->|SHA-256 Check| Presigned["S3 Presigned URL (15m TTL)"]
        Presigned --> S3Bucket[("Neon Private S3 Bucket")]
        Presigned --> BullMQEv["BullMQ: evidence-processing"]
    end

    subgraph Workers["2. Asynchronous Workers"]
        BullMQEv -->|Image / Document| OCRWorker["Gemini Multimodal OCR"]
        BullMQEv -->|Audio Note| DeepgramWorker["Deepgram Nova-2 STT"]
        OCRWorker & DeepgramWorker -->|Save Extracted Text| NeonDB[("Neon PostgreSQL")]
    end

    subgraph Synthesis["3. Synthesis & Compilation"]
        NeonDB -->|Evidence + Statements| AIService["AI Synthesis Engine"]
        AIService -->|Chronology + Facts| Timeline["Structured Case Timeline"]
        Timeline -->|Citizen Verified| PDFQueue["BullMQ: pdf-generation-queue"]
        PDFQueue --> Puppeteer["Puppeteer Chromium Engine"]
        Puppeteer -->|Render Legal Template| PacketPDF["PDF Case Packet (Tamper Hash)"]
        PacketPDF --> S3Bucket
    end
```

---

## 📚 Project Documentation

Comprehensive documentation is maintained in the [`docs/`](docs/) directory:

| Document | Purpose |
| :--- | :--- |
| [**Project Understanding**](docs/PROJECT_UNDERSTANDING.md) | Vision, ethical boundaries, three application roles, case categories, and user journeys. |
| [**Implementation Decisions**](docs/IMPLEMENTATION_DECISIONS.md) | Technical decisions reconciling legacy specifications with current requirements (Better Auth, Gemini Vision, Deepgram, Upstash Redis, Neon S3). |
| [**Security Design**](docs/SECURITY_DESIGN.md) | Zero-trust threat model, JWKS verification, PostgreSQL-authoritative RBAC, resource authorization (`canAccessCase`), S3 presigned URL lifecycle, and admin privacy guards. |
| [**Testing Strategy**](docs/TESTING_STRATEGY.md) | Test pyramid, SEC-01 through SEC-13 release-blocking security test matrix, unit/integration setups, and CI gates. |
| [**Feature Checklist**](docs/FEATURE_CHECKLIST.md) | Granular implementation tracking across all 18 development phases. |
| [**Implementation Plan**](docs/IMPLEMENTATION_PLAN.md) | Detailed phase-by-phase execution roadmap from Phase 0 to Phase 17. |

---

## 🛠️ Technology Stack

- **Runtime & Toolchain**: [Bun](https://bun.sh/) (v1.2+)
- **Backend**: Express.js, TypeScript (Strict Mode), Prisma ORM
- **Database**: PostgreSQL (Neon PostgreSQL)
- **Authentication**: Better Auth / Neon Auth (`AUTH_URL`, `JWKS_URL`) with PostgreSQL RBAC
- **Queues & Cache**: Upstash Redis (TLS `rediss://`), BullMQ
- **Object Storage**: Neon Private S3 Storage (AWS SDK v3 `@aws-sdk/client-s3`)
- **AI & Vision**: Google Gemini Multimodal Vision API (with OpenAI fallback)
- **Audio Transcription**: Deepgram Nova-2 Speech-to-Text API
- **Document Generation**: Puppeteer (Headless Chromium)
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS (v4), shadcn/ui, Lucide React, TanStack Query v5, React Hook Form, Zod

---

## 🚦 Implementation Status

- [x] **Phase 0: Documentation & Project Discovery** (Completed)
- [x] **Phase 1: Repository & Backend Foundation** (Completed)
- [x] **Phase 2: Database & Better Auth Authentication** (Completed)
- [x] **Phase 3: Authorization & Security Foundation** (Completed)
- [x] **Phase 4: Core Case Management** (Completed)
- [x] **Phase 5: AI Interview & Statements** (Completed)
- [x] **Phase 6: Evidence Management & Document Processing** (Completed)
- [x] **Phase 7: AI Case Analysis & Verification** (Completed)
- [x] **Phase 8: PDF Case Packet Generation** (Completed)
- [x] **Phase 9: Lawyer Verification & Public Directory** (Completed)
- [x] **Phase 10: Consultations & Case Sharing** (Completed)
- [x] **Phase 11: Lawyer Collaboration Workspace** (Completed)
- [x] **Phase 12: Notifications & Admin Backend** (Completed)
- [x] **Phase 13: Frontend Foundation & Public Website** (Completed)
- [ ] **Phase 14: Citizen Portal Frontend**
- [ ] **Phase 15: Lawyer Portal Frontend**
- [ ] **Phase 16: Admin Portal Frontend**
- [ ] **Phase 17: End-to-End Integration, Validation & Release**

---

## 🔒 Security Principles

1. **PostgreSQL as Single Source of Truth**: Better Auth verifies identity; PostgreSQL strictly governs roles, account statuses, and lawyer verification.
2. **Zero Insecure Direct Object References (IDOR)**: Centralized resource authorization (`canAccessCase`) checks case ownership and active, non-revoked `AccessGrant` records on every request.
3. **Private Evidence Storage**: No public S3 buckets. Presigned upload and download URLs enforce 15-minute TTLs and cryptographic SHA-256 integrity checks.
4. **Admin Privacy Safeguards**: Platform administrators are restricted to case metadata by default; direct access to citizen evidence is blocked.
