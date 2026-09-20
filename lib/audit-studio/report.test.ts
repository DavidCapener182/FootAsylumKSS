import { describe, it, expect } from "vitest";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { TEMPLATE, emptyDocument, emptyResponse } from "./template";
import { generateReport } from "./report";
import type { AuditBundle, AuditRecord, Evidence } from "./types";
function fixture(): AuditBundle {
  const doc = emptyDocument({
    storeName: "Audit Studio QA Store",
    storeCode: "TEST-ONLY",
    address: "Test fixture — no operational inspection",
    visitDate: "2026-09-19",
    auditor: "QA fixture",
  });
  for (const q of TEMPLATE.sections.flatMap((s) => s.checks))
    doc.responses[q.id] = { ...emptyResponse(), answer: "yes" };
  return {
    audit: {
      id: randomUUID(),
      document: doc,
      template_version: TEMPLATE.version,
      parent_id: null,
    } as AuditRecord,
    template: TEMPLATE,
    evidence: [],
  };
}
describe("Frozen report generation", () => {
  it("renders a report with practical checks for successful and flagged responses", async () => {
    const b = fixture();
    b.audit.document.site.managerName = "MOCK manager";
    b.audit.document.site.assemblyPoint = "MOCK: assembly sign A by the car park gate";
    b.audit.document.site.assemblyPointEvidence = "MOCK: location confirmed on the fire action notice";
    b.audit.document.responses["05.02"].practicalCheck = {
      checked: "Asked about stock retrieval and spill controls.",
      outcome: "Both staff explained the controls correctly.",
    };
    b.audit.document.responses["06.03"] = {
      ...emptyResponse(),
      answer: "no",
      note: "Emergency refresher needed.",
      practicalCheck: {
        checked:
          "Asked two sales assistants where to assemble after evacuation.",
        outcome: "One identified the assembly point; one was unsure.",
      },
      action: {
        text: "Complete refresher",
        owner: "Store manager",
        dueDate: "2026-09-20",
      },
    };
    const bytes = await generateReport(b, async () => {
      throw new Error("Unexpected evidence request");
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(3);
    mkdirSync("/tmp/audit-studio-qa", { recursive: true });
    writeFileSync("/tmp/audit-studio-qa/practical-check-report.pdf", bytes);
  });
  it("renders 120 mixed-orientation photos beside their questions and appends a supporting PDF", async () => {
    mkdirSync("/tmp/audit-studio-qa/uploads", { recursive: true });
    const b = fixture(),
      data = new Map<string, Buffer>(),
      qs = TEMPLATE.sections.flatMap((s) => s.checks);
    for (let i = 0; i < 120; i++) {
      const id = randomUUID(),
        portrait = i % 2 === 0,
        width = portrait ? 540 : 960,
        height = portrait ? 960 : 540;
      const svg = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${portrait ? "#e2efdd" : "#dce7ee"}"/><path d="M 100 160 L 140 80 L 180 160" fill="none" stroke="#233c2b" stroke-width="12"/><text x="30" y="220" font-size="32">TOP — PHOTO ${i + 1}</text><text x="30" y="270" font-size="24">Question ${qs[i % qs.length].id}</text><rect x="25" y="310" width="${width - 50}" height="${height - 350}" fill="none" stroke="#476744" stroke-width="4"/></svg>`,
      );
      const bytes = await sharp(svg).jpeg().toBuffer(),
        source_path = `test/${id}.jpg`;
      data.set(source_path, bytes);
      writeFileSync(
        `/tmp/audit-studio-qa/uploads/QA-photo-${String(i + 1).padStart(3, "0")}.jpg`,
        bytes,
      );
      const ref = {
        id,
        questionId: qs[i % qs.length].id,
        caption: `Photo ${i + 1} — ${portrait ? "portrait" : "landscape"} orientation; top arrow should point upwards.`,
        location: "QA fixture location",
      };
      b.audit.document.evidence.push(ref);
      b.evidence.push({
        ...ref,
        audit_id: b.audit.id,
        file_name: `photo-${i + 1}.jpg`,
        file_type: "image/jpeg",
        file_size: bytes.length,
        status: "ready",
        source_path,
        render_path: source_path,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        created_at: "2026-09-19",
      } as Evidence);
    }
    const support = await PDFDocument.create();
    const supportPage = support.addPage();
    supportPage.drawText("SUPPORTING DOCUMENT — QUESTION 07.02", {
      x: 42,
      y: 755,
      size: 16,
    });
    supportPage.drawText("EXAMPLE RECORD / SOFTWARE TEST ONLY", {
      x: 42,
      y: 727,
      size: 11,
    });
    const sampleRecord = [
      "Store: Audit Studio QA Store",
      "Reference: EXAMPLE-2026-001",
      "Attached to: Electrical maintenance check 07.02",
      "Record date: 19 September 2026",
      "Prepared by: Example maintenance provider",
      "Status: Synthetic document — no inspection carried out",
      "",
      "Purpose of this example",
      "This page shows how a supporting record is retained with its question",
      "and appended to the audit report. It is not a certificate or proof of safety.",
      "",
      "Details a real supporting record should identify",
      "1. The premises and equipment covered by the record.",
      "2. The inspection or service date and the responsible person.",
      "3. The checks carried out and any limits to the inspection.",
      "4. The recorded outcome, defects and restrictions.",
      "5. Required follow-up work, responsibility and review dates.",
      "",
      "Link to the audit",
      "Question: 07.02 — fixed-wiring report",
      "Attachment caption: Supporting record",
      "Auditor review: Example only",
      "",
      "The original uploaded document is preserved in the completed report.",
      "Review the actual document and record the findings against its question.",
    ];
    sampleRecord.forEach((value, i) =>
      supportPage.drawText(value, { x: 42, y: 683 - i * 20, size: 10 }),
    );
    const bytes = Buffer.from(await support.save()),
      id = randomUUID(),
      path = `test/${id}.pdf`,
      ref = {
        id,
        questionId: "07.02",
        caption: "Supporting record",
        location: "QA",
      };
    data.set(path, bytes);
    writeFileSync("/tmp/audit-studio-qa/uploads/QA-support.pdf", bytes);
    b.audit.document.evidence.push(ref);
    b.evidence.push({
      ...ref,
      audit_id: b.audit.id,
      file_name: "support.pdf",
      file_type: "application/pdf",
      file_size: bytes.length,
      status: "ready",
      source_path: path,
      render_path: path,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      created_at: "2026-09-19",
    } as Evidence);
    const report = await generateReport(b, async (p) => {
        if (!data.has(p)) throw new Error("missing");
        return data.get(p)!;
      }),
      parsed = await PDFDocument.load(report);
    expect(parsed.getPageCount()).toBeGreaterThan(10);
    expect(parsed.getPageCount()).toBeLessThan(60);
    expect(report.length).toBeGreaterThan(300000);
    mkdirSync("/tmp/audit-studio-qa", { recursive: true });
    writeFileSync("/tmp/audit-studio-qa/120-photo-report.pdf", report);
    writeFileSync(
      "/tmp/audit-studio-qa/fixture.json",
      JSON.stringify({
        pages: parsed.getPageCount(),
        photos: 120,
        supporting: 1,
        bytes: report.length,
      }),
    );
    if (process.env.AUDIT_STUDIO_PREVIEW === "true") {
      const sampleIds = new Set(
        b.audit.document.evidence
          .filter((e) => ["07.02", "09.02", "15.02"].includes(e.questionId))
          .map((e) => e.id),
      );
      b.audit.document.evidence = b.audit.document.evidence.filter((e) =>
        sampleIds.has(e.id),
      );
      b.evidence = b.evidence.filter((e) => sampleIds.has(e.id));
      b.audit.document.site.storeName = "Example store — PDF preview";
      b.audit.document.site.auditor = "Example auditor";
      b.audit.document.site.floors = "Ground and first floor";
      b.audit.document.site.area = "300";
      b.audit.document.site.exits = "2";
      b.audit.document.site.staff = "15";
      b.audit.document.site.maxStaff = "8";
      b.audit.document.site.enforcement = "None recorded in this example";
      b.audit.document.signOff.unavailableReason =
        "Layout preview only. No store inspection was carried out.";
      b.audit.document.responses["15.02"] = {
        ...emptyResponse(),
        answer: "no",
        note: "Example finding: a fire door was held open with a wedge. This is a sample, not a finding from a store visit.",
        action: {
          text: "Remove the wedge and check that the door closes properly. Remind the team to keep it closed.",
          owner: "Store manager",
          dueDate: "2026-09-20",
        },
      };
      mkdirSync("output/audit-studio", { recursive: true });
      writeFileSync(
        "output/audit-studio/Audit-Studio-Example-Report.pdf",
        await generateReport(b, async (p) => data.get(p)!),
      );
    }
  }, 60000);
  it("fails explicitly for missing evidence rather than leaving it out", async () => {
    const b = fixture();
    b.audit.document.evidence.push({
      id: randomUUID(),
      questionId: "09.02",
      caption: "Must appear",
      location: "Stockroom",
    });
    await expect(
      generateReport(b, async () => Buffer.from("")),
    ).rejects.toThrow("Missing evidence");
  });
  it("rejects changed attachment bytes", async () => {
    const b = fixture(),
      id = randomUUID(),
      ref = { id, questionId: "09.02", caption: "Checksum test", location: "" };
    b.audit.document.evidence.push(ref);
    b.evidence.push({
      ...ref,
      status: "ready",
      source_path: "x",
      render_path: "x",
      sha256: "bad",
    } as Evidence);
    await expect(
      generateReport(b, async () => Buffer.from("changed")),
    ).rejects.toThrow("integrity");
  });
});
