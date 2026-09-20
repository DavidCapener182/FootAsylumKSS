"use client";
import { PreviousActions } from "./previous-actions";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  HelpCircle,
  Download,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  api,
  ApiError,
  syncDraft,
  cacheStoredEvidence,
} from "@/lib/audit-studio/client";
import {
  draftKey,
  getDraft,
  getFiles,
  listDrafts,
  prepareOffline,
  saveDraft,
  saveWithFiles,
} from "@/lib/audit-studio/device-store";
import {
  emptyResponse,
  MAX_EVIDENCE,
  MAX_QUESTION_EVIDENCE,
  MAX_FILE_BYTES,
} from "@/lib/audit-studio/template";
import {
  completionIssues,
  formatScore,
  scoreAudit,
} from "@/lib/audit-studio/scoring";
import type {
  AuditBundle,
  AuditDocument,
  DeviceDraft,
  EvidenceReference,
  LocalEvidence,
  Response as AnswerResponse,
  SiteDetails,
  StudioBootstrap,
} from "@/lib/audit-studio/types";
import { changesBetween } from "@/lib/audit-studio/conflicts";
import { makePreview } from "@/lib/audit-studio/preview";
import { StaffInterviews } from "./staff-interviews";
import { staffDeduction, questionEarned, effectiveResponse, hasInterviewGap, interviewNotes, isInterviewDerived, interviewEntries, withCurrentInterviewScoring } from "@/lib/audit-studio/staff-interviews";
import { Signature } from "./signature";
import { questionNotesHint } from "@/lib/audit-studio/question-guidance";
import { SuggestedNotes } from "./suggested-notes";
import { practicalCheckPrompts } from "@/lib/audit-studio/practical-checks";
import { MANAGER_QUESTION_GROUPS, managerReferences } from "@/lib/audit-studio/manager-questions";

const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const primary = `${button} !border-[#1c3426] !bg-[#1c3426] !text-white hover:!bg-[#2d503a]`;
const input =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15 disabled:bg-slate-100";
const panel = "rounded-xl border border-slate-200 bg-white p-4 md:p-6";
const textError = (e: unknown) =>
  e instanceof Error
    ? e.message
    : "Something went wrong. Retry without closing this page.";
type Props = { initial?: StudioBootstrap; offline?: boolean };
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[#a9bc91] bg-[#edf3e5] px-3 py-1 text-xs font-bold text-[#304627]">
      {children}
    </span>
  );
}
function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
  disabled = false,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  multiline?: boolean;
  type?: string;
  disabled?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  const fieldId = useId();
  return (
    <div className="block space-y-1.5 text-sm font-medium">
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <label htmlFor={fieldId}>{label}</label>
        {hint && (
          <details className="relative">
            <summary
              title={hint}
              className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded px-1 text-xs font-medium text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 [&::-webkit-details-marker]:hidden"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
              What to record
            </summary>
            <p
              id={`${fieldId}-hint`}
              className="absolute right-0 z-20 w-72 max-w-[75vw] rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-normal leading-6 text-slate-800 shadow-lg"
            >
              {hint} Photos are optional.
            </p>
          </details>
        )}
      </div>
      {multiline ? (
        <textarea
          id={fieldId}
          aria-describedby={hint ? `${fieldId}-hint` : undefined}
          placeholder={placeholder || hint}
          className={input}
          rows={3}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={fieldId}
          className={input}
          type={type}
          value={value}
          disabled={disabled}
          onInput={(e) => {
            if (type === "date") onChange(e.currentTarget.value);
          }}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export function AuditStudioWorkspace({ initial, offline = false }: Props) {
  const [data, setData] = useState(initial),
    [loading, setLoading] = useState(!initial),
    [error, setError] = useState(""),
    [deviceDrafts, setDeviceDrafts] = useState<DeviceDraft[]>([]);
  const [active, setActive] = useState<DeviceDraft | null>(null),
    [creating, setCreating] = useState(true),
    [storeId, setStoreId] = useState(""),
    [purpose, setPurpose] = useState<"store" | "practice">("store"),
    [visitDate, setVisitDate] = useState(() =>
      new Date().toLocaleDateString("en-CA"),
    ),
    [search, setSearch] = useState(""),
    [tab, setTab] = useState<"draft" | "completed">("draft"),
    [busy, setBusy] = useState(false);
  const [auditor, setAuditor] = useState(initial?.user.name || ""),
    [address, setAddress] = useState("");
  const userId = useRef(initial?.user.id || "");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let bootstrap = initial;
        if (!bootstrap) {
          try {
            bootstrap = await api<StudioBootstrap>("bootstrap");
          } catch (e) {
            if (e instanceof ApiError || (!offline && navigator.onLine))
              throw e;
          }
        }
        if (!bootstrap) {
          const {
            data: { session },
          } = await createClient().auth.getSession();
          if (!session)
            throw new Error(
              "Sign in online once before opening prepared audits on this device.",
            );
          userId.current = session.user.id;
        } else userId.current = bootstrap.user.id;
        const drafts = await listDrafts(userId.current);
        if (!cancelled) {
          setData(bootstrap);
          if (bootstrap) setAuditor(bootstrap.user.name);
          setDeviceDrafts(drafts);
          const id = new URLSearchParams(window.location.search).get("audit");
          if (id) {
            let d = drafts.find((d) => d.bundle.audit.id === id);
            if (bootstrap && (!d || d.generation === d.syncedGeneration)) {
              const latest = await api<AuditBundle>(`audits/${id}`);
              d = {
                key: draftKey(userId.current, id),
                userId: userId.current,
                bundle: latest,
                document: latest.audit.document,
                baseRevision: latest.audit.revision,
                generation: 0,
                syncedGeneration: 0,
                operationId: crypto.randomUUID(),
                updatedAt: new Date().toISOString(),
              };
              await saveDraft(d);
            }
            if (d && !cancelled) setActive(d);
          }
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(textError(e));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial, offline]);
  useEffect(() => {
    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange((event, session) => {
      if (
        event === "SIGNED_OUT" ||
        (session && userId.current && session.user.id !== userId.current)
      ) {
        setActive(null);
        setDeviceDrafts([]);
        setData(undefined);
        setError("Sign in with the account that prepared this audit.");
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const refresh = async () => {
    setDeviceDrafts(await listDrafts(userId.current));
    if (navigator.onLine && !offline)
      setData(await api<StudioBootstrap>("bootstrap"));
  };
  const open = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      const local = await getDraft(userId.current, id);
      if (local && local.generation !== local.syncedGeneration) {
        setActive(local);
        window.history.replaceState(null, "", `?audit=${id}`);
        return;
      }
      let b: AuditBundle;
      try {
        b = await api<AuditBundle>(`audits/${id}`);
      } catch (e) {
        if (local && !(e instanceof ApiError)) {
          setActive(local);
          return;
        }
        throw e;
      }
      const draft: DeviceDraft = {
        key: draftKey(userId.current, id),
        userId: userId.current,
        bundle: b,
        document: b.audit.document,
        baseRevision: b.audit.revision,
        generation: 0,
        syncedGeneration: 0,
        operationId: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
      };
      await saveDraft(draft);
      setActive(draft);
      window.history.replaceState(null, "", `?audit=${id}`);
    } catch (e) {
      setError(textError(e));
    } finally {
      setBusy(false);
    }
  };
  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const b = await api<AuditBundle>("audits", "POST", {
        id: crypto.randomUUID(),
        storeId,
        purpose,
        visitDate,
        auditor,
        address,
      });
      setCreating(false);
      await open(b.audit.id);
    } catch (e) {
      setError(textError(e));
    } finally {
      setBusy(false);
    }
  };
  if (active)
    return (
      <AuditEditor
        key={active.key}
        initial={active}
        fromOfflineShell={offline}
        onBack={async () => {
          setActive(null);
          window.history.replaceState(null, "", window.location.pathname);
          try {
            await refresh();
          } catch (e) {
            setError(textError(e));
          }
        }}
        onRevision={open}
      />
    );
  const combined = new Map((data?.audits || []).map((a) => [a.id, a]));
  for (const d of deviceDrafts)
    combined.set(d.bundle.audit.id, {
      ...d.bundle.audit,
      document: d.document,
    });
  const audits = [...combined.values()].filter(
    (a) =>
      (tab === "completed"
        ? a.status === "completed"
        : a.status !== "completed") &&
      `${a.document.site.storeName} ${a.document.site.storeCode} ${a.document.site.visitDate}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="min-h-full bg-[#f5f6f1] p-4 text-[#17291f] md:p-8 lg:p-10">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[#17291f]/15 pb-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em]">
            Assurance / Admin workspace
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl font-bold md:text-6xl">
            Audit Studio
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Work through the store. Record what you find. Keep the evidence with
            each answer.
          </p>
        </div>
        <button
          className={primary}
          disabled={loading || busy || offline || !data}
          onClick={() => setCreating(true)}
        >
          <Plus size={18} />
          Start audit
        </button>
      </header>
      <div className="my-5 flex flex-wrap items-center gap-3">
        <Badge>Audit Studio</Badge>
        <p className="text-sm text-slate-600">
          Save your work as you go. Complete the report, then save it to the store when ready.
        </p>
        {offline && (
          <span className="flex items-center gap-2 text-sm">
            <WifiOff size={16} />
            Prepared audits on this device
          </span>
        )}
      </div>
      {error && (
        <div
          role="alert"
          className="my-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}
      <div className="mb-8 grid grid-cols-3 border-y border-slate-200 py-5">
        {[
          [data?.template.sections.length ?? "—", "Sections"],
          [data?.template.sections.reduce((n, s) => n + s.checks.length, 0) ?? "—", "Scored checks"],
          ["100%", "Maximum result"],
        ].map(([n, l]) => (
          <div key={l}>
            <p className="text-3xl font-bold">{n}</p>
            <p className="mt-1 text-xs text-slate-500 md:text-sm">{l}</p>
          </div>
        ))}
      </div>
      {creating && (
        <section className={`${panel} mb-6`}>
          <h2 className="text-xl font-bold">Start an audit</h2>
          <p className="mb-4 mt-2 text-sm text-slate-600">
            Select the store, then check the auditor, visit date and address
            before starting.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">
              Store
              <select
                className={input}
                value={storeId}
                onChange={(e) => {
                  setStoreId(e.target.value);
                  setAddress(
                    data?.stores.find((s) => s.id === e.target.value)
                      ?.address || "",
                  );
                }}
              >
                <option value="">Select a store</option>
                {data?.stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.store_name} · {s.store_code}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium">Audit type
              <select className={input} value={purpose} onChange={e=>setPurpose(e.target.value as "store" | "practice")}>
                <option value="store">Store audit</option><option value="practice">Practice audit</option>
              </select>
            </label>
            <Field label="Auditor name" value={auditor} onChange={setAuditor} />
            <Field
              label="Visit date"
              type="date"
              value={visitDate}
              onChange={setVisitDate}
            />
            <Field
              label="Store address"
              value={address}
              onChange={setAddress}
            />
          </div>
          <div className="mt-5 flex gap-3">
            <button
              className={primary}
              disabled={
                !storeId ||
                !visitDate ||
                !auditor.trim() ||
                !address.trim() ||
                busy
              }
              onClick={start}
            >
              {busy ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Plus size={16} />
              )}
              Start audit
            </button>
            <button className={button} onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </section>
      )}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1 rounded-lg bg-slate-200/70 p-1">
            {(["draft", "completed"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`min-h-10 rounded-md px-4 text-sm font-semibold ${tab === t ? "bg-white shadow-sm" : "text-slate-600"}`}
              >
                {t === "draft" ? "Drafts" : "Completed"}
              </button>
            ))}
          </div>
          <input
            aria-label="Search store or visit date"
            className={`${input} max-w-sm`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search store or visit date…"
          />
        </div>
        {loading ? (
          <p className="p-10 text-sm">Loading your workspace…</p>
        ) : audits.length ? (
          <div className="space-y-3">
            {audits.map((a) => {
              const local = deviceDrafts.find(
                (d) => d.bundle.audit.id === a.id,
              );
              const score =
                (local && local.generation !== local.syncedGeneration
                  ? scoreAudit(local.bundle.template, local.document)
                  : a.result) ||
                scoreAudit(
                  data?.template ||
                    deviceDrafts.find((d) => d.bundle.audit.id === a.id)!.bundle
                      .template,
                  a.document,
                );
              return (
                <button
                  key={a.id}
                  className={`${panel} flex w-full items-center justify-between gap-4 text-left hover:border-emerald-700`}
                  onClick={() => open(a.id)}
                  disabled={busy}
                >
                  <div>
                    <h3 className="font-bold">{a.document.site.storeName}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {a.document.site.storeCode} · {a.document.site.visitDate}{" "}
                      · {a.document.site.auditor}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {a.status === "completed"
                        ? "Completed"
                        : `${score.answered} / ${score.total} answered`}
                      {deviceDrafts.some(
                        (d) =>
                          d.bundle.audit.id === a.id &&
                          d.generation !== d.syncedGeneration,
                      )
                        ? " · Changes on this device"
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {formatScore(score.percentage)}
                      </p>
                      <p className="text-xs text-slate-500">{score.outcome}</p>
                    </div>
                    <ChevronRight size={18} />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className={`${panel} py-14 text-center`}>
            <FileText className="mx-auto mb-4 text-slate-400" size={28} />
            <h2 className="text-lg font-semibold">
              {tab === "draft"
                ? "Ready for your first test visit"
                : "No completed audits yet"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {tab === "draft"
                ? "Start with a store, then work through the updated checks."
                : "Finished reports and their evidence will stay here."}
            </p>
          </div>
        )}
      </section>
      <footer className="mt-8 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-5 text-sm">
        <span className="text-slate-500">SafetyCulture update references</span>
        <a
          className="font-semibold underline"
          href="/api/audit-studio/reference/pdf"
        >
          PDF
        </a>
        <a
          className="font-semibold underline"
          href="/api/audit-studio/reference/docx"
        >
          Word document
        </a>
      </footer>
    </div>
  );
}

function AuditEditor({
  initial,
  fromOfflineShell = false,
  onBack,
  onRevision,
}: {
  initial: DeviceDraft;
  fromOfflineShell?: boolean;
  onBack: () => void;
  onRevision: (id: string) => void;
}) {
  const [draft, setDraft] = useState(() => initial.bundle.audit.status === "draft" ? {...initial, document: withCurrentInterviewScoring(initial.document)} : initial),
    current = useRef(draft),
    queue = useRef(Promise.resolve()),
    syncing = useRef(false),
    editorMounted = useRef(true);
  const [section, setSection] = useState(1),
    [filter, setFilter] = useState("all"),
    [status, setStatus] = useState(
      initial.generation === initial.syncedGeneration
        ? "Saved online"
        : "Saved on this device",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [online, setOnline] = useState(true),
    [conflict, setConflict] = useState<AuditBundle | null>(null),
    [files, setFiles] = useState<LocalEvidence[]>([]),
    [uploadProgress, setUploadProgress] = useState(""),
    [prepared, setPrepared] = useState(fromOfflineShell),
    [review, setReview] = useState(false),
    [otherTab, setOtherTab] = useState(false);
  const b = draft.bundle,
    doc = draft.document,
    template = b.template,
    readOnly = b.audit.status !== "draft" || otherTab || busy,
    score =
      b.audit.status === "completed" && b.audit.result
        ? b.audit.result
        : scoreAudit(template, doc),
    issues = completionIssues(template, doc),
    active = template.sections.find((s) => s.page === section)!;
  const persist = useCallback((next: DeviceDraft) => {
    current.current = next;
    setDraft(next);
    setStatus("Saving on this device…");
    queue.current = queue.current
      .catch(() => {})
      .then(() => saveDraft(next))
      .then(() => {
        if (current.current.generation === next.generation)
          setStatus(
            next.generation === next.syncedGeneration
              ? "Saved online"
              : "Saved on this device",
          );
      })
      .catch((e) => {
        setError(textError(e));
        setStatus("Needs attention");
        throw e;
      });
    void queue.current.catch(() => {});
    return queue.current;
  }, []);
  useEffect(() => {
    if (b.audit.status !== "finalizing") return;
    const timer = setInterval(() => {
      void api<AuditBundle>(`audits/${b.audit.id}`)
        .then((result) => {
          if (result.audit.status !== "finalizing")
            void persist({
              ...current.current,
              bundle: result,
              document: result.audit.document,
              baseRevision: result.audit.revision,
            });
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, [b.audit.id, b.audit.status, persist]);
  const update = (change: (d: AuditDocument) => AuditDocument) => {
    if (readOnly) return;
    const prev = current.current;
    void persist({
      ...prev,
      document: change(prev.document),
      generation: prev.generation + 1,
      operationId: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    });
  };
  useEffect(() => {
    let mounted = true;
    editorMounted.current = true;
    getFiles(initial.userId, initial.bundle.audit.id)
      .then((f) => {
        if (mounted) setFiles(f);
      })
      .catch((e) => setError(textError(e)));
    const connectivity = () => {
      setOnline(navigator.onLine);
      if (
        navigator.onLine &&
        current.current.generation !== current.current.syncedGeneration
      )
        setStatus("Saved on this device");
    };
    connectivity();
    window.addEventListener("online", connectivity);
    window.addEventListener("offline", connectivity);
    // Only one editor on this device may write this draft at a time.
    let release: () => void = () => {};
    const lockAbort = new AbortController();
    if (navigator.locks) {
      setOtherTab(true);
      void navigator.locks
        .request(
          `studio-edit:${initial.key}`,
          { signal: lockAbort.signal },
          async () => {
            if (mounted) setOtherTab(false);
            await new Promise<void>((r) => {
              release = r;
              if (!mounted) r();
            });
          },
        )
        .catch((e) => {
          if (e.name !== "AbortError" && mounted)
            setError("The device edit lock is unavailable. Reopen this draft.");
        });
    }

    if (navigator.onLine)
      void prepareOffline()
        .then(() => cacheStoredEvidence(current.current))
        .then((cached) => {
          if (mounted) {
            setFiles(cached);
            setPrepared(true);
          }
        })
        .catch(() => {
          if (mounted && !fromOfflineShell) setPrepared(false);
        });
    const warn = (e: BeforeUnloadEvent) => {
      if (current.current.generation !== current.current.syncedGeneration) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      mounted = false;
      editorMounted.current = false;
      lockAbort.abort();
      release();
      window.removeEventListener("online", connectivity);
      window.removeEventListener("offline", connectivity);
      window.removeEventListener("beforeunload", warn);
    };
  }, [initial.key, initial.userId, initial.bundle.audit.id, fromOfflineShell]);
  const sync = useCallback(async () => {
    if (
      syncing.current ||
      !navigator.onLine ||
      current.current.bundle.audit.status !== "draft" ||
      otherTab ||
      conflict
    )
      return;
    syncing.current = true;
    setStatus("Syncing");
    setError("");
    try {
      await queue.current;
      const snapshot = current.current;
      const result = await syncDraft(
        snapshot,
        (done, total) => {
          if (editorMounted.current)
            setUploadProgress(
              total ? `${done} / ${total} attachments saved online` : "",
            );
        },
        () => editorMounted.current,
      );
      if (!editorMounted.current) return;
      const latest = current.current;
      const next = {
        ...latest,
        bundle: result,
        baseRevision: result.audit.revision,
        syncedGeneration: snapshot.generation,
      };
      await persist(next);
      setFiles(await getFiles(next.userId, next.bundle.audit.id));
    } catch (e) {
      if (!editorMounted.current) return;
      setError(textError(e));
      setStatus("Needs attention");
      if (e instanceof ApiError && e.status === 409) {
        try {
          setConflict(
            await api<AuditBundle>(`audits/${current.current.bundle.audit.id}`),
          );
        } catch {}
      }
    } finally {
      syncing.current = false;
      setUploadProgress("");
    }
  }, [otherTab, conflict, persist]);
  useEffect(() => {
    if (
      draft.generation === draft.syncedGeneration ||
      !online ||
      readOnly ||
      conflict ||
      status === "Needs attention"
    )
      return;
    const timer = setTimeout(() => {
      void sync();
    }, 1400);
    return () => clearTimeout(timer);
  }, [
    draft.generation,
    draft.syncedGeneration,
    online,
    readOnly,
    conflict,
    status,
    sync,
  ]);
  const answer = (id: string, change: Partial<AnswerResponse>) =>
    update((d) => ({
      ...d,
      responses: {
        ...d.responses,
        [id]: { ...emptyResponse(), ...d.responses[id], ...change },
      },
    }));
  const site = (field: keyof SiteDetails, value: string) =>
    update((d) => ({ ...d, site: { ...d.site, [field]: value } }));
  const addFiles = async (questionId: string, selected: FileList | null) => {
    if (!selected || readOnly) return;
    setBusy(true);
    setError("");
    try {
      const incoming = [...selected];
      const questionCount = current.current.document.evidence.filter(
        (e) => e.questionId === questionId,
      ).length;
      if (questionCount + incoming.length > MAX_QUESTION_EVIDENCE)
        throw new Error(
          `Each question allows up to ${MAX_QUESTION_EVIDENCE} attachments. You can add ${Math.max(0, MAX_QUESTION_EVIDENCE - questionCount)} more.`,
        );
      if (
        current.current.document.evidence.length + incoming.length >
        MAX_EVIDENCE
      )
        throw new Error(`Up to ${MAX_EVIDENCE} attachments per audit.`);
      const saved: LocalEvidence[] = [];
      for (const file of incoming) {
        if (file.size > MAX_FILE_BYTES || file.size === 0)
          throw new Error("Each attachment must be between 1 byte and 25 MB.");
        const type =
          file.type ||
          (/\.heic$/i.test(file.name)
            ? "image/heic"
            : /\.heif$/i.test(file.name)
              ? "image/heif"
              : "");
        if (
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/heic",
            "image/heif",
            "application/pdf",
          ].includes(type)
        )
          throw new Error("Attach a JPEG, PNG, WebP, HEIC photo or PDF.");
        saved.push({
          id: crypto.randomUUID(),
          auditId: b.audit.id,
          userId: draft.userId,
          file,
          preview: await makePreview(file),
          name: file.name,
          type,
          synced: false,
        });
      }
      await queue.current.catch(() => {});
      const prev = current.current,
        next = {
          ...prev,
          document: {
            ...prev.document,
            evidence: [
              ...prev.document.evidence,
              ...saved.map((f) => ({
                id: f.id,
                questionId,
                caption: "",
                location: "",
              })),
            ],
          },
          generation: prev.generation + 1,
          operationId: crypto.randomUUID(),
          updatedAt: new Date().toISOString(),
        };
      await saveWithFiles(next, saved);
      current.current = next;
      setDraft(next);
      setFiles((f) => [...f, ...saved]);
      setStatus("Saved on this device");
    } catch (e) {
      setError(textError(e));
      setStatus("Needs attention");
    } finally {
      setBusy(false);
    }
  };
  const evidence = (id: string) => (
    <EvidenceControls
      questionId={id}
      references={doc.evidence.filter((e) => e.questionId === id)}
      files={files}
      auditId={b.audit.id}
      readOnly={readOnly || busy}
      add={addFiles}
      update={(ref, change) =>
        update((d) => ({
          ...d,
          evidence: d.evidence.map((e) =>
            e.id === ref ? { ...e, ...change } : e,
          ),
        }))
      }
      remove={(id) =>
        update((d) => ({
          ...d,
          evidence: d.evidence.filter((e) => e.id !== id),
        }))
      }
    />
  );
  const complete = async () => {
    setBusy(true);
    setError("");
    try {
      await sync();
      if (
        current.current.generation !== current.current.syncedGeneration ||
        conflict
      )
        throw new Error(
          "Resolve saving and synchronisation before completing.",
        );
      const result = await api<AuditBundle>(
        `audits/${b.audit.id}/complete`,
        "POST",
        { revision: current.current.baseRevision },
      );
      await persist({
        ...current.current,
        bundle: result,
        document: result.audit.document,
        baseRevision: result.audit.revision,
      });
      setReview(false);
      setStatus("Saved online");
    } catch (e) {
      setError(textError(e));
      setStatus("Needs attention");
    } finally {
      setBusy(false);
    }
  };
  const prepare = async () => {
    setBusy(true);
    setError("");
    try {
      await queue.current;
      await prepareOffline();
      setFiles(await cacheStoredEvidence(current.current));
      setPrepared(true);
    } catch (e) {
      setError(textError(e));
    } finally {
      setBusy(false);
    }
  };
  const reconcile = async (keepLocal: boolean) => {
    if (!conflict) return;
    const previous = current.current;
    const next = {
      ...previous,
      bundle: conflict,
      document: keepLocal ? previous.document : conflict.audit.document,
      baseRevision: conflict.audit.revision,
      generation: previous.generation + 1,
      syncedGeneration: keepLocal
        ? previous.syncedGeneration
        : previous.generation + 1,
      operationId: crypto.randomUUID(),
    };
    await persist(next);
    setConflict(null);
    setError("");
  };
  const [interviewsOpen, setInterviewsOpen] = useState(false);
  const shown = active.checks.filter(
    (q) =>
      filter === "all" ||
      (filter === "unanswered" && !effectiveResponse(doc, template, q.id).answer) ||
      (filter === "failures" && (effectiveResponse(doc, template, q.id).answer === "no" || staffDeduction(doc, template, q.id, q.weight) > 0)) ||
      (filter === "followup" && issues.some((i) => i.questionId === q.id)),
  );
  return (
    <div className="min-h-full bg-[#f5f6f1] text-[#17291f]">
      <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              aria-label="Back to Audit Studio"
              className={button}
              onClick={async () => {
                try {
                  await queue.current;
                  onBack();
                } catch (e) {
                  setError(textError(e));
                }
              }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Audit Studio / Audit
              </p>
              <h1 className="text-xl font-bold">{doc.site.storeName}</h1>
              <p className="text-xs text-slate-500">
                {doc.site.storeCode} · {doc.site.visitDate}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div
              aria-live="polite"
              className={`text-xs ${status === "Needs attention" ? "text-red-700" : "text-slate-600"}`}
            >
              {!online && <WifiOff className="mr-1 inline" size={14} />}{" "}
              {uploadProgress ? "Syncing" : status}
              {uploadProgress && <span className="ml-2">{uploadProgress}</span>}
            </div>
            {!readOnly && (
              <button
                className={button}
                disabled={!online || busy || status === "Syncing"}
                onClick={() => void sync()}
              >
                <RefreshCw size={15} />
                Sync
              </button>
            )}
            <Badge>
              {b.audit.status === "completed" ? "Completed" : doc.purpose === "store" ? "Store audit" : "Practice audit"}
            </Badge>
          </div>
        </div>
      </header>
      <div className="px-4 pt-4 md:px-7">
        {error && (
          <div
            role="alert"
            className="mb-4 whitespace-pre-line rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}
        {otherTab && (
          <p className="mb-4 rounded-lg bg-amber-100 p-4 text-sm">
            This audit is open in another tab on this device. Close that editor
            and reopen here to make changes.
          </p>
        )}
        {conflict && (
          <section className={`${panel} mb-4 !border-amber-400`}>
            <h2 className="text-lg font-bold">Choose which changes to keep</h2>
            <p className="my-2 text-sm">
              Another device saved revision {conflict.audit.revision}. Review
              the differences. Keeping this device replaces those answers with
              this draft; the completed report, if any, stays unchanged.
            </p>
            <div className="max-h-64 overflow-auto text-sm">
              {changesBetween(doc, conflict.audit.document, template).map(
                (difference) => (
                  <div key={difference.label} className="border-t py-3">
                    <p className="font-semibold">{difference.label}</p>
                    <div className="mt-2 grid gap-3 md:grid-cols-2">
                      <p className="whitespace-pre-line">
                        <strong>This device</strong>
                        <br />
                        {difference.local}
                      </p>
                      <p className="whitespace-pre-line">
                        <strong>Saved online</strong>
                        <br />
                        {difference.online}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className={primary} onClick={() => void reconcile(false)}>
                Use saved online version
              </button>
              <button
                className={button}
                disabled={conflict.audit.status !== "draft"}
                onClick={() => void reconcile(true)}
              >
                Keep this device’s changes
              </button>
            </div>
          </section>
        )}
        {b.audit.status === "finalizing" && (
          <div className={`${panel} mb-4`}>
            <h2 className="font-bold">Preparing the PDF</h2>
            <p className="mt-2 text-sm text-slate-600">
              The saved answers and attachments are being checked and added to
              the report. Photo-heavy audits can take a few minutes. This page
              will update when it is ready.
            </p>
            <button
              className={`${button} mt-3`}
              disabled={busy}
              onClick={complete}
            >
              Check / retry report
            </button>
          </div>
        )}
        {b.audit.status === "completed" && (
          <div
            className={`${panel} mb-4 flex flex-wrap items-center justify-between gap-4`}
          >
            <div>
              <h2 className="font-bold">{doc.purpose === "store" ? "Audit completed" : "Practice audit completed"}</h2>
              <p className="mt-1 text-sm text-slate-600">
                Answers, signatures and evidence are retained. This report is
                read-only.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                className={primary}
                href={`/api/audit-studio/audits/${b.audit.id}/report`}
              >
                <Download size={16} />
                Download PDF
              </a>
              {doc.purpose === "store" && !b.publication && <button className={primary} disabled={!online || busy} onClick={async()=>{
                setBusy(true); setError("");
                try {
                  const result = await api<AuditBundle>(`audits/${b.audit.id}/publish`,"POST",{storeId:b.audit.store_id});
                  await persist({...current.current,bundle:result,document:result.audit.document,baseRevision:result.audit.revision});
                  setStatus("Saved to store");
                } catch(e) {setError(textError(e));} finally {setBusy(false);}
              }}>Save as current audit for {doc.site.storeName}</button>}
              {b.publication && <p className="self-center text-sm font-semibold text-emerald-800">Saved to store · {b.publication.audit_year} / Audit {b.publication.audit_number}</p>}
              <button
                className={button}
                disabled={!online || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const revised = await api<AuditBundle>(
                      `audits/${b.audit.id}/revise`,
                      "POST",
                      { id: crypto.randomUUID() },
                    );
                    onRevision(revised.audit.id);
                  } catch (e) {
                    setError(textError(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Create linked revision
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="grid gap-6 px-4 pb-8 md:px-7 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="flex items-center justify-between border-b border-slate-200 py-4">
            <div>
              <p className="text-3xl font-bold">
                {formatScore(score.percentage)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {score.earned} / {score.applicable} points
              </p>
            </div>
            <Badge>{score.outcome}</Badge>
          </div>
          <p className="my-3 text-xs text-slate-500">
            {score.answered} / {score.total} scored checks answered
          </p>
          <div className="h-1.5 overflow-hidden rounded bg-slate-200">
            <div
              className="h-full bg-[#608246]"
              style={{ width: `${(score.answered / score.total) * 100}%` }}
            />
          </div>
          <label className="mt-4 block lg:hidden">
            <span className="mb-1 block text-sm font-medium">
              Audit section
            </span>
            <select
              className={input}
              value={section}
              onChange={(e) => {
                setSection(Number(e.target.value));
                setReview(false);
              }}
            >
              {template.sections.map((s) => (
                <option key={s.page} value={s.page}>
                  {s.page}. {s.page === 3 ? "Store manager Q&A" : s.title}
                </option>
              ))}
            </select>
          </label>
          <nav
            aria-label="Audit sections"
            className="mt-4 hidden space-y-1 lg:block"
          >
            {template.sections.map((s) => {
              const ss = score.sections.find((x) => x.page === s.page)!;
              return (
                <button
                  key={s.page}
                  className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${section === s.page && !review ? "bg-[#1c3426] font-bold text-white" : "hover:bg-slate-200"}`}
                  onClick={() => {
                    setSection(s.page);
                    setReview(false);
                  }}
                >
                  <span className="w-5 shrink-0 opacity-70">
                    {String(s.page).padStart(2, "0")}
                  </span>
                  <span className="flex-1">{s.page === 3 ? "Store manager Q&A" : s.title}</span>
                  {ss.answered > 0 && ss.unanswered === 0 ? (
                    <Check size={14} />
                  ) : s.checks.length > 0 ? (
                    <span className="opacity-60">
                      {ss.answered}/{s.checks.length}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
          {!!b.history?.length && <details className="my-4 rounded-xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold">Previous store reports</summary>
            <ul className="mt-3 space-y-3 text-xs">{b.history.map(h=><li key={h.id}>
              {h.kind} · {h.audit_year}{h.audit_number ? ` / Audit ${h.audit_number}` : ""}<br/>
              {h.visit_date}{h.percentage !== null ? ` · ${Number(h.percentage).toFixed(2)}%` : ""}
              {h.pdf_path ? <a className="ml-2 underline" href={`/api/audit-studio/audits/${b.audit.id}/history/${h.id}`} target="_blank" rel="noreferrer">Open PDF</a> : <span className="block text-slate-500">File held in existing archive</span>}
            </li>)}</ul>
          </details>}
          <StaffInterviews doc={doc} template={template} readOnly={readOnly} open={interviewsOpen} onOpenChange={setInterviewsOpen} update={update} status={status} onQuestion={id => {setSection(Number(id.split(".")[0])); setReview(false); setFilter("all"); requestAnimationFrame(() => document.getElementById(`audit-question-${id}`)?.scrollIntoView({block: "center"}));}} />
          <button
            className={`${primary} mt-4 w-full`}
            onClick={() => setReview(true)}
          >
            Review audit <ArrowRight size={15} />
          </button>
          {!readOnly && (
            <button
              className={`${button} mt-2 w-full`}
              disabled={!online || busy}
              onClick={prepare}
            >
              {prepared ? <Check size={16} /> : <Download size={16} />}{" "}
              {prepared ? "Prepared for offline" : "Prepare for offline"}
            </button>
          )}
          {!prepared && (
            <p className="mt-2 text-xs leading-5 text-amber-700">
              Offline app files are not ready yet. Prepare before leaving the
              connection.
            </p>
          )}
          {prepared && (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Answers and captured files stay on this device. Keep this
              browser’s site data; connect again to complete.
            </p>
          )}
        </aside>
        <div role="region" aria-label="Audit questions" className="min-w-0">
          {review ? (
            <section className={panel}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Final check
              </p>
              <h2 className="mt-2 text-2xl font-bold">Review the visit</h2>
              <p className="mt-3 text-lg font-bold">
                {formatScore(score.percentage)} · {score.outcome}
              </p>
              {score.reasons.map((reason) => (
                <p key={reason} className="mt-2 text-sm text-slate-600">
                  {reason}
                </p>
              ))}
              <h3 className="mb-3 mt-7 font-bold">Section scores</h3>
              <div className="space-y-2">
                {score.sections
                  .filter((s) => s.applicable > 0 || s.answered > 0)
                  .map((s) => (
                    <div
                      key={s.page}
                      className="flex justify-between gap-4 border-b py-2 text-sm"
                    >
                      <span>
                        {s.title}
                        {s.core ? " · 70% target" : ""}
                      </span>
                      <strong>{formatScore(s.percentage)}</strong>
                    </div>
                  ))}
              </div>
              <h3 className="mb-3 mt-7 font-bold">
                {issues.length
                  ? `${issues.length} details still needed`
                  : "Ready to complete"}
              </h3>
              <div className="space-y-2">
                {issues.map((issue, i) => (
                  <button
                    className="block text-left text-sm text-amber-800 underline"
                    key={i}
                    onClick={() => {
                      if (issue.questionId === "staff-interviews") {setInterviewsOpen(true); return;}
                      setSection(
                        issue.questionId === "site"
                          ? 3
                          : issue.questionId === "sign-off"
                            ? 17
                            : Number(issue.questionId.split(".")[0]),
                      );
                      setReview(false);
                    }}
                  >
                    {issue.questionId}: {issue.message}
                  </button>
                ))}
              </div>
              <p className="my-5 text-sm text-slate-500">
                Completion saves a read-only report with all attached evidence.
                {doc.purpose === "store" ? "Download the completed report, then save it to the selected store." : "Practice results stay outside the live tracker."}
              </p>
              <button
                className={primary}
                disabled={
                  readOnly ||
                  busy ||
                  !online ||
                  !!issues.length ||
                  !!conflict ||
                  draft.generation !== draft.syncedGeneration
                }
                onClick={complete}
              >
                {busy ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Check size={16} />
                )}
                Complete audit & create PDF
              </button>
            </section>
          ) : (
            <>
              <header className="mb-5 pt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Section {section} / 17
                  {active.total ? ` · ${active.total} points` : ""}
                </p>
                <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                  {active.page === 3 ? "Store manager Q&A" : active.title}
                </h2>
                <details className="mt-3 rounded-lg border border-[#d5dfc7] bg-[#edf3e5] p-3 text-sm">
                  <summary className="cursor-pointer font-semibold">
                    Evidence example
                  </summary>
                  <p className="mt-2 leading-6">{active.evidence}</p>
                  {active.practice && (
                    <p className="mt-2 leading-6 text-slate-600">
                      {active.practice}
                    </p>
                  )}
                </details>
              </header>
              {section === 1 && (
                <section className={panel}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Store name"
                      value={doc.site.storeName}
                      onChange={(v) => site("storeName", v)}
                      disabled={readOnly}
                    />
                    <Field
                      label="Store code"
                      value={doc.site.storeCode}
                      onChange={(v) => site("storeCode", v)}
                      disabled={readOnly}
                    />
                    <Field
                      label="Visit date"
                      type="date"
                      value={doc.site.visitDate}
                      onChange={(v) => site("visitDate", v)}
                      disabled={readOnly}
                    />
                    <Field
                      label="Auditor"
                      value={doc.site.auditor}
                      onChange={(v) => site("auditor", v)}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="mt-4">
                    <Field
                      label="Site address"
                      value={doc.site.address}
                      onChange={(v) => site("address", v)}
                      disabled={readOnly}
                    />
                  </div>
                  {evidence("site")}
                </section>
              )}
              {section === 2 && (
                <section className={`${panel} space-y-4`}>
                  <a
                    className={`${button} text-emerald-800`}
                    href="/api/audit-studio/reference/introduction"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View assessment terms and improvement cycle (PDF)
                  </a>
                  <p className="text-sm leading-6 text-slate-600">
                    Record what was accessible and what you could verify during
                    the visit. A sample inspection cannot confirm conditions
                    outside the areas and time checked.
                  </p>
                  <Field
                    label="Scope, access limitations and anything not verified"
                    value={doc.site.limitations}
                    onChange={(v) => site("limitations", v)}
                    multiline
                    disabled={readOnly}
                  />
                  <Field
                    label="Previous report reviewed / outstanding issues"
                    value={doc.site.previousReport}
                    onChange={(v) => site("previousReport", v)}
                    multiline
                    disabled={readOnly}
                  />
                  {evidence("disclaimer")}
                </section>
              )}
              {section === 3 && (
                <section className={`${panel} space-y-6`}>
                  <div>
                    <h3 className="text-lg font-semibold">Store manager Q&amp;A</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Ask the manager about this store. These answers will appear
                      beside the relevant audit checks so you can compare them
                      with what staff tell you and what you see on site.
                    </p>
                  </div>
                  {MANAGER_QUESTION_GROUPS.map((group) => (
                    <fieldset key={group.title} className="space-y-4 border-t border-slate-200 pt-4">
                      <legend className="pr-3 text-base font-semibold">{group.title}</legend>
                      {group.questions.map(({ key, question, hint }) => (
                        <Field key={key} label={question} value={doc.site[key] || ""}
                          onChange={(v) => site(key, v)} placeholder={hint} hint={hint}
                          multiline={!["managerName", "staff", "maxStaff"].includes(key)} disabled={readOnly} />
                      ))}
                    </fieldset>
                  ))}
                  <fieldset className="space-y-4 border-t border-slate-200 pt-4">
                    <legend className="pr-3 text-base font-semibold">Premises and records</legend>
                    <div className="grid gap-4 md:grid-cols-2">
                      {([
                        ["floors", "Which floors are used?"],
                        ["area", "What is the approximate floor area?"],
                        ["exits", "How many fire exits serve the store?"],
                      ] as const).map(([key, label]) => (
                        <Field key={key} label={label} value={doc.site[key]} onChange={(v) => site(key, v)} disabled={readOnly} />
                      ))}
                      <label className="space-y-1.5 text-sm font-medium">Area units
                        <select value={doc.site.areaUnit} onChange={(e) => site("areaUnit", e.target.value)} className={input} disabled={readOnly}>
                          <option>m²</option><option>ft²</option>
                        </select>
                      </label>
                    </div>
                    <Field label="Which systems are maintained by the store or the landlord?" value={doc.site.systems}
                      onChange={(v) => site("systems", v)} multiline disabled={readOnly} />
                    <Field label="Have there been any enforcement visits, notices or outstanding requirements?" value={doc.site.enforcement}
                      onChange={(v) => site("enforcement", v)} placeholder="Record the details, or None if there are no known matters." multiline disabled={readOnly} />
                  </fieldset>
                  {evidence("site-information")}
                </section>
              )}
              {active.checks.length > 0 && (
                <>
                  <div className="mb-4">
                    <label className="text-sm font-medium">
                      Show questions
                      <select
                        className={`${input} mt-1 max-w-xs`}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">All questions</option>
                        <option value="unanswered">Unanswered</option>
                        <option value="failures">Failed / not verified</option>
                        <option value="followup">
                          Missing follow-up details
                        </option>
                      </select>
                    </label>
                  </div>
                  <div className="space-y-4">
                    {shown.map((q) => {
                      const r = effectiveResponse(doc, template, q.id);
                      const conditionAnswer = doc.interviewScoringVersion === "graded-v2" ? doc.responses[q.id]?.answer : r.answer;
                      const derived = isInterviewDerived(doc, q.id) || (q.id === "16.03" && !!doc.previousActionReviews?.length);
                      const hasSamples = interviewEntries(doc, template, q.id).length > 0;
                      const interviewGap = hasInterviewGap(doc, template, q.id);
                      const staffNotes = interviewNotes(doc, template, q.id);
                      const practical = practicalCheckPrompts(
                        template.version,
                        q.id,
                      );
                      const references = managerReferences(doc.site, q.id);
                      return (
                        <section key={q.id} id={`audit-question-${q.id}`} className={panel}>
                          {q.id === "16.03" && <PreviousActions auditId={b.audit.id} document={doc} disabled={readOnly} onChange={reviews=>update(d=>({...d,previousActionReviews:reviews}))}/>}
                          <div className="flex gap-4">
                            <p className="text-xs font-semibold text-slate-400">
                              {q.id}
                            </p>
                            <span className="ml-auto shrink-0 text-xs font-bold text-slate-500">
                              {q.weight} {q.weight === 1 ? "point" : "points"}
                            </span>
                          </div>
                          <h3 className="mt-2 text-base font-semibold leading-6">
                            {q.question}
                          </h3>
                          {derived && q.id === "16.03" ? <p className="my-4 rounded-lg bg-emerald-50 p-4 text-sm font-semibold">Answer from action reviews: {r.answer === "yes" ? "Yes" : r.answer === "no" ? "No" : r.answer === "na" ? "Not applicable" : "Finish the selected reviews"}</p> : derived ? <div className="my-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                            <p className="text-sm font-semibold">Answer from staff interviews: {r.answer === "no" && questionEarned(doc, template, q.id, q.weight) > 0 ? "Partial" : r.answer === "yes" ? "Yes" : r.answer === "no" ? "No" : r.answer === "na" ? "Not sampled (N/A)" : "Awaiting staff answers"}</p>
                            <p className="mt-2 text-sm leading-6">{q.id === "05.02" ? "Use the local-risks interview or link two different selected topics to this check." : "Record a colleague’s explanation of the emergency arrangements."} Staff gaps use the recorded deduction. Manager answers and note suggestions cannot award a pass.</p>
                            <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={button} onClick={() => setInterviewsOpen(true)}>Open staff interviews</button>
                            {!readOnly && !hasSamples && <button type="button" className={button} onClick={() => answer(q.id, {answer: doc.responses[q.id]?.answer === "na" ? null : "na", naReason: doc.responses[q.id]?.answer === "na" ? "" : doc.responses[q.id]?.naReason || "", verified: true})}>{doc.responses[q.id]?.answer === "na" ? "Include in sampling" : "Not sampled this visit"}</button>}</div>
                          </div> : <div className="my-4 grid grid-cols-3 gap-2">
                            {(["yes", "no", "na"] as const).map((a) => (
                              <button
                                key={a}
                                disabled={readOnly || (doc.interviewScoringVersion !== "graded-v2" && interviewGap && a !== "no")}
                                aria-pressed={conditionAnswer === a}
                                onClick={() =>
                                  answer(q.id, {
                                    answer: a,
                                    verified: true,
                                    danger: false,
                                    dangerReason: "",
                                  })
                                }
                                className={`min-h-12 rounded-lg border text-sm font-bold ${conditionAnswer === a ? (a === "yes" ? "border-emerald-700 bg-emerald-700 text-white" : a === "no" ? "border-red-700 bg-red-700 text-white" : "border-slate-600 bg-slate-600 text-white") : "border-slate-300 bg-white hover:bg-slate-50"}`}
                              >
                                {a === "na"
                                  ? "N/A"
                                  : a === "yes"
                                    ? "Yes"
                                    : "No"}
                              </button>
                            ))}
                          </div>}
                          {staffNotes && <aside className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm"><h4 className="font-semibold">Linked staff interviews</h4>{interviewGap && <p className="mt-2 font-semibold text-red-700">Staff gap recorded. Current question score: {questionEarned(doc, template, q.id, q.weight)}/{q.weight}. Record the follow-up below.</p>}<p className="mt-3 whitespace-pre-wrap break-words">{staffNotes}</p><button className={`${button} mt-3`} onClick={() => setInterviewsOpen(true)}>Open staff interviews</button></aside>}
                          {(r.answer === "na" || (derived && doc.responses[q.id]?.answer === "na" && !hasSamples)) && (
                            <Field
                              label={derived ? "Why was this check not sampled?" : "Why does this not apply?"}
                              value={doc.responses[q.id]?.naReason || ""}
                              onChange={(v) => answer(q.id, { naReason: v })}
                              multiline
                              disabled={readOnly}
                            />
                          )}
                          <div className="mt-4">
                            {references.length > 0 && r.answer !== "na" && (
                              <aside className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4" aria-label="Manager Q&A reference">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <h4 className="text-sm font-semibold">Manager Q&amp;A reference{doc.site.managerName ? ` · ${doc.site.managerName}` : ""}</h4>
                                  <button type="button" onClick={() => setSection(3)} className="min-h-11 text-sm font-semibold text-emerald-800 underline">View manager answers</button>
                                </div>
                                <p className="mb-3 text-xs leading-5 text-slate-600">Ask staff without showing them these answers. Check the manager’s information against the site records, then record what staff said and whether it matched.</p>
                                <dl className="space-y-3 text-sm">
                                  {references.map((ref) => <div key={ref.key}>
                                    <dt className="font-semibold">{ref.question}</dt>
                                    <dd className="mt-1 whitespace-pre-wrap break-words text-slate-700">{ref.answer || "Not recorded — ask the manager and verify on site."}</dd>
                                  </div>)}
                                </dl>
                              </aside>
                            )}
                            {!derived && practical &&
                              (r.answer !== "na" ||
                                r.practicalCheck?.checked ||
                                r.practicalCheck?.outcome) && (
                                <fieldset className="mb-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                  <legend className="px-1 text-sm font-semibold">
                                    Practical check
                                  </legend>
                                  <Field
                                    label="What did you check?"
                                    value={r.practicalCheck?.checked || ""}
                                    placeholder={practical.checked}
                                    onChange={(checked) =>
                                      answer(q.id, {
                                        practicalCheck: {
                                          checked,
                                          outcome:
                                            r.practicalCheck?.outcome || "",
                                        },
                                      })
                                    }
                                    multiline
                                    disabled={readOnly}
                                  />
                                  <Field
                                    label="What was the outcome?"
                                    value={r.practicalCheck?.outcome || ""}
                                    placeholder={practical.outcome}
                                    onChange={(outcome) =>
                                      answer(q.id, {
                                        practicalCheck: {
                                          checked:
                                            r.practicalCheck?.checked || "",
                                          outcome,
                                        },
                                      })
                                    }
                                    multiline
                                    disabled={readOnly}
                                  />
                                </fieldset>
                              )}
                            {!derived && <SuggestedNotes
                              version={template.version}
                              questionId={q.id}
                              answer={r.answer}
                              notes={r.note}
                              onChange={(note) => answer(q.id, { note })}
                              disabled={readOnly}
                            />}
                            <Field
                              label={
                                r.answer === "no"
                                  ? staffNotes ? "Additional finding notes" : "Finding — what did you see? (required)"
                                  : "Notes"
                              }
                              value={r.note}
                              hint={questionNotesHint(
                                template.version,
                                q.id,
                                active.evidence,
                              )}
                              onChange={(v) => answer(q.id, { note: v })}
                              multiline
                              disabled={readOnly}
                            />
                          </div>
                          {(r.answer === "no" || staffDeduction(doc, template, q.id, q.weight) > 0) && (
                            <div className="mt-4 space-y-4 rounded-lg bg-slate-50 p-4">
                              <label className="flex min-h-10 items-center gap-3 text-sm">
                                <input
                                  type="checkbox"
                                  className="h-5 w-5"
                                  checked={!r.verified}
                                  disabled={readOnly || interviewGap}
                                  onChange={(e) =>
                                    answer(q.id, {
                                      verified: !e.target.checked,
                                      danger: false,
                                      dangerReason: "",
                                    })
                                  }
                                />
                                Not verified — evidence was unavailable
                              </label>
                              <Field
                                label="Action required"
                                value={r.action.text}
                                onChange={(v) =>
                                  answer(q.id, {
                                    action: { ...r.action, text: v },
                                  })
                                }
                                multiline
                                disabled={readOnly}
                              />
                              <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                  label="Action owner"
                                  value={r.action.owner}
                                  onChange={(v) =>
                                    answer(q.id, {
                                      action: { ...r.action, owner: v },
                                    })
                                  }
                                  disabled={readOnly}
                                />
                                <Field
                                  label="Due date"
                                  type="date"
                                  value={r.action.dueDate}
                                  onChange={(v) =>
                                    answer(q.id, {
                                      action: { ...r.action, dueDate: v },
                                    })
                                  }
                                  disabled={readOnly}
                                />
                              </div>
                              {q.id !== "15.02" && r.verified && (
                                <>
                                  <label className="flex min-h-10 items-center gap-3 text-sm">
                                    <input
                                      className="h-5 w-5"
                                      type="checkbox"
                                      checked={r.danger}
                                      disabled={readOnly}
                                      onChange={(e) =>
                                        answer(q.id, {
                                          danger: e.target.checked,
                                        })
                                      }
                                    />
                                    Immediate serious danger confirmed
                                  </label>
                                  {r.danger && (
                                    <Field
                                      label="Describe the immediate danger and protective action taken"
                                      value={r.dangerReason}
                                      onChange={(v) =>
                                        answer(q.id, { dangerReason: v })
                                      }
                                      multiline
                                      disabled={readOnly}
                                    />
                                  )}
                                </>
                              )}
                              {q.id === "15.02" && (
                                <p className="text-xs text-slate-500">
                                  A propped door loses 4 points. Propping alone
                                  does not cause an automatic fail.
                                </p>
                              )}
                            </div>
                          )}
                          {evidence(q.id)}
                        </section>
                      );
                    })}
                    {!shown.length && (
                      <p className="p-8 text-sm text-slate-500">
                        No questions match this filter in this section.
                      </p>
                    )}
                  </div>
                </>
              )}
              {section === 17 && (
                <section className={`${panel} space-y-6`}>
                  <Signature
                    label="Auditor signature"
                    value={doc.signOff.auditorSignature}
                    disabled={readOnly}
                    onChange={(v) =>
                      update((d) => ({
                        ...d,
                        signOff: { ...d.signOff, auditorSignature: v },
                      }))
                    }
                  />
                  <Field
                    label="Store representative name"
                    value={doc.signOff.representative}
                    disabled={readOnly}
                    onChange={(v) =>
                      update((d) => ({
                        ...d,
                        signOff: { ...d.signOff, representative: v },
                      }))
                    }
                  />
                  <Signature
                    label="Store representative signature"
                    value={doc.signOff.representativeSignature}
                    disabled={readOnly}
                    onChange={(v) =>
                      update((d) => ({
                        ...d,
                        signOff: { ...d.signOff, representativeSignature: v },
                      }))
                    }
                  />
                  <Field
                    label="If acknowledgement was unavailable, record why"
                    value={doc.signOff.unavailableReason}
                    multiline
                    disabled={readOnly}
                    onChange={(v) =>
                      update((d) => ({
                        ...d,
                        signOff: { ...d.signOff, unavailableReason: v },
                      }))
                    }
                  />
                  {evidence("sign-off")}
                </section>
              )}
              <div className="mt-6 flex justify-between gap-4">
                <button
                  className={button}
                  disabled={section === 1}
                  onClick={() => {
                    setSection((s) => s - 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <ArrowLeft size={16} />
                  Previous
                </button>
                <button
                  className={primary}
                  onClick={() => {
                    if (section === 17) setReview(true);
                    else setSection((s) => s + 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  {section === 17 ? "Review" : "Next section"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function EvidenceControls({
  questionId,
  references,
  files,
  auditId,
  readOnly,
  add,
  update,
  remove,
}: {
  questionId: string;
  references: EvidenceReference[];
  files: LocalEvidence[];
  auditId: string;
  readOnly: boolean;
  add: (id: string, files: FileList | null) => void;
  update: (id: string, changes: Partial<EvidenceReference>) => void;
  remove: (id: string) => void;
}) {
  const [photoPage, setPhotoPage] = useState(0);
  const uploadButton = `${button} relative min-h-12 cursor-pointer whitespace-nowrap focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/20`;
  const pages = Math.ceil(references.length / 8),
    visible = references.slice(
      Math.min(photoPage, Math.max(0, pages - 1)) * 8,
      (Math.min(photoPage, Math.max(0, pages - 1)) + 1) * 8,
    );
  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Evidence · {references.length} / {MAX_QUESTION_EVIDENCE}
        </p>
        {!readOnly && references.length < MAX_QUESTION_EVIDENCE && (
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
            <label className={uploadButton}>
              <Camera size={18} aria-hidden="true" />
              Camera
              <input
                aria-label="Take a photo"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  add(questionId, e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <label className={uploadButton}>
              <FileText size={18} aria-hidden="true" />
              Choose files
              <input
                aria-label="Choose photos or PDF files"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                multiple
                onChange={(e) => {
                  add(questionId, e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}
      </div>
      {references.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {visible.map((ref) => (
            <EvidenceCard
              key={ref.id}
              reference={ref}
              file={files.find((f) => f.id === ref.id)}
              auditId={auditId}
              readOnly={readOnly}
              update={update}
              remove={remove}
            />
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="mt-3 flex items-center gap-3 text-xs">
          <button
            className={button}
            disabled={photoPage === 0}
            onClick={() => setPhotoPage((p) => p - 1)}
          >
            Previous photos
          </button>
          <span>
            {Math.min(photoPage + 1, pages)} / {pages}
          </span>
          <button
            className={button}
            disabled={photoPage >= pages - 1}
            onClick={() => setPhotoPage((p) => p + 1)}
          >
            Next photos
          </button>
        </div>
      )}
    </div>
  );
}
function EvidenceCard({
  reference: ref,
  file,
  auditId,
  readOnly,
  update,
  remove,
}: {
  reference: EvidenceReference;
  file?: LocalEvidence;
  auditId: string;
  readOnly: boolean;
  update: (id: string, c: Partial<EvidenceReference>) => void;
  remove: (id: string) => void;
}) {
  const [url, setUrl] = useState(""),
    [broken, setBroken] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setBroken(false);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (!cancelled) {
          setUrl(String(reader.result));
          setBroken(false);
        }
      };
      reader.onerror = () => {
        if (!cancelled) setBroken(true);
      };
      reader.readAsDataURL(file.preview || file.file);
      return () => {
        cancelled = true;
        if (reader.readyState === 1) reader.abort();
      };
    }
    setUrl(`/api/audit-studio/audits/${auditId}/evidence/${ref.id}`);
  }, [file, auditId, ref.id]);

  const pdf = file?.type === "application/pdf";
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 p-3">
      {!url ? (
        <div className="h-44 rounded bg-slate-100" />
      ) : pdf ? (
        <a
          className="flex h-24 items-center justify-center gap-2 rounded bg-slate-100 text-sm underline"
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          <FileText size={24} />
          Open PDF
        </a>
      ) : broken ? (
        <a
          className="block rounded bg-slate-100 p-6 text-sm underline"
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          Open attachment / original preview unavailable
        </a>
      ) : (
        <a href={url} target="_blank" rel="noreferrer">
          <img
            alt={ref.caption || `Evidence ${ref.id.slice(0, 8)}`}
            src={url}
            onError={() => setBroken(true)}
            className="h-44 w-full rounded bg-slate-100 object-contain"
          />
        </a>
      )}
      <p className="mt-2 break-all text-xs text-slate-500">
        {ref.id.slice(0, 8)} · {file?.name || "Stored attachment"}
      </p>
      <div className="mt-3 space-y-3">
        <Field
          label="Caption"
          value={ref.caption}
          onChange={(v) => update(ref.id, { caption: v })}
          disabled={readOnly}
        />
        <Field
          label="Location"
          value={ref.location}
          onChange={(v) => update(ref.id, { location: v })}
          disabled={readOnly}
        />
      </div>
      {!readOnly && (
        <button
          className="mt-2 min-h-10 text-xs font-semibold text-red-700 underline"
          onClick={() => remove(ref.id)}
        >
          Remove from this audit
        </button>
      )}
    </div>
  );
}
