# PRD: NyayaPacket AI — Citizen Dashboard

## 1. Overview & Vision
NyayaPacket AI helps a citizen organize a legal problem before meeting a lawyer. The citizen describes the issue, answers guided questions, uploads evidence, reviews an AI-drafted summary and timeline, verifies each item, and then downloads a case packet to share with a lawyer or para-legal volunteer.
**Core Principle**: The AI only organizes information. It does NOT give legal advice, predict outcomes, or decide anything. Citizen verification is always required.

## 2. Tech Stack & Architecture
- **Framework**: React 18 / 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (light theme only, off-white #F8FAFC, border slate-200, accent teal #0D9488, soft pastel chips)
- **Routing**: react-router-dom
- **Icons**: lucide-react
- **State**: Plain React state, no external state management library
- **Mock Data**: `src/data/mock.ts`
- **Testing**: Vitest + React Testing Library

## 3. UI/UX Specifications
- **Design Tone**: Light, calm, minimal, friendly. Light theme only.
- **Background**: Off-white (`#F8FAFC`), white cards (`#FFFFFF`), thin soft borders (`slate-200`), subtle shadows (`shadow-sm`), rounded-xl corners (`rounded-xl`).
- **Color Accent**: Teal (`#0D9488`, `text-teal-600`, `bg-teal-600`, etc.). Soft pastel status chips (amber, green, blue, rose, slate).
- **Typography**: System font stack / Inter. Plain, simple language (no legal jargon).
- **Responsiveness**: Sidebar collapses to mobile drawer/sheet/bottom nav on smaller screens.
- **Accessibility**: Visible focus rings, `aria-label` attributes, high contrast, keyboard navigable.

## 4. App Shell & Layout
1. **Left Sidebar**:
   - Brand logo / title: "NyayaPacket AI"
   - Navigation links:
     - Dashboard (`/`)
     - My Cases (`/cases`)
     - Evidence (`/evidence`)
     - Verify Draft (`/verify`)
     - Packets (`/packets`)
     - Sharing (`/sharing`)
     - Action Items (`/action-items`)
     - Help (`/help`)
   - Bottom user chip: Name "Aarav Sharma", role "Citizen".
2. **Top Bar**:
   - Current page title
   - Global search input box
   - Notifications bell button with badge indicator
   - User avatar
3. **Disclaimer / Info Banner** (Always visible beneath top bar):
   - "NyayaPacket AI helps you organize your case. It is not legal advice. A lawyer will review your packet."

## 5. Dashboard Page Sections (In Exact Order)
1. **Welcome Row**:
   - Heading: "Hello, Aarav"
   - Subtext: "Organize your evidence and case details before meeting your lawyer."
   - Primary action button: `+ Start a new case`
2. **Stat Cards Row** (4 small cards):
   - Active cases (e.g., 3)
   - Items to verify (e.g., 6)
   - Evidence files (e.g., 14)
   - Open action items (e.g., 4)
3. **Continue Where You Left Off Card**:
   - Most recent case banner with title ("Salary not paid for 2 months"), category chip ("Unpaid Wages")
   - 9-step workflow stepper:
     1. New Case
     2. Interview
     3. Evidence
     4. AI Draft
     5. Verification (Current)
     6. Ready for Lawyer
     7. Consultation Done
     8. Action Plan
     9. Closed
   - Readiness progress bar (e.g., 72% ready)
   - Single clear next-step CTA: "Verify 6 draft items"
4. **My Cases Section**:
   - Grid or list of 3 mock cases:
     1. "Salary not paid for 2 months" (Unpaid Wages, state: Verification, 72% ready, 6 items to verify, 5 evidence files)
     2. "Security deposit not returned" (Tenant-Landlord, state: Evidence, 40% ready, 2 items to verify, 6 evidence files)
     3. "Defective washing machine refund" (Consumer Complaint, state: Ready for Lawyer, 95% ready, 0 items to verify, 3 evidence files)
   - Each card displays title, category chip, state chip, last updated timestamp, evidence count, and "Open" button.
5. **Two-Column Lower Section**:
   - **Left: Needs your attention checklist**:
     - Items to verify, missing information, missing documents.
     - Clear distinction: small chip `"AI draft"` for AI-generated items, `"You wrote this"` for citizen-written items.
   - **Right: Recent activity timeline**:
     - Uploaded salary slips, verified timeline item, shared packet with volunteer, share link expiry warning.
6. **Start a New Case Category Tiles**:
   - Exactly 3 category cards:
     1. Unpaid wages (Icon: Briefcase / Indian Rupee / Banknote, plain description)
     2. Tenant-landlord dispute (Icon: Home / Building, plain description)
     3. Consumer complaint (Icon: ShoppingBag / ShieldAlert, plain description)
   - Clicking a tile opens a modal to enter a case title, confirms category, and adds card to local state.
7. **Footer**:
   - Fictional data note: "Demo project using fictional data only."

## 6. Placeholder Pages
- Simple placeholder pages for `/cases`, `/evidence`, `/verify`, `/packets`, `/sharing`, `/action-items`, `/help` with title and "Coming soon" card.

## 7. Phase 2: Backend, Authentication & RBAC

### Tech Stack
- Backend directory: `/server`
- Express, TypeScript, Mongoose, bcryptjs, jsonwebtoken, cookie-parser, helmet, cors, express-rate-limit, zod, dotenv
- Dev tooling: `tsx`, `concurrently` (unified `npm run dev`), Vite proxy for `/api/*`
- Testing: Vitest + supertest + mongodb-memory-server (isolated in-memory MongoDB)

### Data Models
1. **User**:
   - `name`: string
   - `email`: string (unique, lowercase)
   - `passwordHash`: string
   - `role`: enum (`citizen` | `lawyer` | `volunteer` | `admin`), default `citizen`
   - `barCouncilId`: string (optional, lawyers only)
   - `isActive`: boolean (default `true`)
   - Timestamps (`createdAt`, `updatedAt`)
2. **AuditLog**:
   - `actorId`: ObjectId / null
   - `action`: string (e.g. `auth.register`, `auth.login.success`, `auth.login.failed`, `auth.logout`, `access.denied`)
   - `role`: string
   - `ip`: string
   - `metadata`: object
   - `createdAt`: Date
   - *Immutable append-only*: No update or delete operations exposed.

### API Endpoints
- `POST /api/auth/register`: Validates name, email, password (min 8 chars), role (`citizen` | `lawyer` only; rejects `admin` or `volunteer`). Hashes password (bcrypt cost >= 10), creates user, logs `auth.register`.
- `POST /api/auth/login`: Validates credentials, checks `isActive`, sets httpOnly `token` cookie (sameSite=lax), logs `auth.login.success` or `auth.login.failed`. Generic failure error message: `"Invalid email or password"`.
- `POST /api/auth/logout`: Clears auth cookie, logs `auth.logout`.
- `GET /api/auth/me`: Decodes JWT cookie, verifies user in DB, returns sanitized user object (`id`, `name`, `email`, `role`, `barCouncilId`).
- `GET /api/citizen/ping`: Guarded demo route (citizen role only).
- `GET /api/lawyer/ping`: Guarded demo route (lawyer role only).

### Security & Middlewares
- Rate-limiting on register and login.
- `authenticate`: verifies token cookie, loads active user from database.
- `requireRole(...roles)`: checks database user role. Denies with 403 on role mismatch and logs `access.denied` audit entry.
- Helmet headers and CORS configured for `CLIENT_ORIGIN` with credentials.

### Frontend Integration
- `AuthContext`: provides `user`, `loading`, `login`, `register`, `logout`, auto-calls `/api/auth/me` on mount.
- `ProtectedRoute`: redirects unauthenticated users to `/login`, and redirects wrong-role users to a friendly "Not allowed" access denied page.
- Login and Register pages adhering to light, calm, minimal aesthetic.
- Post-login navigation: citizens -> `/dashboard` (or `/`), lawyers -> `/lawyer`.
- Lawyer dashboard at `/lawyer`: 4 stat cards, Shared Cases list with packet-ready chip, Review Queue, disclaimer note.
- Dynamic navigation: Role-specific sidebar items and real user name/role in the user chip with a Logout button.

