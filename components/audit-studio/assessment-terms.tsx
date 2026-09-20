"use client";

import dynamic from "next/dynamic";
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";

const PdfViewer = dynamic(() => import("@/components/fra/saved-fra-pdf-viewer").then(m => m.SavedFraPdfViewer), { ssr: false, loading: () => <p role="status">Loading PDF…</p> });

export function AssessmentTerms() {
  return <Sheet>
    <SheetTrigger asChild>
      <button type="button" className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-left text-sm font-semibold text-emerald-800 hover:bg-slate-50">
        View assessment terms and improvement cycle (PDF)
      </button>
    </SheetTrigger>
    <SheetContent className="overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:w-[760px] sm:max-w-[90vw]">
      <SheetTitle className="pr-12">Assessment terms and improvement cycle</SheetTitle>
      <SheetDescription className="my-3">Read the document here, then return to your audit.</SheetDescription>
      <SheetClose asChild><button type="button" className="mb-4 min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold">Back to audit</button></SheetClose>
      <PdfViewer url="/api/audit-studio/reference/introduction" label="Assessment terms PDF" />
    </SheetContent>
  </Sheet>;
}
