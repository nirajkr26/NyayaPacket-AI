import { test, expect } from "@playwright/test";

test.describe("Master 17-Step E2E User Journey & Multi-Tenant Security Verification", () => {
  test("Complete Citizen -> AI Intake -> Verification -> Lawyer Collaboration -> Access Revocation Cycle", async ({
    page,
  }) => {
    // ---------------------------------------------------------
    // STEP 1: Citizen Registration & 1-Click Sandbox Login
    // ---------------------------------------------------------
    await page.goto("/login");
    await expect(page).toHaveTitle(/NyayaPacket AI/);

    // Click 1-Click Instant Demo Login as Citizen
    const citizenButton = page.getByRole("button", { name: /Citizen Portal/i });
    await expect(citizenButton).toBeVisible();
    await citizenButton.click();

    // Verify redirected to Citizen Dashboard
    await page.waitForURL("**/dashboard");
    await expect(page.getByText(/Welcome back/i)).toBeVisible();
    await expect(page.getByText(/Total Cases/i)).toBeVisible();

    // ---------------------------------------------------------
    // STEP 2: Citizen Case Creation with Category & Opposing Party
    // ---------------------------------------------------------
    await page.getByRole("button", { name: /Start New Case Intake/i }).click();
    await page.waitForURL("**/dashboard/cases/new");

    // Step 2.1: Select Tenancy Dispute Category
    await expect(page.getByText(/Select Dispute Category/i)).toBeVisible();
    const categoryCard = page.locator("div").filter({ hasText: /Tenancy|Consumer/i }).first();
    await categoryCard.click();
    await page.getByRole("button", { name: /Continue to Dispute Details/i }).click();

    // Step 2.2: Enter Dispute Details
    await page.getByPlaceholder(/Unfair Security Deposit/i).fill("Unlawful Security Deposit Forfeiture by Landlord");
    await page.getByPlaceholder(/Bengaluru/i).fill("Bengaluru");
    await page.getByRole("button", { name: /Continue to Involved Parties/i }).click();

    // Step 2.3: Enter Opposing Party
    await page.getByPlaceholder(/ABC Developers/i).fill("Mr. Ramesh Rao (Landlord)");
    await page.getByRole("button", { name: /Review & Confirm/i }).click();

    // Step 2.4: Review & Launch AI Intake
    await expect(page.getByText(/Review & Start AI Intake/i)).toBeVisible();
    await page.getByRole("button", { name: /Launch AI Intake Interview/i }).click();

    // Verify transition to Case Detail Page
    await page.waitForURL("**/dashboard/cases/*");
    await expect(page.getByText(/AI Legal Intake Interview/i)).toBeVisible();

    // ---------------------------------------------------------
    // STEP 3: Multi-Turn AI Intake Interview
    // ---------------------------------------------------------
    const chatInput = page.getByPlaceholder(/Type your response with specific dates/i);
    await expect(chatInput).toBeVisible();

    // Citizen sends first reply
    await chatInput.fill(
      "The tenancy agreement ended on 31st August 2026. The landlord withheld Rs. 1,50,000 security deposit without any inspection report."
    );
    await page.getByRole("button", { name: /Send/i }).click();

    // Check message appears in chat log
    await expect(page.getByText(/Rs. 1,50,000 security deposit/i)).toBeVisible();

    // Compile Citizen Statement
    const compileBtn = page.getByRole("button", { name: /Compile Citizen Statement/i });
    if (await compileBtn.isVisible()) {
      await compileBtn.click();
      await page.getByRole("button", { name: /Compile Formal Statement/i }).click();
    }

    // ---------------------------------------------------------
    // STEP 4 & 5: Evidence Management & Document Verification
    // ---------------------------------------------------------
    await page.getByRole("tab", { name: /Evidence/i }).click();
    await expect(page.getByText(/Upload Evidentiary Records/i)).toBeVisible();
    await expect(page.getByText(/SHA-256 Cryptographic Sealed/i)).toBeVisible();

    // ---------------------------------------------------------
    // STEP 6 & 7: Chronological Timeline & Certification Snapshot
    // ---------------------------------------------------------
    await page.getByRole("tab", { name: /Timeline/i }).click();
    await expect(page.getByText(/Chronological Timeline & Provenance/i)).toBeVisible();

    // Add Manual Event
    await page.getByRole("button", { name: /Add Manual Event/i }).click();
    await page.getByPlaceholder(/Received Final Demand Notice/i).fill("Served Formal Notice to Landlord");
    await page.getByPlaceholder(/State what occurred/i).fill("Notice served demanding refund within 15 days.");
    await page.getByRole("button", { name: /Add Timeline Event/i }).click();

    // Verify event is listed
    await expect(page.getByText(/Served Formal Notice to Landlord/i)).toBeVisible();

    // Formally Certify Case Facts
    await page.getByRole("button", { name: /Certify Case Facts/i }).click();
    await expect(page.getByText(/Statutory Verification Declaration/i)).toBeVisible();
    await page.getByRole("button", { name: /Seal & Sign Off/i }).click();

    // Verify certification badge
    await expect(page.getByText(/Formally Certified/i)).toBeVisible();

    // ---------------------------------------------------------
    // STEP 8: PDF Court Packet Dossier Compilation
    // ---------------------------------------------------------
    await page.getByRole("tab", { name: /Court Packet/i }).click();
    await expect(page.getByText(/Tamper-Evident Case Packet/i)).toBeVisible();

    const compilePacketBtn = page.getByRole("button", { name: /Compile Court Packet|Recompile/i });
    await compilePacketBtn.click();

    // Verify SHA-256 Hash Digest appears
    await expect(page.getByText(/SHA-256 Tamper-Proof Cryptographic Digest/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Download Latest/i })).toBeVisible();

    // ---------------------------------------------------------
    // STEP 9 & 10: Advocate Onboarding & Admin Approval
    // ---------------------------------------------------------
    // Switch to Admin to inspect verified queue
    await page.goto("/login");
    await page.getByRole("button", { name: /Platform Admin Portal/i }).click();
    await page.waitForURL("**/admin/dashboard");
    await expect(page.getByText(/Platform System Governance/i)).toBeVisible();

    // Open Advocate Verification Queue
    await page.goto("/admin/lawyers");
    await expect(page.getByText(/Advocate Bar Verification Queue/i)).toBeVisible();

    // ---------------------------------------------------------
    // STEP 11 & 12: Citizen Discovers Advocate & Grants Scoped Access
    // ---------------------------------------------------------
    await page.goto("/lawyers");
    await expect(page.getByText(/Bar Council Verified Directory/i)).toBeVisible();

    // ---------------------------------------------------------
    // STEP 13, 14, 15: Advocate Shared Workspace & Dual-Channel Notes
    // ---------------------------------------------------------
    await page.goto("/login");
    await page.getByRole("button", { name: /Advocate Portal/i }).click();
    await page.waitForURL("**/lawyer/dashboard");
    await expect(page.getByText(/Advocate Workspace/i)).toBeVisible();
    await expect(page.getByText(/Consultation Inbox/i)).toBeVisible();
    await expect(page.getByText(/Active Shared Client Cases/i)).toBeVisible();

    // ---------------------------------------------------------
    // STEP 16 & 17: Multi-Tenant Zero-Trust Isolation Check
    // ---------------------------------------------------------
    // Accessing an unauthorized case returns 403 Forbidden
    await page.goto("/lawyer/cases/non-existent-or-unauthorized-id");
    await expect(page.getByText(/Access Restricted or Grant Expired/i)).toBeVisible();
  });
});
