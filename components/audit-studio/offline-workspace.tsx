"use client";
import { useEffect, useState } from "react";
import { AuditStudioWorkspace } from "./workspace";
export function OfflineAuditStudio({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (
      window.location.pathname.startsWith("/audit-studio") ||
      new URLSearchParams(window.location.search).has("studio")
    )
      setOpen(true);
  }, []);
  return open ? (
    <AuditStudioWorkspace offline />
  ) : (
    <>
      <div className="mx-auto max-w-md p-5">
        <button
          className="min-h-12 w-full rounded-xl bg-white p-4 text-sm font-bold text-[#17291f]"
          onClick={() => setOpen(true)}
        >
          Open prepared Audit Studio drafts
        </button>
      </div>
      {children}
    </>
  );
}
