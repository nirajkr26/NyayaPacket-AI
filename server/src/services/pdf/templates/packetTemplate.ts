export interface PacketTemplateData {
  caseNumber: string;
  version: number;
  generatedAt: string;
  sha256Digest?: string;
  categoryName: string;
  citizenName: string;
  citizenEmail: string;
  citizenPhone?: string;
  city?: string;
  state?: string;
  incidentDate?: string;
  parties: Array<{ name: string; relationship?: string }>;
  summary: string;
  keyIssues: string[];
  reliefSought: string;
  strengths: string[];
  weaknesses: string[];
  missingInformation: string[];
  timeline: Array<{
    date: string;
    title: string;
    description?: string;
    verificationStatus: string;
    sources: string[];
  }>;
  evidence: Array<{
    originalName: string;
    fileType: string;
    sha256: string;
    description?: string;
  }>;
  verification?: {
    verifiedAt: string;
    verifierName: string;
    note?: string;
  };
}

export function renderPacketHtml(data: PacketTemplateData): string {
  const partiesHtml =
    data.parties.length > 0
      ? data.parties
          .map(
            (p) =>
              `<tr><td><strong>${p.name}</strong></td><td>${p.relationship || "Opposing Party"}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="2">No opposing parties recorded</td></tr>`;

  const timelineHtml =
    data.timeline.length > 0
      ? data.timeline
          .map(
            (t) => `
          <div class="timeline-item">
            <div class="timeline-date">${t.date || "Approximate / Undated"}</div>
            <div class="timeline-content">
              <strong>${t.title}</strong>
              <p>${t.description || ""}</p>
              <div class="meta-tags">
                <span class="tag tag-status">${t.verificationStatus}</span>
                ${t.sources.map((s) => `<span class="tag tag-source">Ref: ${s}</span>`).join(" ")}
              </div>
            </div>
          </div>
        `
          )
          .join("")
      : `<p class="muted">No chronological events extracted.</p>`;

  const evidenceHtml =
    data.evidence.length > 0
      ? data.evidence
          .map(
            (e, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${e.originalName}</strong></td>
            <td><span class="badge">${e.fileType}</span></td>
            <td><code>${e.sha256}</code></td>
          </tr>
        `
          )
          .join("")
      : `<tr><td colspan="4">No evidence documents indexed.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NyayaPacket Dossier - ${data.caseNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 8pt;
        color: #666;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1a202c;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #2b6cb0;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .logo {
      font-size: 20pt;
      font-weight: 800;
      color: #2b6cb0;
      letter-spacing: -0.5px;
    }
    .sublogo {
      font-size: 8.5pt;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .doc-meta {
      text-align: right;
      font-size: 8.5pt;
      color: #4a5568;
    }
    .disclaimer-banner {
      background-color: #ebf8ff;
      border: 1px solid #bee3f8;
      border-left: 4px solid #3182ce;
      padding: 8px 12px;
      margin-bottom: 18px;
      font-size: 8pt;
      color: #2b6cb0;
    }
    h2 {
      font-size: 11.5pt;
      color: #2d3748;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 18px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 9pt;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 6px 10px;
      text-align: left;
    }
    th {
      background-color: #f7fafc;
      color: #4a5568;
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      background: #edf2f7;
      color: #4a5568;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 600;
    }
    .tag {
      display: inline-block;
      font-size: 7pt;
      padding: 1px 5px;
      border-radius: 3px;
      margin-right: 4px;
    }
    .tag-status {
      background: #feebc8;
      color: #744210;
    }
    .tag-source {
      background: #e2e8f0;
      color: #4a5568;
    }
    code {
      font-family: monospace;
      font-size: 7.5pt;
      background: #f7fafc;
      padding: 1px 3px;
    }
    .timeline-item {
      display: flex;
      margin-bottom: 10px;
      border-left: 2px solid #cbd5e0;
      padding-left: 10px;
    }
    .timeline-date {
      width: 110px;
      font-weight: 600;
      font-size: 8.5pt;
      color: #4a5568;
      flex-shrink: 0;
    }
    .timeline-content {
      flex-grow: 1;
    }
    .timeline-content p {
      margin: 2px 0 4px 0;
      font-size: 8.5pt;
    }
    .verification-box {
      background: #f0fff4;
      border: 1px solid #c6f6d5;
      border-left: 4px solid #38a169;
      padding: 8px 12px;
      margin-top: 20px;
      font-size: 8.5pt;
      color: #22543d;
    }
    .muted {
      color: #718096;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">NYAYAPACKET AI</div>
      <div class="sublogo">Legal Aid & Advocate Case Packet Dossier</div>
    </div>
    <div class="doc-meta">
      <strong>Case Ref: ${data.caseNumber}</strong><br>
      Packet Version: v${data.version}<br>
      Generated: ${data.generatedAt}
    </div>
  </div>

  <div class="disclaimer-banner">
    <strong>STATUTORY LEGAL AID & CITIZEN INTAKE NOTICE:</strong> This document compiles citizen factual statements and verified evidence digests. Generated by NyayaPacket AI under principles of the Legal Services Authorities Act, 1987. This is not an advocate legal opinion under Section 30 of the Advocates Act, 1961.
  </div>

  <h2>1. Citizen & Party Profile</h2>
  <table>
    <tr>
      <th style="width: 25%;">Citizen Name</th>
      <td style="width: 25%;">${data.citizenName}</td>
      <th style="width: 25%;">Contact Email</th>
      <td style="width: 25%;">${data.citizenEmail}</td>
    </tr>
    <tr>
      <th>Dispute Category</th>
      <td>${data.categoryName}</td>
      <th>Jurisdiction / City</th>
      <td>${data.city || "N/A"}, ${data.state || "India"}</td>
    </tr>
  </table>

  <table>
    <thead>
      <tr>
        <th>Opposing Party / Entity</th>
        <th>Relationship / Role</th>
      </tr>
    </thead>
    <tbody>
      ${partiesHtml}
    </tbody>
  </table>

  <h2>2. Verified Legal Case Summary</h2>
  <p>${data.summary}</p>

  <table>
    <tr>
      <th style="width: 50%;">Core Legal Issues Identified</th>
      <th style="width: 50%;">Relief & Restitution Sought</th>
    </tr>
    <tr>
      <td style="vertical-align: top;">
        <ul>
          ${data.keyIssues.map((issue) => `<li>${issue}</li>`).join("")}
        </ul>
      </td>
      <td style="vertical-align: top;">
        <p>${data.reliefSought}</p>
      </td>
    </tr>
  </table>

  <h2>3. Chronological Sequence of Events</h2>
  ${timelineHtml}

  <h2>4. Cryptographic Evidence Dossier & SHA-256 Manifest</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 5%;">#</th>
        <th style="width: 35%;">Document Name</th>
        <th style="width: 15%;">Type</th>
        <th style="width: 45%;">Cryptographic SHA-256 Digest</th>
      </tr>
    </thead>
    <tbody>
      ${evidenceHtml}
    </tbody>
  </table>

  <h2>5. Gaps & Questions for Advocate Consultation</h2>
  <ul>
    ${data.missingInformation.map((info) => `<li>${info}</li>`).join("")}
  </ul>

  ${
    data.verification
      ? `
    <div class="verification-box">
      <strong>CITIZEN VERIFICATION ATTESTATION:</strong><br>
      I, <strong>${data.verification.verifierName}</strong>, hereby attest that all facts, dates, and evidence descriptions in this case packet are accurate to the best of my knowledge.<br>
      <em>Certified on: ${data.verification.verifiedAt}</em>
    </div>
  `
      : ""
  }
</body>
</html>`;
}
