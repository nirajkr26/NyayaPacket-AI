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
- [x] Implement AI Provider abstraction layer (`ILLMProvider`, `IVisionProvider`).
- [x] Implement Gemini provider implementation with structured JSON schema output (Zod).
- [x] Implement Case Summarization worker job (`AiRunType.CASE_SUMMARY`).
- [x] Implement Chronological Timeline extraction worker job (`AiRunType.TIMELINE_EXTRACTION`).
- [x] Implement Source Provenance Validator: verify all extracted facts cite real `evidenceId` or `statementId`.
- [x] Implement Missing Information & Inconsistency detection.
- [x] Implement Case Timeline endpoints (`GET /api/v1/cases/:id/timeline`).
- [x] Implement Citizen Timeline Event Verification & Correction (`PATCH /api/v1/cases/:id/timeline/:eventId`).
- [x] Implement Manual Timeline Event addition (`POST /api/v1/cases/:id/timeline`).
- [x] Implement Case Verification Snapshot creation (`POST /api/v1/cases/:id/verify`).
- [x] Validation tests ensuring zero hallucinated source references.

---

## Phase 8: PDF Case Packet Generation
- [x] Design HTML/CSS legal case packet template with official LegalTech branding.
- [x] Integrate Puppeteer for server-side headless PDF rendering.
- [x] Compile packet sections:
  - Header, Unique Reference Number, and Legal AI Disclaimer.
  - Citizen & Opposing Party Details.
  - Verified Case Summary & Incident Overview.
  - Chronological Timeline with explicit Source Reference citations.
  - Evidence Index with SHA-256 Checksums.
  - Identified Missing Information & Questions for the Advocate.
  - Citizen Verification Record & Timestamp.
- [x] Implement BullMQ `pdf-generation-queue` and worker.
- [x] Upload generated PDF to private S3 and record `PacketGeneration` record.
- [x] Implement Packet listing and secure download endpoints (`GET /api/v1/cases/:id/packets`).
- [x] Tests verifying packet generation, version incrementing, and download authorization.

---

## Phase 9: Lawyer Verification & Public Directory
- [x] Implement Lawyer Onboarding Profile completion (`POST /api/v1/lawyers/profile`).
- [x] Implement Verification Document upload (Enrollment Certificate, Bar ID).
- [x] Implement Admin Lawyer Verification Queue (`GET /api/v1/admin/lawyers/pending`).
- [x] Implement Admin Document Review & Decision endpoint (`PATCH /api/v1/admin/lawyers/:id/verification`).
- [x] Implement Public Lawyer Directory with search, location, practice area, and language filters (`GET /api/v1/lawyers`).
- [x] Ensure only `APPROVED` and `isListed: true` lawyers appear in directory.
- [x] Implement Public Lawyer Profile view (`GET /api/v1/lawyers/:id`).
- [x] Implement Lawyer Availability schedule management (`PUT /api/v1/lawyers/me/availability`).
- [x] Integration tests verifying unapproved lawyers are strictly excluded from directory.

---

## Phase 10: Consultations & Case Sharing
- [x] Implement Consultation Request initiation by Citizen (`POST /api/v1/consultations`).
- [x] Implement Lawyer Consultation inbox (`GET /api/v1/lawyers/me/consultations`).
- [x] Implement Lawyer Response (Accept, Decline, Reschedule) (`PATCH /api/v1/consultations/:id/respond`).
- [x] Implement Consultation Completion & Citizen Review (`POST /api/v1/consultations/:id/review`).
- [x] Implement Scoped Case Access Grant creation by Citizen (`POST /api/v1/cases/:id/grants`).
- [x] Implement Case Access Grant Revocation (`DELETE /api/v1/cases/:id/grants/:grantId`).
- [x] Implement Active Grants listing (`GET /api/v1/cases/:id/grants`).
- [x] Implement Lawyer Shared Cases workspace listing (`GET /api/v1/lawyers/me/shared-cases`).
- [x] Tests verifying immediate revocation blocks subsequent lawyer requests.

---

## Phase 11: Lawyer Collaboration Workspace
- [x] Implement Lawyer Shared Case detail workspace view (`GET /api/v1/lawyers/me/shared-cases/:id`).
- [x] Implement Case Comments creation with visibility flag (`POST /api/v1/cases/:id/comments`).
- [x] Enforce visibility rules: Citizen cannot view `PRIVATE_LAWYER_NOTE`.
- [x] Implement Case Comments retrieval (`GET /api/v1/cases/:id/comments`).
- [x] Implement Information Request flow (`POST /api/v1/cases/:id/information-requests`).
- [x] Implement Action Plan & Action Items management (`POST /api/v1/cases/:id/action-items`).
- [x] Implement Action Item status update & completion tracking (`PATCH /api/v1/cases/:id/action-items/:itemId`).
- [x] Tests verifying note visibility privacy and action item permissions.

---

## Phase 12: Notifications & Admin Portal Backend
- [x] Implement In-app Notification engine and listing API (`GET /api/v1/notifications`).
- [x] Implement Notification read-status update (`PATCH /api/v1/notifications/:id/read`).
- [x] Implement Notification preferences management (`GET`, `PUT /api/v1/notifications/preferences`).
- [x] Implement Admin Dashboard Metrics endpoint (`GET /api/v1/admin/dashboard/metrics`).
- [x] Implement Admin User Management (list, suspend, reactivate) (`GET`, `PATCH /api/v1/admin/users`).
- [x] Implement Admin Case Metadata Monitoring (`GET /api/v1/admin/cases`).
- [x] Implement Admin BullMQ Job Queue monitoring (`GET /api/v1/admin/jobs/status`).
- [x] Implement Admin System Audit Logs viewer (`GET /api/v1/admin/audit-logs`).
- [x] Tests verifying admin metadata-only visibility and user suspension enforcement.

---

## Phase 13: Frontend Foundation & Public Website
- [x] Initialize frontend dependencies: `lucide-react`, `react-router-dom`, `@tanstack/react-query`, `clsx`, `tailwind-merge`, `class-variance-authority`, `zod`, `axios`.
- [x] Configure Tailwind CSS (v4) with LegalTech design tokens (court navy, gold/saffron, legal emerald, alert crimson).
- [x] Build core UI components (`client/src/components/ui/`): Button, Card, Dialog/Modal, Input, Textarea, Badge, Table, Tabs, Skeleton.
- [x] Implement `ThemeProvider` with dark/light modes, system preference detection, and `localStorage` persistence.
- [x] Implement centralized Axios API Client (`apiClient.ts`) with automatic Bearer token injection, request ID header, and 401 interceptor.
- [x] Configure Auth Context & instant role switching (`AuthContext.tsx`).
- [x] Build role-based layout boundaries (`PublicLayout`, `Navbar`, `Footer`).
- [x] Build route guards (`ProtectedRoute`, `RoleGate`) and error pages (`UnauthorizedPage`, `NotFoundPage`).
- [x] Build Public Landing Page with hero section, 4-step workflow explainer, category showcase, and statutory legal aid disclaimer.
- [x] Build Public Lawyer Directory (`/lawyers`) with live search, filters for city, state, practice area, and consultation mode.
- [x] Build Authentication Pages (Login, Register with role toggle) with 1-click instant demo role access.

---

## Phase 14: Citizen Portal Frontend
- [x] Build Citizen Dashboard with case overview cards, status steppers, pending action alerts, and quick intake buttons.
- [x] Build Case Detail overview page with tabbed navigation (Overview, Parties, Evidence, Timeline, Packet, Consultations).
- [x] Build Multi-step Case Creation Wizard:
  - [x] Step 1: Dispute category visual picker (Consumer, Tenancy, Employment, Loan, Family, Property, Cyber).
  - [x] Step 2: Dispute details form (title, incident date picker, city, state, description).
  - [x] Step 3: Involved parties dynamic form (opposing party, landlord/employer, contact details).
  - [x] Step 4: Review and submit with instant transition to intake interview.
- [x] Build AI Intake Interview Screen:
  - [x] Conversational chat UI with citizen and AI message bubbles.
  - [x] Category-specific question prompt flows and dynamic suggestion chips.
  - [x] Speech-to-text voice input trigger.
  - [x] "Conclude & Compile Statement" button with confirmation dialog.
- [x] Build Evidence Manager & Document Dropzone:
  - [x] Drag-and-drop file upload with client-side SHA-256 calculation.
  - [x] Direct-to-S3 presigned upload progress bar.
  - [x] Evidence item cards with processing status badges (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`).
  - [x] Extracted OCR text / Audio transcript preview drawer.
  - [x] Secure presigned download trigger.
- [x] Build Interactive Chronological Timeline:
  - [x] Chronological event cards with dates, titles, and descriptions.
  - [x] Clickable source citation chips linking directly to evidence and statement IDs.
  - [x] Inline status toggles: `CITIZEN_CONFIRMED`, `CITIZEN_CORRECTED`, `DISPUTED`.
  - [x] Add manual timeline event modal with provenance source selector.
  - [x] Formal Verification certification modal creating immutable `CaseVerification` snapshot.
- [x] Build PDF Case Packet Generation Screen:
  - [x] Trigger async/sync packet compilation.
  - [x] Generation progress indicator with live polling.
  - [x] Version history selector (`v1`, `v2`, ...).
  - [x] Cryptographic SHA-256 tamper hash card with one-click copy.
  - [x] Presigned PDF download button.
- [x] Build Lawyer Discovery & Consultation Manager:
  - [x] Verified advocate discovery drawer.
  - [x] Book consultation modal (mode, preferred date/time, intake message).
  - [x] Consultation status tracker (Pending, Accepted with meeting link, Completed).
- [x] Build Scoped Case Access Grant Manager:
  - [x] Issue access grant modal with granular scopes (`canViewSummary`, `canViewEvidence`, `canDownload`, expiration days).
  - [x] Active grants table.
  - [x] One-click immediate revocation button with instant UI updates.
- [x] Build Collaboration Workspace:
  - [x] Shared lawyer-citizen comments thread.
  - [x] Information request replies with document attachment.
  - [x] Shared action plan checklist with interactive completion toggles.

---

## Phase 15: Lawyer Portal Frontend
- [ ] Build Lawyer Onboarding Wizard:
  - [ ] Professional details form (Bar Council Number, State Bar Council, Enrollment Year, Experience, City, State, Bio).
  - [ ] Practice areas selector and language tags.
  - [ ] Bar Council Enrollment Certificate and Bar ID card upload dropzone.
- [ ] Build Lawyer Verification Status Screen:
  - [ ] Status indicators for `PENDING`, `APPROVED`, and `REJECTED`.
  - [ ] Rejection review notes card and certificate re-upload modal.
- [ ] Build Lawyer Dashboard with high-level KPI cards (pending requests, upcoming sessions, active shared cases).
- [ ] Build Weekly Availability Calendar settings:
  - [ ] Day-of-week slots, start and end times.
  - [ ] Timezone selector (`Asia/Kolkata`).
  - [ ] Consultation modes toggles (Online vs. In-Person).
- [ ] Build Consultation Requests Inbox:
  - [ ] Requests list with citizen information and dispute summary.
  - [ ] Accept consultation dialog (meeting link input, scheduled timestamp, prep notes).
  - [ ] Decline consultation dialog with feedback note.
  - [ ] Reschedule consultation dialog proposing alternative time.
- [ ] Build Lawyer Shared Case Workspace:
  - [ ] Tab 1: AI Case Summary & Missing Information (gated by `canViewSummary`).
  - [ ] Tab 2: Verified Timeline & Claims Chronology with source reference inspection.
  - [ ] Tab 3: Authorized Evidence Viewer (gated by `canViewEvidence`; download button conditionally enabled based on `canDownload`).
  - [ ] Tab 4: Dual-Channel Comments: Tabbed editor allowing advocate to post either a `SHARED_WITH_CITIZEN` note or a confidential `PRIVATE_LAWYER_NOTE` (clearly highlighted with yellow/amber background and locked badge).
  - [ ] Tab 5: Action Plan & Task Manager: Create action items, set deadlines, assign to citizen or counsel, track status.
- [ ] Build Lawyer Profile settings with Bar credential display.

---

## Phase 16: Admin Portal Frontend
- [ ] Build Admin Dashboard with platform-wide KPI metrics (users, cases, consultations, packets, queue health).
- [ ] Build Case Distribution chart by dispute category.
- [ ] Build Lawyer Verification Review Queue:
  - [ ] Pending advocates table with bar enrollment details.
  - [ ] Embedded certificate viewer drawer with presigned download/inspection.
  - [ ] Approval decision modal with audit note.
  - [ ] Rejection decision modal with reason selection and custom feedback.
- [ ] Build User Directory & Management:
  - [ ] Paginated user table with role filter (Citizen, Lawyer, Admin) and status filter (Active, Suspended).
  - [ ] User search by name and email.
  - [ ] Account suspension modal with mandatory audit reason.
  - [ ] Account reactivation toggle.
- [ ] Build Case Metadata Monitor (Admin Privacy Guard):
  - [ ] Administrative case metadata table (case number, title, category, status, priority, packet count, creation date).
  - [ ] Strict privacy verification: zero links or buttons to citizen evidence files or raw statements.
- [ ] Build BullMQ Queue Health Monitor:
  - [ ] Real-time job counts for `evidence-processing`, `ai-analysis-queue`, and `pdf-generation-queue` (Waiting, Active, Completed, Failed).
  - [ ] Manual refresh and failed job inspect/retry buttons.
- [ ] Build Security Audit Log Explorer:
  - [ ] Searchable and filterable audit trail by actor, action, and resource type.
  - [ ] Expandable metadata JSON drawer.

---

## Phase 17: End-to-End Integration, Validation & Release
- [ ] Implement Automated Playwright E2E Test Suite (`client/e2e/fullJourney.spec.ts`):
  - [ ] Step 1: Citizen registration & login.
  - [ ] Step 2: Citizen case creation with category & opposing party.
  - [ ] Step 3: Citizen completes multi-turn AI interview.
  - [ ] Step 4: Citizen uploads PDF bill receipt evidence with SHA-256 check.
  - [ ] Step 5: Background worker processes OCR extraction.
  - [ ] Step 6: Citizen triggers AI case synthesis & timeline extraction.
  - [ ] Step 7: Citizen reviews chronology, edits an event, and signs off verification snapshot.
  - [ ] Step 8: Citizen compiles PDF Case Packet dossier and verifies SHA-256 hash.
  - [ ] Step 9: Lawyer registers and uploads Bar Council certificate.
  - [ ] Step 10: Admin logs in, inspects certificate in review queue, and approves lawyer.
  - [ ] Step 11: Citizen discovers verified lawyer in directory and requests consultation.
  - [ ] Step 12: Citizen grants scoped access (`canViewSummary: true`, `canViewEvidence: true`, `canDownload: false`).
  - [ ] Step 13: Lawyer logs in, accepts consultation with meeting link.
  - [ ] Step 14: Lawyer opens shared workspace, views summary & evidence, confirms download button is disabled.
  - [ ] Step 15: Lawyer posts private lawyer note and creates action plan item for citizen.
  - [ ] Step 16: Citizen logs in, confirms private lawyer note is invisible, and marks action item complete.
  - [ ] Step 17: Citizen revokes AccessGrant; lawyer reload immediately returns 403 Forbidden.
- [ ] Multi-tenant isolation penetration test (cross-citizen IDOR attempts).
- [ ] Lawyer approval gate penetration test.
- [ ] Revoked grant immediate cutoff test.
- [ ] Admin evidence privacy test.
- [ ] Docker Compose setup for backend, worker, frontend, and local dependencies.
- [ ] GitHub Actions CI workflow (lint, typecheck, bun test, playwright e2e).
- [ ] Production deployment and backup/recovery documentation.
- [ ] Final release audit against all 20 Master Acceptance Criteria.
