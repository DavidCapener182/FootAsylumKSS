"use client";
import { useState } from "react";
import {
  NOTE_PRESETS,
  presetDate,
  previouslySelectedNotes,
  renderPreset,
  toggleNote,
  type NotePreset,
} from "@/lib/audit-studio/note-presets";
import type { Answer } from "@/lib/audit-studio/types";

function Option({
  preset,
  notes,
  onChange,
  disabled,
}: {
  preset: NotePreset;
  notes: string;
  onChange: (notes: string) => void;
  disabled: boolean;
}) {
  const [date, setDate] = useState(() => presetDate(preset, notes));
  const currentDate = presetDate(preset, notes) || date;
  const text = renderPreset(preset, currentDate);
  const checked = !!text && notes.split("\n").includes(text);
  const updateDate = (next: string) => {
    if (checked) {
      const replacement = renderPreset(preset, next);
      onChange(
        replacement
          ? notes
              .split("\n")
              .map((line) => (line === text ? replacement : line))
              .join("\n")
          : toggleNote(notes, text, false),
      );
    }
    setDate(next);
  };
  return (
    <div>
      {preset.dateLabel && (
        <label className="mb-1 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
          {preset.dateLabel}
          <input
            aria-label={preset.dateLabel}
            type="date"
            value={currentDate}
            disabled={disabled}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            onInput={(e) => updateDate(e.currentTarget.value)}
            onChange={(e) => updateDate(e.target.value)}
          />
        </label>
      )}
      <label
        className={`flex min-h-11 items-start gap-3 py-2 text-sm leading-6 ${disabled || !text ? "text-slate-500" : "cursor-pointer text-slate-800"}`}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled || !text}
          onChange={(e) => onChange(toggleNote(notes, text, e.target.checked))}
          className="mt-1 h-4 w-4 shrink-0 accent-emerald-700"
        />
        <span>
          {text || preset.text.replace("{date}", "[select date above]")}
        </span>
      </label>
    </div>
  );
}

export function SuggestedNotes({
  version,
  questionId,
  answer,
  notes,
  onChange,
  disabled = false,
}: {
  version: string;
  questionId: string;
  answer: Answer;
  notes: string;
  onChange: (notes: string) => void;
  disabled?: boolean;
}) {
  if (
    version !== "hs-update-2026-09-19-v1" ||
    (answer !== "yes" && answer !== "no")
  )
    return null;
  const options = NOTE_PRESETS[questionId]?.[answer];
  if (!options) return null;
  const savedOptions = previouslySelectedNotes(questionId, answer, notes);
  const opposite = answer === "yes" ? "No - " : "Yes - ";
  return (
    <fieldset className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 pb-2 pt-1">
      <legend className="px-1 text-sm font-semibold">
        Suggested {answer === "yes" ? "Yes" : "No"} notes
      </legend>
      <p className="mb-1 text-xs leading-5 text-slate-500">
        Tick only what you checked or observed. The wording is added to Notes;
        add the staff roles, locations, dates and any further detail from your
        visit.
      </p>
      {notes.split("\n").some((line) => line.startsWith(opposite)) && (
        <p role="status" className="mb-2 text-sm text-amber-800">
          Notes include a {answer === "yes" ? "No" : "Yes"} statement. Review
          the wording against your current answer.
        </p>
      )}
      {options.map((preset) => (
        <Option
          key={`${questionId}:${answer}:${preset.text}`}
          preset={preset}
          notes={notes}
          onChange={onChange}
          disabled={disabled}
        />
      ))}
      {savedOptions.length > 0 && (
        <div className="mt-2 border-t border-slate-200 pt-2">
          <p className="text-xs font-medium text-slate-500">
            Previously selected wording
          </p>
          {savedOptions.map((preset) => (
            <Option
              key={`${questionId}:${answer}:saved:${preset.text}`}
              preset={preset}
              notes={notes}
              onChange={onChange}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
}
