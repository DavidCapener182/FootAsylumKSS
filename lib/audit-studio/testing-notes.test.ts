import { describe, expect, it } from "vitest";
import { exportTestingNotes, readTestingNotebook, type TestingNote } from "./testing-notes";

const note: TestingNote = { id: "a", createdAt: "2026-09-20T12:00:00Z", title: "Camera hidden", details: "Open evidence on a phone.\nCamera is clipped.", expected: "Button remains visible", severity: "normal", resolved: false, context: "Dundee · 10 / COSHH", path: "/audit-studio?audit=123", device: "390 × 844 · Browser" };
describe("testing notebook persistence and handoff", () => {
  it("round trips saved notes and an unfinished draft without dropping context", () => {
    const book = { notes: [note], draft: { ...note, id: "b", details: "unfinished" } };
    expect(readTestingNotebook(JSON.stringify(book))).toEqual(book);
    expect(readTestingNotebook(null)).toEqual({ notes: [], draft: null });
  });
  it("rejects corrupt storage instead of treating saved notes as empty", () => {
    expect(() => readTestingNotebook("broken")).toThrow();
    expect(() => readTestingNotebook('{"notes":[{}],"draft":null}')).toThrow();
  });
  it("exports reproduction, expected result, location, device and resolution", () => {
    const output = exportTestingNotes([{ ...note, resolved: true }]);
    for (const value of [note.title, note.details, note.expected, note.context, note.path, note.device, "Resolved", "normal"]) expect(output).toContain(value);
  });
});
