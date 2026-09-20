"use client";
import { GrowingTextarea } from "./growing-textarea";
import { clientId } from "@/lib/audit-studio/client-id";

import { useEffect, useState } from "react";
import { Bug, Copy, Download, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { exportTestingNotes, readTestingNotebook, type TestingNote, type TestingNotebook } from "@/lib/audit-studio/testing-notes";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base md:text-sm font-semibold hover:bg-slate-50 disabled:opacity-50";
const input = "mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700";

export function TestingNotes({ userId, context }: { userId: string; context: string }) {
  const key = `audit-studio:testing-notes:v1:${userId}`;
  const [open, setOpen] = useState(false);
  const [book, setBook] = useState<TestingNotebook>({ notes: [], draft: null });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  useEffect(() => {
    setReady(false);
    setBook({ notes: [], draft: null });
    try {
      setBook(readTestingNotebook(localStorage.getItem(key)));
      setReady(true);
      setError("");
    } catch {
      setError("Saved notes could not be loaded. Allow browser storage and reopen this page; existing notes have not been overwritten.");
    }
  }, [key]);

  function save(next: TestingNotebook) {
    setBook(next);
    setMessage("");
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setError("");
    } catch {
      setError("These changes could not be saved on this device. Copy or download your notes before leaving.");
    }
  }
  function start() {
    save({ ...book, draft: {
      id: clientId(), createdAt: new Date().toISOString(), title: "", details: "", expected: "",
      severity: "normal", resolved: false, context,
      path: window.location.pathname + window.location.search,
      device: `${window.innerWidth} × ${window.innerHeight} · ${navigator.userAgent}`,
    } });
  }
  function change(patch: Partial<TestingNote>) {
    if (book.draft) save({ ...book, draft: { ...book.draft, ...patch } });
  }
  const outputNotes = book.draft ? [...book.notes.filter(n => n.id !== book.draft?.id), book.draft] : book.notes;
  const text = exportTestingNotes(outputNotes);
  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-studio-bugs-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Download started.");
  }
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild><button className={button}><Bug size={17} aria-hidden="true" />Testing notes{book.notes.length > 0 && <span className="rounded-full bg-amber-100 px-2 text-xs text-amber-900">{book.notes.filter(n => !n.resolved).length}</span>}</button></SheetTrigger>
    <SheetContent className="flex h-dvh flex-col bg-[#f5f6f1] text-[#17291f] sm:w-[560px]">
      <header className="border-b border-slate-200 p-5 pr-14 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <SheetTitle>Audit Studio testing notes</SheetTitle>
        <SheetDescription className="mt-2 leading-6">Record bugs as you test. Notes stay on this device and are separate from the audit and its PDF. Download or copy them to share.</SheetDescription>
      </header>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button className={button} disabled={!ready || !!book.draft} onClick={start}><Plus size={16} />New bug note</button>
          <button className={button} disabled={!outputNotes.length} onClick={download}><Download size={16} />Download</button>
          <button className={button} disabled={!outputNotes.length} onClick={async () => {
            try { await navigator.clipboard.writeText(text); setMessage("Notes copied. Paste them into our chat."); }
            catch { setMessage("Copy was unavailable. Use Download instead."); }
          }}><Copy size={16} />Copy all</button>
        </div>
        {confirmDelete && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
          <p>{confirmDelete === "draft" ? "Discard the unfinished draft?" : "Delete this bug note? Download it first if you need a copy."}</p>
          <div className="mt-2 flex gap-2"><button className={button} onClick={() => {
            save(confirmDelete === "draft" ? { ...book, draft: null } : { ...book, notes: book.notes.filter(n => n.id !== confirmDelete) });
            setConfirmDelete(null);
          }}>Confirm removal</button><button className={button} onClick={() => setConfirmDelete(null)}>Keep note</button></div>
        </div>}
        <p role="status" className="text-sm text-emerald-800">{message}</p>
        {book.draft && <form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={e => {
          e.preventDefault();
          if (!book.draft?.title.trim() || !book.draft.details.trim()) return;
          save({ notes: [book.draft, ...book.notes.filter(n => n.id !== book.draft?.id)], draft: null });
          setMessage("Bug note added.");
        }}>
          <p className="break-words text-xs text-slate-600">{book.draft.context}<br />{book.draft.device.split(" · ")[0]} · {error ? "Not saved — export before leaving" : "Draft saved as you type"}</p>
          <label className="block text-sm font-semibold">Short title<input className={input} required maxLength={160} value={book.draft.title} onChange={e => change({ title: e.target.value })} placeholder="e.g. Camera button hidden on mobile" /></label>
          <label className="block text-sm font-semibold">What happened / how to reproduce<GrowingTextarea className={input} required rows={4} maxLength={10000} value={book.draft.details} onChange={e => change({ details: e.target.value })} placeholder="What did you tap or do, and what went wrong?" /></label>
          <label className="block text-sm font-semibold">What should happen? (optional)<GrowingTextarea className={input} rows={2} maxLength={10000} value={book.draft.expected} onChange={e => change({ expected: e.target.value })} /></label>
          <label className="block text-sm font-semibold">Priority<select className={input} value={book.draft.severity} onChange={e => change({ severity: e.target.value as TestingNote["severity"] })}><option value="minor">Minor — appearance or wording</option><option value="normal">Normal — something is not working</option><option value="blocking">Blocking — cannot continue the audit</option></select></label>
          <div className="flex flex-wrap gap-2"><button type="submit" className={`${button} !bg-[#1c3426] !text-white`}>Save bug note</button><button type="button" className={button} onClick={() => setConfirmDelete("draft")}>Discard draft</button></div>
        </form>}
        {!book.notes.length && !book.draft && <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm leading-6 text-slate-600">No bugs recorded yet. Add a note when something does not work as expected. The current audit page and device details are included automatically.</div>}
        {book.notes.map(note => <article key={note.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3"><h3 className="break-words font-semibold">{note.title}</h3><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs">{note.resolved ? "Resolved" : note.severity}</span></div>
          <p className="break-words text-xs text-slate-500">{note.context} · {new Date(note.createdAt).toLocaleString("en-GB")}</p>
          <p className="whitespace-pre-wrap break-words text-sm">{note.details}</p>
          {note.expected && <p className="whitespace-pre-wrap break-words text-sm text-slate-600"><strong>Expected: </strong>{note.expected}</p>}
          <div className="flex flex-wrap gap-2"><button className={button} disabled={!!book.draft || !ready} onClick={() => save({ ...book, draft: { ...note } })}>Edit</button><button className={button} disabled={!ready || book.draft?.id === note.id} onClick={() => save({ ...book, notes: book.notes.map(n => n.id === note.id ? { ...n, resolved: !n.resolved } : n) })}>{note.resolved ? "Reopen" : "Mark resolved"}</button><button className={button} disabled={!ready || book.draft?.id === note.id} onClick={() => setConfirmDelete(note.id)}>Delete</button></div>
        </article>)}
      </div>
    </SheetContent>
  </Sheet>;
}
