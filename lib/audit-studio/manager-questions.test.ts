import { describe, it, expect } from "vitest";
import { emptyDocument, emptyResponse, TEMPLATE } from "./template";
import { validateDocument } from "./validation";
import { changesBetween } from "./conflicts";
import { managerReferences, managerReferenceNotes } from "./manager-questions";
import { scoreAudit } from "./scoring";

describe("Manager Q&A and independent staff checks", () => {
  it("saves the manager's arrangements without supplying staff answers or changing the score", () => {
    const doc = emptyDocument();
    doc.responses["06.03"] = emptyResponse();
    const before = scoreAudit(TEMPLATE, doc);
    Object.assign(doc.site, {
      managerName: "Example manager",
      assemblyPoint: "MOCK: sign A beside the far car park gate",
      assemblyPointEvidence: "MOCK: checked against the fire action notice",
      evacuationProcedure: "MOCK: leave by a safe exit and account for staff",
      firstAidArrangements: "MOCK: contact the duty first aider",
    });
    const saved = validateDocument(JSON.parse(JSON.stringify(doc)), TEMPLATE);
    expect(saved.site.assemblyPoint).toBe(doc.site.assemblyPoint);
    expect(saved.responses["06.03"]).toEqual(emptyResponse());
    expect(scoreAudit(TEMPLATE, saved)).toEqual(before);
    expect(managerReferences(saved.site, "06.03").find((q) => q.key === "assemblyPoint")?.answer).toBe(doc.site.assemblyPoint);
    expect(managerReferences(saved.site, "13.02").find((q) => q.key === "firstAidArrangements")?.answer).toContain("duty first aider");
    expect(managerReferences(saved.site, "07.01")).toEqual([]);
    expect(managerReferenceNotes(saved.site, "06.03")).toContain("not proof of staff understanding");
  });

  it("keeps older audits readable and detects newly added answers from another device", () => {
    const local = emptyDocument();
    expect(validateDocument(local, TEMPLATE).site.assemblyPoint).toBeUndefined();
    expect(managerReferenceNotes(local.site, "06.03")).toBe("");
    const online = structuredClone(local);
    online.site.assemblyPoint = "Alternative assembly point";
    const differences = changesBetween(local, online, TEMPLATE);
    expect(differences).toHaveLength(1);
    expect(differences[0].online).toBe("Alternative assembly point");
    expect(differences[0].local).toBe("Not recorded");
    expect(changesBetween(online, local, TEMPLATE)).toHaveLength(1);
  });
});
