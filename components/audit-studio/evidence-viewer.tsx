"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
const PdfViewer = dynamic(() => import("@/components/fra/saved-fra-pdf-viewer").then(m => m.SavedFraPdfViewer), {ssr: false});

export function EvidenceViewer({open, onOpenChange, url, file, label, title = "Audit evidence", downloadName, actions}: {
  open: boolean; onOpenChange: (open: boolean) => void; url: string; file?: Blob; label: string; title?: string; downloadName?: string; actions?: ReactNode;
}) {
  const [media, setMedia] = useState<{url: string; pdf: boolean} | null>(null);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let objectUrl = "";
    setMedia(null); setError(""); setZoom(false);
    void (async () => {
      try {
        const response = file ? null : await fetch(url, {signal: controller.signal});
        if (response && !response.ok) throw new Error("Unable to load this attachment. Close and try again.");
        const blob = file || await response!.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setMedia({url: objectUrl, pdf: blob.type === "application/pdf"});
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load attachment."); }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [open, url, file]);
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="flex flex-col bg-white pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:w-[900px] sm:max-w-[95vw]">
      <header className="shrink-0 border-b p-4 pr-14"><SheetTitle>{title}</SheetTitle><SheetDescription className="mt-2 break-words">{label}</SheetDescription></header>
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain bg-slate-100 p-3">
        {error ? <p role="alert">{error}</p> : !media ? <p role="status">Loading attachment…</p> : media.pdf ? <PdfViewer url={media.url} label={label} /> : <button type="button" className="block min-h-full min-w-full" aria-label={zoom ? "Fit photo to screen" : "Enlarge photo"} onClick={() => setZoom(v => !v)}><img src={media.url} alt={label} onError={() => setError("This image format cannot be previewed on this device. The attachment is still saved.")} className={zoom ? "max-w-none" : "mx-auto max-h-[65dvh] max-w-full object-contain"} /></button>}
      </div>
      <footer className="shrink-0 space-y-2 border-t p-3">{downloadName && media && <a href={media.url} download={downloadName} className="flex min-h-12 w-full items-center justify-center rounded-lg bg-emerald-900 px-4 font-semibold text-white">Download PDF</a>}{actions}<SheetClose asChild><button type="button" className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 font-semibold">Back to audit</button></SheetClose></footer>
    </SheetContent>
  </Sheet>;
}
