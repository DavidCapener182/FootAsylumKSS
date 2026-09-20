import { z } from "zod";

export const testingNoteSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  title: z.string(),
  details: z.string(),
  expected: z.string(),
  severity: z.enum(["minor", "normal", "blocking"]),
  resolved: z.boolean(),
  context: z.string(),
  path: z.string(),
  device: z.string(),
});
export type TestingNote = z.infer<typeof testingNoteSchema>;
export const testingNotebookSchema = z.object({
  notes: z.array(testingNoteSchema),
  draft: testingNoteSchema.nullable(),
});
export type TestingNotebook = z.infer<typeof testingNotebookSchema>;
export function readTestingNotebook(value: string | null): TestingNotebook {
  return value ? testingNotebookSchema.parse(JSON.parse(value)) : { notes: [], draft: null };
}
export function exportTestingNotes(notes: TestingNote[]): string {
  return ["# Audit Studio — testing notes", ...notes.map((note, i) => [
    `## ${i + 1}. ${note.title || "Untitled note"}`,
    `Status: ${note.resolved ? "Resolved" : "Open"} · Priority: ${note.severity}`,
    `Recorded: ${note.createdAt}`,
    `Page: ${note.context}`,
    `Location: ${note.path}`,
    `Device: ${note.device}`,
    "### What happened / steps to reproduce", note.details || "Not recorded",
    "### Expected behaviour", note.expected || "Not recorded",
  ].join("\n\n"))].join("\n\n");
}
