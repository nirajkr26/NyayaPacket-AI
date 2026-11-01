# NyayaPacket AI — Testing Strategy & Quality Assurance Framework

## 1. Testing Philosophy & Guiding Principles

NyayaPacket AI adheres to the strict requirement: **Testing is not an optional final activity.**

Every implementation milestone must write, execute, and validate tests before gate approval. No milestone is considered complete without passing its automated test suite. 

Key principles:
1. **Security & Authorization First**: Access control and data isolation are release-blocking. Negative test cases (verifying access is properly denied) are just as critical as positive test cases.
2. **Deterministic & Isolated**: Unit and integration tests do not depend on external live network calls (LLM APIs, external S3 storage, or SMS gateways). Mocks and test doubles are used for third-party cloud services.
3. **Traceability**: Every feature in `docs/FEATURE_CHECKLIST.md` has corresponding test coverage.
4. **Honest Execution**: Tests are never mocked into passing, skipped, or disabled to bypass milestone gates.

---

## 2. The Test Pyramid

```
                / \
               / E2E \           Playwright: Complete Citizen-to-Lawyer Flow
              /-------\
             /   API   \         Supertest: HTTP Status, Zod Validation & Contracts
            /-----------\
           / Integration \       Prisma DB Fixtures, Redis/BullMQ, S3 Handlers
          /---------------\
         /    Unit Tests   \     Pure Functions, Zod Schemas, Security Evaluators
        /-------------------\
```

---

## 3. Test Suites & Categorization

### 3.1 Unit Testing
- **Target**: Pure helper functions, Zod schema validations, prompt template interpolation, cryptographic hash verification, and authorization logic.
- **Framework**: `vitest` (or Bun test runner).
- **Scope**:
  - Validation of all request payloads against Zod schemas.
  - Parsing and normalization of AI structured JSON outputs.
  - Date and chronology ordering utilities.
  - Error normalization and standard response wrappers.

### 3.2 Integration Testing
- **Target**: Database transactions, Prisma queries, BullMQ job queues, and S3 adapter operations.
- **Scope**:
  - Prisma migrations and schema constraint enforcement (unique constraints, cascade deletes).
  - Queue job creation, retry mechanisms, and dead-letter handling.
  - File upload session verification and S3 client mocking.
  - Audit logging side-effects on critical operations.

### 3.3 Security & Authorization Suite (Release-Blocking)
This suite specifically validates access control policies, IDOR protections, and role boundaries:

| Test ID | Test Scenario | Expected Result |
| :--- | :--- | :--- |
| **SEC-01** | Request to protected route without `Authorization` header. | HTTP 401 Unauthorized |
| **SEC-02** | Request with malformed or tampered JWT. | HTTP 401 Unauthorized |
| **SEC-03** | Request with valid token for an inactive/suspended user. | HTTP 403 Forbidden (`ACCOUNT_SUSPENDED`) |
| **SEC-04** | Citizen attempts to read/update another citizen's case (IDOR). | HTTP 403 / 404 Forbidden |
| **SEC-05** | Lawyer in `PENDING` verification status attempts to access lawyer portal APIs. | HTTP 403 Forbidden (`LAWYER_NOT_APPROVED`) |
| **SEC-06** | Lawyer in `REJECTED` or `SUSPENDED` status attempts to receive consultations. | HTTP 403 Forbidden |
| **SEC-07** | Approved Lawyer attempts to view a case without an explicit `AccessGrant`. | HTTP 403 Forbidden (`CASE_ACCESS_DENIED`) |
| **SEC-08** | Approved Lawyer accesses a case with an active, valid `AccessGrant`. | HTTP 200 OK with authorized case view |
| **SEC-09** | Approved Lawyer attempts access after `grant.revokedAt` is set. | HTTP 403 Forbidden (`GRANT_REVOKED`) |
| **SEC-10** | Approved Lawyer attempts access after `grant.expiresAt` has passed. | HTTP 403 Forbidden (`GRANT_EXPIRED`) |
| **SEC-11** | Approved Lawyer with `canDownload: false` attempts evidence download URL generation. | HTTP 403 Forbidden (`DOWNLOAD_NOT_PERMITTED`) |
| **SEC-12** | Admin attempts to download citizen evidence files or read private case notes. | HTTP 403 Forbidden (`ADMIN_EVIDENCE_RESTRICTED`) |
| **SEC-13** | User attempts to update their own role (`role: "ADMIN"`) via profile update. | Field ignored or rejected with HTTP 400 |

### 3.4 AI Provenance & Schema Validation Tests
- **Target**: AI orchestration layer (`AiService`).
- **Tests**:
  - LLM response conforms to strict Zod schema (`CaseSummarySchema`, `TimelineEventSchema`).
  - Validation that every source reference (`evidenceId`, `statementId`) exists in the database for that specific case.
  - Automatic rejection or quarantine if an AI output hallucinates a non-existent source ID.
  - Fallback handling when primary LLM provider times out or returns malformed output.

### 3.5 End-to-End (E2E) Workflow Testing
- **Tool**: Playwright.
- **Workflow Covered**:
  1. Citizen creates an account and logs in.
  2. Citizen opens a new case (Tenant-Landlord Dispute).
  3. Citizen completes the AI intake interview.
  4. Citizen uploads a rental agreement and rent receipt.
  5. System processes documents and extracts chronology.
  6. Citizen verifies, modifies a timeline date, and confirms facts.
  7. Citizen generates a versioned PDF packet.
  8. Citizen searches verified lawyers and requests a consultation.
  9. Lawyer receives and accepts consultation.
  10. Citizen grants scoped case access.
  11. Lawyer reviews case, leaves a comment, and sets an action plan.
  12. Citizen revokes lawyer access.
  13. Lawyer verifies case is no longer accessible.

---

## 4. Test Execution & CI Automation

```bash
# Run backend unit and integration tests
bun test

# Run security & authorization suite specifically
bun test --filter=security

# Run linter & type check
bun run lint
bun run typecheck

# Run Playwright E2E tests
bun run test:e2e
```

---

## 5. Milestone Testing Gate Protocol

At the conclusion of each milestone:
1. All newly introduced services and endpoints must have unit and integration test coverage.
2. The Security Suite must pass without regression.
3. TypeScript compiler check (`tsc --noEmit`) must exit with 0 errors.
4. Linter must report 0 errors.
5. Test outputs and counts must be documented in the Milestone Report.
