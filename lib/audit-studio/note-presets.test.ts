import { describe, it, expect } from "vitest";
import { TEMPLATE } from "./template";
import {
  NOTE_PRESETS,
  presetDate,
  previouslySelectedNotes,
  renderPreset,
  toggleNote,
} from "./note-presets";

describe("Auditor-selected note suggestions", () => {
  it("covers every template question with both Yes and No choices", () => {
    expect(Object.keys(NOTE_PRESETS).sort()).toEqual(
      TEMPLATE.sections.flatMap((s) => s.checks.map((q) => q.id)).sort(),
    );
    for (const options of Object.values(NOTE_PRESETS)) {
      expect(options.yes.length).toBeGreaterThanOrEqual(2);
      expect(options.no.length).toBeGreaterThanOrEqual(2);
    }
  });
  it("adds once and removes only the exact suggestion, preserving auditor text", () => {
    const original =
      "Checked rear office.\n\nAuditor's additional observation.";
    const text = NOTE_PRESETS["04.01"].yes[0].text;
    const added = toggleNote(original, text, true);
    expect(added).toBe(`${original}\n${text}`);
    expect(toggleNote(added, text, true)).toBe(added);
    expect(toggleNote(added, text, false)).toBe(original);
    const edited = added.replace(
      text,
      `${text} Located beside the staff entrance.`,
    );
    expect(toggleNote(edited, text, false)).toBe(edited);
  });
  it("requires an entered date and restores it from saved notes", () => {
    const preset = NOTE_PRESETS["04.02"].yes[0];
    expect(renderPreset(preset)).toBe("");
    expect(toggleNote("Auditor notes", renderPreset(preset), true)).toBe(
      "Auditor notes",
    );
    const line = renderPreset(preset, "2026-09-19");
    expect(line).toBe(
      "Yes - The H&S policy is signed by the Chief Financial Officer on 2026-09-19.",
    );
    expect(presetDate(preset, `Other notes\n${line}`)).toBe("2026-09-19");
  });
  it("keeps older selected wording removable without altering an auditor's note", () => {
    const old =
      "Yes - The staff sampled explained the controls for the two selected risks.";
    const notes = `Asked the stockroom colleague.\n${old}`;
    const saved = previouslySelectedNotes("05.02", "yes", notes);
    expect(saved.map((p) => p.text)).toEqual([old]);
    expect(previouslySelectedNotes("05.02", "no", notes)).toEqual([]);
    expect(toggleNote(notes, saved[0].text, false)).toBe(
      "Asked the stockroom colleague.",
    );
    expect(
      previouslySelectedNotes(
        "05.02",
        "yes",
        `${notes} Auditor edited this sentence.`,
      ),
    ).toEqual([]);
    expect(
      previouslySelectedNotes(
        "04.01",
        "yes",
        NOTE_PRESETS["04.01"].yes[0].text,
      ),
    ).toEqual([]);
  });
});
