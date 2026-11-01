# NyayaPacket AI — Comprehensive Feature & Implementation Checklist

This checklist tracks the implementation status of all platform capabilities across all 18 phases (Phase 0 through Phase 17).

Status Legend:
- `[ ]` Not Started
- `[-]` In Progress
- `[x]` Completed
- `[!]` Blocked / Requires Resolution

---

## Phase 0: Project Discovery & Architecture Documentation
- [x] Read and cross-analyze all 5 specification documents (`db.md`, `api.md`, `ui.md`, `system_architecture.md`, `nyayapacket.md`).
- [x] Inspect existing workspace, clean tree, dependencies, and environment keys.
- [x] Identify and resolve architectural discrepancies (Clerk vs. Better Auth, Tesseract vs. Gemini Vision, local Whisper vs. Deepgram).
- [x] Produce `docs/PROJECT_UNDERSTANDING.md`.
- [x] Produce `docs/IMPLEMENTATION_DECISIONS.md`.
- [x] Produce `docs/SECURITY_DESIGN.md`.
- [x] Produce `docs/TESTING_STRATEGY.md`.
- [x] Produce `docs/FEATURE_CHECKLIST.md`.
- [x] Produce `docs/IMPLEMENTATION_PLAN.md`.

---

## Phase 1: Repository & Backend Foundation
- [x] Initialize modular Bun + TypeScript backend structure in `server/`.
- [x] Configure environment schema validation with Zod (`server/src/config/env.ts`).
- [x] Setup structured logger (Pino) with PII sanitization.
- [x] Configure Express application with security middleware (Helmet, CORS, Rate-Limiting).
- [x] Implement global request ID middleware (`x-request-id`).
- [x] Implement centralized error handling middleware and standard API response envelope.
- [x] Configure Prisma client and verify Neon PostgreSQL connectivity.
- [x] Configure Upstash Redis client with TLS (`rediss://`) and health verification.
- [x] Implement health check (`/health`) and readiness check (`/ready`) endpoints.
- [x] Implement graceful shutdown hooks (SIGTERM, SIGINT).
- [x] Pass baseline TypeScript and health endpoint validation tests.

---

## Phase 2: Database & Better Auth (Neon Auth) Authentication
- [x] Author Prisma schema (`prisma/schema.prisma`) with all 24 core models and enums.
- [x] Add `authUserId` unique constraint to `User` model.
- [x] Configure relational indexes, foreign key cascades, and unique constraints.
- [x] Execute database migrations against Neon PostgreSQL.
- [x] Create database seed script (`prisma/seed.ts`) with initial case categories and practice areas.
- [x] Implement Neon Auth JWKS token verification service using `jose`.
- [x] Implement `authenticate` middleware to verify Bearer JWT and bind PostgreSQL `req.user`.
- [x] Implement synchronous idempotent user provisioning on first authenticated request.
- [x] Implement Citizen registration & profile sync flow.
- [x] Implement Lawyer registration & `LawyerProfile` initialization flow (defaults to `PENDING`).
- [x] Implement secure internal Admin bootstrap CLI command (`bun run seed:admin`).
- [x] Implement user profile endpoints (`GET /api/v1/auth/me`, `GET /api/v1/users/me`, `PATCH /api/v1/users/me`).
- [x] Enforce account status checks (`ACTIVE`, `SUSPENDED`, `DEACTIVATED`).
- [x] Unit & integration tests for auth token verification and provisioning.

---

## Phase 3: Authorization & Security Foundation
- [x] Implement RBAC middleware: `requireActiveUser`, `allowRoles(...)`, `requireApprovedLawyer`, `requireAdmin`.
- [x] Implement centralized resource authorization service: `canAccessCase(user, caseId, scope)`.
- [x] Implement granular permission scopes (`VIEW_CASE_SUMMARY`, `VIEW_TIMELINE`, `VIEW_EVIDENCE`, `DOWNLOAD_EVIDENCE`, `COMMENT_ON_CASE`, `REQUEST_INFORMATION`, `MANAGE_ACTION_ITEMS`).
- [x] Implement `AccessGrant` evaluation with real-time revocation and expiry checking.
- [x] Implement Admin privacy guard (block evidence download access for admins by default).
- [x] Implement `AuditLog` service capturing actor, action, resource, IP, user-agent, and metadata.
- [x] Security test suite (SEC-01 through SEC-14): IDOR, privilege escalation, unapproved lawyer access, revoked grants, admin evidence blocking.

---

## Phase 4: Core Case Management
- [x] Implement Case Categories listing endpoint (`GET /api/v1/categories`).
- [x] Implement Case Creation endpoint with auto-generated case numbers (`POST /api/v1/cases`).
- [x] Implement Citizen Case Listing with filtering and pagination (`GET /api/v1/cases`).
- [x] Implement Case Details endpoint (`GET /api/v1/cases/:id`).
- [x] Implement Case Update endpoint (`PATCH /api/v1/cases/:id`).
- [x] Implement Case Status History tracking on status transitions (`CaseStatusHistory`).
- [x] Implement Case Parties management (`GET`, `POST`, `PATCH`, `DELETE /api/v1/cases/:id/parties`).
- [x] Implement Case archiving and closing rules.
- [x] Citizen Dashboard summary API (`GET /api/v1/cases/dashboard/stats`).
- [x] Integration tests verifying citizen case ownership and isolation.

---

## Phase 5: AI Interview & Citizen Statements
- [x] Implement Interview Session initialization (`POST /api/v1/cases/:id/interviews`).
- [x] Implement Interview Message exchange (`POST /api/v1/cases/:id/interviews/:sessionId/messages`).
- [x] Implement Category-specific dynamic question prompts (Unpaid wages, Tenancy, Consumer disputes).
- [x] Implement Statement creation and management (`POST /api/v1/cases/:id/statements`).
- [x] Implement Interview state persistence (Save / Resume workflow).
- [x] Implement Interview completion and final statement synthesis (`POST /api/v1/cases/:id/interviews/:sessionId/complete`).
- [x] Integration tests verifying interview session isolation and case association.

---

## Phase 6: Evidence Management & Document Processing
- [x] Configure Neon S3 private object storage client with AWS SDK v3.
- [x] Implement Presigned Upload URL generation with MIME whitelist and size limits (`POST /api/v1/cases/:id/evidence/upload-url`).
- [x] Implement Upload Complete confirmation with SHA-256 verification (`POST /api/v1/cases/:id/evidence/complete`).
- [x] Implement Evidence Listing and Metadata retrieval (`GET /api/v1/cases/:id/evidence`).
- [x] Implement Secure Presigned Download URL generation with permission gating (`GET /api/v1/cases/:id/evidence/:evidenceId/download`).
- [x] Implement BullMQ `evidence-processing-queue` and background worker.
- [x] Implement Multimodal Vision OCR extraction worker using Google Gemini API.
- [x] Implement Speech-to-Text audio transcription worker using Deepgram Nova-2 API.
- [x] Implement Evidence reprocessing endpoint (`POST /api/v1/cases/:id/evidence/:evidenceId/reprocess`).
- [x] End-to-end evidence ingestion and provenance linking tests.

---

## Phase 7: AI Case Analysis & Verification
- [ ] Implement AI Provider abstraction layer (`ILLMProvider`, `IVisionProvider`).
- [ ] Implement Gemini provider implementation with structured JSON schema output (Zod).
- [ ] Implement Case Summarization worker job (`AiRunType.CASE_SUMMARY`).
- [ ] Implement Chronological Timeline extraction worker job (`AiRunType.TIMELINE_EXTRACTION`).
- [ ] Implement Source Provenance Validator: verify all extracted facts cite real `evidenceId` or `statementId`.
- [ ] Implement Missing Information & Inconsistency detection.
- [ ] Implement Case Timeline endpoints (`GET /api/v1/cases/:id/timeline`).
- [ ] Implement Citizen Timeline Event Verification & Correction (`PATCH /api/v1/cases/:id/timeline/:eventId`).
- [ ] Implement Manual Timeline Event addition (`POST /api/v1/cases/:id/timeline`).
- [ ] Implement Case Verification Snapshot creation (`POST /api/v1/cases/:id/verify`).
- [ ] Validation tests ensuring zero hallucinated source references.

---

## Phase 8: PDF Case Packet Generation
- [ ] Design HTML/CSS legal case packet template with official LegalTech branding.
- [ ] Integrate Puppeteer for server-side headless PDF rendering.
- [ ] Compile packet sections:
  - Header, Unique Reference Number, and Legal AI Disclaimer.
  - Citizen & Opposing Party Details.
  - Verified Case Summary & Incident Overview.
  - Chronological Timeline with explicit Source Reference citations.
  - Evidence Index with SHA-256 Checksums.
  - Identified Missing Information & Questions for the Advocate.
  - Citizen Verification Record & Timestamp.
- [ ] Implement BullMQ `pdf-generation-queue` and worker.
- [ ] Upload generated PDF to private S3 and record `PacketGeneration` record.
- [ ] Implement Packet listing and secure download endpoints (`GET /api/v1/cases/:id/packets`).
- [ ] Tests verifying packet generation, version incrementing, and download authorization.

---

## Phase 9: Lawyer Verification & Public Directory
- [ ] Implement Lawyer Onboarding Profile completion (`POST /api/v1/lawyers/profile`).
- [ ] Implement Verification Document upload (Enrollment Certificate, Bar ID).
- [ ] Implement Admin Lawyer Verification Queue (`GET /api/v1/admin/lawyers/pending`).
- [ ] Implement Admin Document Review & Decision endpoint (`PATCH /api/v1/admin/lawyers/:id/verification`).
- [ ] Implement Public Lawyer Directory with search, location, practice area, and language filters (`GET /api/v1/lawyers`).
- [ ] Ensure only `APPROVED` and `isListed: true` lawyers appear in directory.
- [ ] Implement Public Lawyer Profile view (`GET /api/v1/lawyers/:id`).
- [ ] Implement Lawyer Availability schedule management (`PUT /api/v1/lawyers/me/availability`).
- [ ] Integration tests verifying unapproved lawyers are strictly excluded from directory.

---

## Phase 10: Consultations & Case Sharing
- [ ] Implement Consultation Request initiation by Citizen (`POST /api/v1/consultations`).
- [ ] Implement Lawyer Consultation inbox (`GET /api/v1/lawyers/me/consultations`).
- [ ] Implement Lawyer Response (Accept, Decline, Reschedule) (`PATCH /api/v1/consultations/:id/respond`).
- [ ] Implement Consultation Completion & Citizen Review (`POST /api/v1/consultations/:id/review`).
- [ ] Implement Scoped Case Access Grant creation by Citizen (`POST /api/v1/cases/:id/grants`).
- [ ] Implement Case Access Grant Revocation (`DELETE /api/v1/cases/:id/grants/:grantId`).
- [ ] Implement Active Grants listing (`GET /api/v1/cases/:id/grants`).
- [ ] Implement Lawyer Shared Cases workspace listing (`GET /api/v1/lawyers/me/shared-cases`).
- [ ] Tests verifying immediate revocation blocks subsequent lawyer requests.

---

## Phase 11: Lawyer Collaboration Workspace
- [ ] Implement Lawyer Shared Case detail workspace view (`GET /api/v1/lawyers/me/shared-cases/:id`).
- [ ] Implement Case Comments creation with visibility flag (`POST /api/v1/cases/:id/comments`).
- [ ] Enforce visibility rules: Citizen cannot view `PRIVATE_LAWYER_NOTE`.
- [ ] Implement Case Comments retrieval (`GET /api/v1/cases/:id/comments`).
- [ ] Implement Information Request flow (`POST /api/v1/cases/:id/information-requests`).
- [ ] Implement Action Plan & Action Items management (`POST /api/v1/cases/:id/action-items`).
- [ ] Implement Action Item status update & completion tracking (`PATCH /api/v1/cases/:id/action-items/:itemId`).
- [ ] Tests verifying note visibility privacy and action item permissions.

---

## Phase 12: Notifications & Admin Portal Backend
- [ ] Implement In-app Notification engine and listing API (`GET /api/v1/notifications`).
- [ ] Implement Notification read-status update (`PATCH /api/v1/notifications/:id/read`).
- [ ] Implement Notification preferences management (`GET`, `PUT /api/v1/notifications/preferences`).
- [ ] Implement Admin Dashboard Metrics endpoint (`GET /api/v1/admin/dashboard/metrics`).
- [ ] Implement Admin User Management (list, suspend, reactivate) (`GET`, `PATCH /api/v1/admin/users`).
- [ ] Implement Admin Case Metadata Monitoring (`GET /api/v1/admin/cases`).
- [ ] Implement Admin BullMQ Job Queue monitoring (`GET /api/v1/admin/jobs/status`).
- [ ] Implement Admin System Audit Logs viewer (`GET /api/v1/admin/audit-logs`).
- [ ] Tests verifying admin metadata-only visibility and user suspension enforcement.

---

## Phase 13: Frontend Foundation & Public Website
- [ ] Setup Vite + React 19 + TypeScript + Tailwind CSS (v4) in `client/`.
- [ ] Configure shadcn/ui components (Button, Card, Dialog, Form, Input, Select, Badge, Table).
- [ ] Setup Lucide React icons.
- [ ] Setup React Router v7 with role-based layout boundaries.
- [ ] Setup TanStack Query v5 with centralized API client.
- [ ] Configure Better Auth React client (`@better-auth/react`).
- [ ] Implement Theme Provider (Light & Dark modes) with persistent user preference.
- [ ] Build Public Landing Page with hero section, problem overview, and value proposition.
- [ ] Build Public Lawyer Directory with interactive search and filters.
- [ ] Build Authentication Pages (Login, Citizen Register, Lawyer Register).
- [ ] Build Error, 404, and Unauthorized (`NotAllowed`) pages.

---

## Phase 14: Citizen Portal Frontend
- [ ] Build Citizen Dashboard with case overview cards, stats, and action item alerts.
- [ ] Build Multi-step Case Creation Wizard with category selection.
- [ ] Build AI Intake Interview Screen with chat bubbles, suggestion chips, and voice input.
- [ ] Build Evidence Library with drag-and-drop upload, status badges, and preview drawer.
- [ ] Build Interactive Case Chronology / Timeline with source link modals.
- [ ] Build Citizen Verification Screen: inline editing, confirmation buttons, and dispute tags.
- [ ] Build PDF Packet Generation & Versioned Download Screen.
- [ ] Build Lawyer Discovery & Consultation Request Modal.
- [ ] Build Access Grant Manager (grant scopes, view active, revoke access).
- [ ] Build Case Collaboration workspace (lawyer comments, action plan checklist).
- [ ] Build Notification Drawer and Profile Settings.

---

## Phase 15: Lawyer Portal Frontend
- [ ] Build Lawyer Onboarding & Bar Verification Submission Wizard.
- [ ] Build Lawyer Verification Status Screen (`PENDING`, `APPROVED`, `REJECTED`).
- [ ] Build Lawyer Dashboard with pending consultations and active shared cases.
- [ ] Build Consultation Requests Inbox (Accept, Decline, Reschedule dialogs).
- [ ] Build Consultation Availability Calendar settings.
- [ ] Build Lawyer Shared Case Workspace:
  - Scoped Case Summary view.
  - Verified Timeline inspection with source references.
  - Authorized Evidence viewer with download capability.
  - Shared Case Comments & Private Professional Notes editor.
  - Action Plan & Action Item creator.
- [ ] Profile management and Bar credential display.

---

## Phase 16: Admin Portal Frontend
- [ ] Build Admin Dashboard with high-level platform stats and system health indicators.
- [ ] Build Lawyer Verification Review Queue with document inspection modal and decision buttons.
- [ ] Build User Management table with search, role filters, and suspend/reactivate actions.
- [ ] Build Case Metadata Monitor (strictly without evidence content access).
- [ ] Build BullMQ Background Job Queue monitor (queue lengths, failed jobs, retry actions).
- [ ] Build Security Audit Log Explorer with search and filter by actor/resource.
- [ ] Build Platform Category and Practice Area configuration manager.

---

## Phase 17: End-to-End Integration, Validation & Release
- [ ] Comprehensive Playwright E2E test covering full Citizen -> Evidence -> AI -> PDF -> Lawyer -> Action Plan -> Revocation flow.
- [ ] Multi-tenant isolation penetration test (cross-citizen IDOR attempts).
- [ ] Lawyer approval gate penetration test.
- [ ] Revoked grant immediate cutoff test.
- [ ] Admin evidence privacy test.
- [ ] Docker Compose setup for backend, worker, frontend, and local dependencies.
- [ ] GitHub Actions CI workflow (lint, typecheck, test, build).
- [ ] Production deployment and backup/recovery documentation.
- [ ] Final release audit against all 20 Master Acceptance Criteria.
