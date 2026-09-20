import { describe, expect, it } from "vitest";
import { emptyDocument, emptyResponse, TEMPLATE } from "./template";
import { validateDocument } from "./validation";
import { changesBetween } from "./conflicts";
import { responseNotes } from "./practical-checks";

describe("Practical check observations", () => {
  it("preserves observations through validation and JSON storage without changing notes or answers", () => {
    const doc = emptyDocument();
    doc.responses["06.03"] = {
      ...emptyResponse(),
      answer: "no",
      note: "Refresher needed.",
      practicalCheck: {
        checked:
          "Asked two sales assistants where to assemble after evacuation.",
        outcome: "One identified the assembly point; one was unsure.",
      },
    };
    const saved = validateDocument(JSON.parse(JSON.stringify(doc)), TEMPLATE);
    expect(saved.responses["06.03"]).toEqual(doc.responses["06.03"]);
    expect(responseNotes(saved.responses["06.03"])).toBe(
      "What was checked: Asked two sales assistants where to assemble after evacuation.\n\nOutcome: One identified the assembly point; one was unsure.\n\nRefresher needed.",
    );
    const online = structuredClone(saved);
    online.responses["06.03"].practicalCheck!.outcome = "Both were unsure.";
    const conflict = changesBetween(saved, online, TEMPLATE);
    expect(conflict).toHaveLength(1);
    expect(conflict[0].online).toContain("Outcome: Both were unsure.");
    expect(conflict[0].local).toContain("one was unsure.");
  });

  it("continues to load earlier responses without practical fields", () => {
    const doc = emptyDocument();
    doc.responses["06.03"] = { ...emptyResponse(), note: "Existing note" };
    const saved = validateDocument(doc, TEMPLATE);
    expect(responseNotes(saved.responses["06.03"])).toBe("Existing note");
  });
});
