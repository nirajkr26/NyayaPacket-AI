# NyayaPacket AI — Codebase Technical Audit & Resolution Log

This document tracks all identified architecture, security, functional, performance, and code quality issues across the NyayaPacket AI full-stack application, along with root causes, remediation details, regression test evidence, and Git commit hashes.

---

## 📊 Audit Summary Matrix

| Issue ID | Severity | Category | Description | Status | Commit Hash |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **NP-SEC-001** | Critical | Security / IDOR | `GET /api/v1/cases` metadata disclosure leaking all platform citizen cases to lawyers | Resolved | `ae29e04` |
| **NP-BUG-002** | Critical | Functional / API | Lawyer unable to respond to consultation requests due to endpoint mismatch (`PATCH /consultations/:id` vs `PATCH /consultations/:id/respond`) | Resolved | `dd0c189` |
| **NP-BUG-003** | Critical | Functional / UI | Advocate consultation inbox query calls citizen endpoint (`/consultations/my` instead of `/consultations/lawyer`), resulting in an empty inbox | Resolved | `448db4a` |
| **NP-TOOL-004**| High | Toolchain / Lint | Client ESLint failure due to TypeScript 7.0 incompatibility in `typescript-eslint` | Resolved | `f0eb1bb` |
| **NP-PERF-005**| Medium | Performance | Monolithic client bundle (652 kB) exceeding 500 kB chunk threshold due to synchronous route imports | Resolved | `0b1203c` |
| **NP-FEAT-006**| Medium | UI / Feature | Missing advocate Bar Council certificate & ID upload interface in `LawyerOnboardingPage` | Resolved | `2e30912` |
| **NP-UX-007**  | Medium | UX / Integration | In-app notification system unlinked from core lifecycle events; missing notifications bell UI | Resolved | `4313bad` |
| **NP-SEC-008** | Low | Security / Config | Hardcoded Neon Better Auth URL in `AuthCallbackPage.tsx` bypassing environment variables | Resolved | `8e1513d` |
| **NP-QUAL-009**| Low | Code Quality / Bug | Unsafe string property access on `user.fullName` leading to possible runtime null crashes | Resolved | `4313bad` |
| **NP-ARCH-010**| Low | Architecture | Duplicate mounting of `timelineRouter` in `app.ts` causing route shadowing risk | Resolved | `224fc74` |

---

## Detailed Issue Tracking & Remediation Plan

### NP-SEC-001: Case Metadata Disclosure Leaking All Cases to Lawyers
- **Severity**: Critical
- **Category**: Security / Authorization (Anti-IDOR)
- **Description**: When a user authenticated with role `LAWYER` calls `GET /api/v1/cases`, `filter.ownerId` is not populated. As a result, Prisma queries all cases in the entire database, leaking case numbers, titles, categories, descriptions, and counts of every citizen on the platform.
- **Root Cause**: `casesRouter.get("/")` only checked `if (user.role === UserRole.CITIZEN) { filter.ownerId = user.id; }`. If role was `LAWYER`, `filter.ownerId` was left undefined, resulting in an unconstrained `prisma.case.findMany({ where: {} })`.
- **Affected Files**:
  - `server/src/routes/cases.ts`
  - `server/src/services/case/caseService.ts`
  - `server/src/__tests__/cases.test.ts`
- **Fix Implemented**:
  - In `caseService.ts`, introduced `filter.lawyerProfileId` on `ListCasesFilter`. If present, queries cases where `accessGrants` contains an active, unrevoked, unexpired grant for that lawyer profile.
  - In `casesRouter.get("/")`, if user is a `LAWYER`, look up their `lawyerProfile` and set `filter.lawyerProfileId = profile.id` (or return empty list if not yet profiled). Non-admin roles are never allowed unconstrained multi-tenant case queries.
- **Testing Performed**: Added regression test in `cases.test.ts` asserting that an ungranted lawyer calling `GET /api/v1/cases` receives empty results and cannot access unshared citizen cases. All 9 integration tests passed.
- **Git Commit Hash**: `ae29e04`
- **Current Status**: Resolved

---

### NP-BUG-002: Broken Consultation Response Route (404 on Lawyer Action)
- **Severity**: Critical
- **Category**: Functional / API Contract
- **Description**: When an advocate clicks "Accept" or "Decline" on a consultation request in `LawyerDashboard.tsx`, the client sends `PATCH /api/v1/consultations/${consultId}`. However, the server router only mounts `PATCH /api/v1/consultations/:id/respond`. The request returns a `404 ROUTE_NOT_FOUND`, making consultation management impossible.
- **Root Cause**: Frontend route string did not include the `/respond` sub-path, and backend route was strictly pinned to `/respond`.
- **Affected Files**:
  - `client/src/pages/lawyer/LawyerDashboard.tsx`
  - `server/src/routes/consultations.ts`
- **Fix Implemented**:
  - In `client/src/pages/lawyer/LawyerDashboard.tsx`, updated the mutation endpoint to call `/consultations/${consultId}/respond`.
  - In `server/src/routes/consultations.ts`, bound the response handler to both `PATCH /:id/respond` and `PATCH /:id` to provide dual backward and forward API compatibility.
- **Testing Performed**: Executed full integration test suite in `consultations.test.ts` verifying advocate response flow with 8 passing test specs.
- **Git Commit Hash**: `dd0c189`
- **Current Status**: Resolved

---

### NP-BUG-003: Advocate Consultation Inbox Empty Due to Inverted Endpoint Query
- **Severity**: Critical
- **Category**: Functional / Data Retrieval
- **Description**: In the Advocate Workspace (`LawyerDashboard.tsx`), the consultation query requests `/consultations/my`. On the server, `/consultations/my` filters by `{ citizenId: user.id }`. Because the advocate's user ID is not the citizen ID, the query always returns an empty array.
- **Root Cause**: In `LawyerDashboard.tsx`, `queryFn` called `/consultations/my` instead of `/consultations/lawyer`.
- **Affected Files**:
  - `client/src/pages/lawyer/LawyerDashboard.tsx`
- **Fix Implemented**:
  - In `client/src/pages/lawyer/LawyerDashboard.tsx`, redirected the React Query `queryFn` to fetch from `/consultations/lawyer`.
- **Testing Performed**: Verified through typecheck and production client build. Verified against backend endpoint `GET /api/v1/consultations/lawyer` which returns incoming consultation records for the advocate.
- **Git Commit Hash**: `448db4a`
- **Current Status**: Resolved

---

### NP-TOOL-004: Client Toolchain Broken: ESLint Fails with TypeScript 7.0 Incompatibility
- **Severity**: High
- **Category**: Developer Tooling & Linting
- **Description**: Running `bun run lint` in the `client` directory immediately aborts with:
  `Error: typescript-eslint does not support TS 7.0.`
- **Root Cause**: `client/package.json` specifies `"typescript": "~7.0.2"`. The installed `typescript-eslint@8.x` has a hard check throwing on major version >= 7.
- **Affected Files**:
  - `client/package.json`
- **Fix Implemented**:
  - Aligned `client/package.json` to standard TypeScript `^5.9.3` to ensure compatibility with `@typescript-eslint`.
  - Configured rules in `client/eslint.config.js` for React 19 fast refresh, unused variables pattern matching (`argsIgnorePattern: "^_"`), and effect synchronization.
- **Testing Performed**: Ran `bun run --cwd client lint` (exited with code 0, 0 errors) and `bun run --cwd client build` (exited with code 0).
- **Git Commit Hash**: `f0eb1bb`
- **Current Status**: Resolved

---

### NP-PERF-005: Client Bundle Exceeds 500 kB (No Dynamic Route Splitting)
- **Severity**: Medium
- **Category**: Performance / Optimization
- **Description**: Vite production build emits:
  `dist/assets/index-B3r5reCS.js 652.29 kB │ gzip: 177.99 kB`
  `(!) Some chunks are larger than 500 kB after minification.`
- **Root Cause**: All 17 portal pages (Citizen, Lawyer, Admin, Public, Auth) were synchronously imported in `client/src/App.tsx`.
- **Affected Files**:
  - `client/src/App.tsx`
  - `client/vite.config.ts`
- **Fix Implemented**:
  - Implemented route-based lazy loading using `React.lazy()` with `<Suspense fallback={<PageLoader />}>` in `App.tsx`.
  - Configured Rollup manual chunking function in `vite.config.ts` to cleanly isolate `vendor-react` (`react`, `react-dom`, `react-router-dom`), `vendor-query` (`@tanstack/react-query`, `axios`), and `vendor-ui` (`lucide-react`).
- **Testing Performed**: Ran production build; monolithic index chunk reduced from 656 kB down to lazy page chunks (1 kB - 60 kB) with vendor chunks cleanly segregated (`vendor-react` at 282 kB). Zero chunks exceed 500 kB threshold.
- **Git Commit Hash**: `0b1203c`
- **Current Status**: Resolved

---

### NP-FEAT-006: Missing Advocate Accreditation Certificate Upload Interface
- **Severity**: Medium
- **Category**: Feature Completion / UX
- **Description**: The Advocate Onboarding page displayed an accreditation status banner ("Verification Pending", "Re-upload an official Bar ID") but lacked an actual file upload interface for submitting certificates to `POST /api/v1/lawyers/me/documents`.
- **Root Cause**: UI form inputs for document upload were omitted during component authoring.
- **Affected Files**:
  - `client/src/pages/lawyer/LawyerOnboardingPage.tsx`
- **Fix Implemented**:
  - Implemented a complete verification document upload card in `LawyerOnboardingPage.tsx` supporting PDF/PNG/JPEG Bar Council Enrollment Certificates, State Bar Council ID Cards, and AIBE certificates with automatic mutation handling and credentials manifest list.
- **Testing Performed**: Verified through typecheck and production client build with 0 errors. Upload mutation dispatches storageKey and metadata to `/lawyers/me/documents` and refreshes credentials manifest upon completion.
- **Git Commit Hash**: `2e30912`
- **Current Status**: Resolved

---

### NP-UX-007: In-App Notification System Disconnected from Workflow Triggers
- **Severity**: Medium
- **Category**: Integration / User Experience
- **Description**: `notificationService.ts` existed and was tested in isolation, but notification creation was never called during core lifecycle events (consultation bookings, responses, access grants, PDF packet generation). Additionally, portal layouts lacked a notification bell.
- **Root Cause**: Lifecycle event hooks were omitted in business service methods.
- **Affected Files**:
  - `server/src/services/consultation/consultationService.ts`
  - `server/src/services/pdf/packetService.ts`
  - `client/src/components/layout/NotificationBell.tsx` (new)
  - `client/src/components/layout/Navbar.tsx`
  - `client/src/components/citizen/CitizenLayout.tsx`
  - `client/src/components/lawyer/LawyerLayout.tsx`
  - `client/src/components/admin/AdminLayout.tsx`
- **Fix Implemented**:
  - Connected `createNotification` calls in `consultationService.ts` (upon consultation creation, advocate response, and access grant issuance) and in `packetService.ts` (upon PDF case packet generation).
  - Built a rich `NotificationBell` component with polling, unread badges, mark-all-read mutation, and deep-link routing; integrated it into all four portal headers.
- **Testing Performed**: Verified with full backend test suite (`consultations.test.ts`, `packets.test.ts`, `adminNotifications.test.ts` - 22/22 tests passing) and client production build.
- **Git Commit Hash**: `4313bad`
- **Current Status**: Resolved

---

### NP-SEC-008: Hardcoded Neon Better Auth Endpoint in Frontend
- **Severity**: Low
- **Category**: Security / Configuration
- **Description**: `client/src/pages/auth/AuthCallbackPage.tsx` hardcoded `https://ep-empty-butterfly-b30wnp3m.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth/get-session`.
- **Root Cause**: Direct string literal instead of reading `import.meta.env.VITE_AUTH_URL`.
- **Affected Files**:
  - `client/src/pages/auth/AuthCallbackPage.tsx`
  - `client/.env.example`
- **Fix Implemented**:
  - Replaced hardcoded string with `import.meta.env.VITE_AUTH_URL` fallback pattern, stripping trailing slashes.
  - Added `client/.env.example` documenting `VITE_AUTH_URL` and `VITE_API_URL`.
- **Testing Performed**: Client typecheck and production build succeeded.
- **Git Commit Hash**: `8e1513d`
- **Current Status**: Resolved

---

### NP-QUAL-009: Null Safety Bug in Header Avatar Rendering
- **Severity**: Low
- **Category**: Code Quality / Robustness
- **Description**: `Navbar.tsx` referenced `user.fullName.charAt(0)` without optional chaining or email fallback, causing unhandled runtime errors if user object lacked `fullName`.
- **Root Cause**: Direct method invocation on string property that can be undefined in partial profiles.
- **Affected Files**:
  - `client/src/components/layout/Navbar.tsx`
- **Fix Implemented**:
  - Guarded with `((user.fullName && user.fullName.charAt(0)) || (user.email && user.email.charAt(0)) || "U").toUpperCase()`.
- **Testing Performed**: Client build and runtime rendering verified with empty, partial, and full user profiles.
- **Git Commit Hash**: `4313bad`
- **Current Status**: Resolved

---

### NP-ARCH-010: Redundant Route Mounting in `app.ts`
- **Severity**: Low
- **Category**: Architecture / Clean Code
- **Description**: In `server/src/app.ts`, `timelineRouter` was mounted at both `/api/v1/cases/:caseId/timeline` and `/api/v1/cases/:caseId`, creating route collision and shadowing risk.
- **Root Cause**: Mounting alias left in place to support both `/cases/:id/verify` and `/cases/:id/timeline/verify`.
- **Affected Files**:
  - `server/src/app.ts`
  - `server/src/routes/cases.ts`
  - `server/src/routes/timeline.ts`
- **Fix Implemented**:
  - Exported `handleVerifyCase` and `handleGetVerifications` from `timeline.ts` and mounted them directly on `casesRouter` (`POST /:id/verify` and `GET /:id/verifications`).
  - Removed duplicate `app.use("/api/v1/cases/:caseId", timelineRouter)` from `app.ts`.
- **Testing Performed**: Ran `aiAnalysis.test.ts` and `cases.test.ts` (17/17 tests passing), confirming both verification snapshot generation and retrieval work cleanly.
- **Git Commit Hash**: `224fc74`
- **Current Status**: Resolved
