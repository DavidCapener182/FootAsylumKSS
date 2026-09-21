import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import JSZip from "jszip";
import { TEMPLATE, emptyDocument, emptyResponse } from "./template";
import { scoreAudit, completionIssues, completionRecommendations } from "./scoring";
import { validateDocument } from "./validation";
export function answered() {
  const doc = emptyDocument();
  for (const s of TEMPLATE.sections)
    for (const q of s.checks)
      doc.responses[q.id] = { ...emptyResponse(), answer: "yes" };
  return doc;
}
describe("Audit Studio versioned scoring", () => {
  it("allows optional site details and representative acknowledgement without changing scores", () => {
    const doc = answered();
    Object.assign(doc.site, {storeName: "Bolton", storeCode: "S0017", address: "Store address", visitDate: "2026-09-21", auditor: "Auditor"});
    doc.signOff.auditorSignature = "signature";
    doc.optionalStaffSampling = true;
    expect(completionIssues(TEMPLATE, doc)).toEqual([]);
    expect(completionRecommendations(TEMPLATE, doc).length).toBeGreaterThan(0);
    expect(scoreAudit(TEMPLATE, doc).outcome).toBe("Pass");
    doc.responses["09.02"].answer = "no";
    expect(completionIssues(TEMPLATE, doc).map(i => i.message)).toEqual(["Add a note explaining the finding.", "Add the action, owner and due date."]);
  });
  it("allows ten attachments per question and rejects the eleventh", () => {
    const doc = answered();
    doc.evidence = Array.from({ length: 10 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      questionId: "09.02",
      caption: "",
      location: "",
    }));
    expect(validateDocument(doc, TEMPLATE).evidence).toHaveLength(10);
    doc.evidence.push({
      id: "00000000-0000-4000-8000-000000000010",
      questionId: "09.02",
      caption: "PDF counts towards the same limit",
      location: "",
    });
    expect(() => validateDocument(doc, TEMPLATE)).toThrow(
      "10 attachments per question",
    );
    doc.evidence[10].questionId = "15.02";
    expect(validateDocument(doc, TEMPLATE).evidence).toHaveLength(11);
  });
  it("matches the reviewed public question contract", () => {
    const contract = JSON.parse(readFileSync("docs/audit-studio/question-contract-v3.json", "utf8"));
    expect(TEMPLATE.sections.map(s => ({page:s.page, evidence:s.evidence, checks:s.checks}))).toEqual(contract);
    expect(TEMPLATE.sections).toHaveLength(17);
    expect(contract.flatMap((s: {checks: unknown[]}) => s.checks)).toHaveLength(57);
  });
  it.skipIf(!existsSync("docs/audit-studio/SafetyCulture-Audit-Update.docx"))("matches every question, weight and evidence example in the private Word update", async () => {
    const zip = await JSZip.loadAsync(
      readFileSync("docs/audit-studio/SafetyCulture-Audit-Update.docx"),
    );
    const xml = await zip.file("word/document.xml")!.async("string");
    const plain = xml
      .replace(/<[^>]*>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, " ");
    expect(TEMPLATE.sections).toHaveLength(17);
    const qs = TEMPLATE.sections.flatMap((s) => s.checks);
    expect(qs).toHaveLength(57);
    expect(qs.reduce((n, q) => n + q.weight, 0)).toBe(112);
    expect(new Set(qs.map((q) => q.id)).size).toBe(57);
    for (const section of TEMPLATE.sections) {
      expect(plain).toContain(section.evidence);
      for (const q of section.checks)
        expect(plain).toContain(`${q.question} ${q.weight}`);
    }
  });

  it("all Yes earns 112/112, 100% and Pass", () =>
    expect(scoreAudit(TEMPLATE, answered())).toMatchObject({
      percentage: 100,
      outcome: "Pass",
      earned: 112,
      applicable: 112,
    }));
  it("a propped door loses four points and passes", () => {
    const doc = answered();
    doc.responses["15.02"].answer = "no";
    expect(scoreAudit(TEMPLATE, doc)).toMatchObject({
      percentage: 108 / 112 * 100,
      outcome: "Pass",
    });
  });
  it("a failed 5-point storage check passes with recommendations", () => {
    const doc = answered();
    doc.responses["09.02"].answer = "no";
    const score = scoreAudit(TEMPLATE, doc);
    expect(score).toMatchObject({
      percentage: 107 / 112 * 100,
      outcome: "Pass with recommendations",
    });
    expect(score.sections.find((s) => s.page === 9)?.percentage).toBeCloseTo(
      58.3333,
    );
  });
  it("excludes N/A from denominator but keeps unanswered separate", () => {
    const doc = answered();
    doc.responses["15.02"].answer = "na";
    expect(scoreAudit(TEMPLATE, doc)).toMatchObject({
      percentage: 100,
      applicable: 108,
      outcome: "Pass",
    });
    doc.responses["15.02"].answer = null;
    expect(scoreAudit(TEMPLATE, doc)).toMatchObject({
      percentage: 108 / 112 * 100,
      applicable: 112,
      outcome: "Pending",
    });
  });
  it("blocked required escape route is Fail despite a high percentage", () => {
    const doc = answered();
    doc.responses["15.01"].answer = "no";
    expect(scoreAudit(TEMPLATE, doc)).toMatchObject({
      percentage: 107 / 112 * 100,
      outcome: "Fail",
    });
  });
  it("an overall score below 80 fails even when safety verification is pending", () => {
    const doc = answered();
    for (const q of TEMPLATE.sections[14].checks)
      doc.responses[q.id] = {
        ...emptyResponse(),
        answer: "no",
        verified: false,
      };
    expect(scoreAudit(TEMPLATE, doc)).toMatchObject({
      percentage: 87 / 112 * 100,
      outcome: "Fail",
    });
    doc.responses["09.02"].answer = "no";
    expect(scoreAudit(TEMPLATE, doc).outcome).toBe("Fail");
  });
  it("unverified electrical maintenance is Pending", () => {
    const doc = answered();
    doc.responses["07.02"] = {
      ...emptyResponse(),
      answer: "no",
      verified: false,
    };
    expect(scoreAudit(TEMPLATE, doc).outcome).toBe("Pending");
  });
  it("pending safety verification takes priority over section recommendations at 80 or above", () => {
    const doc = answered();
    doc.responses["09.02"].answer = "no";
    doc.responses["07.02"] = {
      ...emptyResponse(),
      answer: "no",
      verified: false,
    };
    expect(scoreAudit(TEMPLATE, doc).outcome).toBe("Pending");
  });
  it.each([80, 79])(
    "uses the exact overall 80 threshold for %s percent",
    (earned) => {
      const template = {
        ...TEMPLATE,
        sections: [
          {
            ...TEMPLATE.sections[3],
            checks: [{ id: "A", question: "A", weight: earned }],
          },
          {
            ...TEMPLATE.sections[8],
            checks: [{ id: "B", question: "B", weight: 100 - earned }],
          },
        ],
      };
      const doc = emptyDocument();
      doc.responses.A = { ...emptyResponse(), answer: "yes" };
      doc.responses.B = { ...emptyResponse(), answer: "no" };
      expect(scoreAudit(template, doc).outcome).toBe(
        earned === 80 ? "Pass with recommendations" : "Fail",
      );
    },
  );
  it("explicit verified serious danger overrides percentage", () => {
    const doc = answered();
    doc.responses["11.01"] = {
      ...emptyResponse(),
      answer: "no",
      danger: true,
      dangerReason: "Test serious danger",
    };
    expect(scoreAudit(TEMPLATE, doc).outcome).toBe("Fail");
  });
  it("compares 79.999 before rounding to 80.00", () => {
    const template = {
      ...TEMPLATE,
      sections: [
        {
          ...TEMPLATE.sections[3],
          checks: [
            { id: "A", question: "A", weight: 79999 },
            { id: "B", question: "B", weight: 20001 },
          ],
        },
      ],
    };
    const doc = emptyDocument();
    doc.responses.A = { ...emptyResponse(), answer: "yes" };
    doc.responses.B = { ...emptyResponse(), answer: "no" };
    expect(scoreAudit(template, doc).outcome).toBe("Fail");
  });
  it("requires follow-up and auditor signature while recommending N/A explanations", () => {
    const doc = answered();
    doc.responses["09.02"].answer = "no";
    doc.responses["15.02"].answer = "na";
    const issues = completionIssues(TEMPLATE, doc);
    expect(
      issues.some(
        (i) => i.questionId === "09.02" && i.message.includes("owner"),
      ),
    ).toBe(true);
    expect(issues.some((i) => i.questionId === "15.02")).toBe(false);
    expect(completionRecommendations(TEMPLATE, doc).some(i => i.questionId === "15.02")).toBe(true);
    expect(issues.some((i) => i.questionId === "sign-off")).toBe(true);
  });
  it("rejects unknown template questions and invalid dates without throwing RangeError", () => {
    const doc = answered();
    doc.responses["999"] = emptyResponse();
    expect(() => validateDocument(doc, TEMPLATE)).toThrow("template");
    delete doc.responses["999"];
    doc.site.visitDate = "2026-99-99";
    expect(() => validateDocument(doc, TEMPLATE)).toThrow("Use a valid date");
  });
});
