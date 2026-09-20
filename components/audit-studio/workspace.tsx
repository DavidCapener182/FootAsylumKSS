"use client";
import "./mobile-workspace.css";
import { clientId } from "@/lib/audit-studio/client-id";
import { PreviousActions } from "./previous-actions";
import { TestingNotes } from "./testing-notes";
import { EvidenceViewer } from "./evidence-viewer";
import { AssessmentTerms } from "./assessment-terms";
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
  StaffInterviewTarget,
} from "@/lib/audit-studio/types";
import { changesBetween } from "@/lib/audit-studio/conflicts";
import { makePreview } from "@/lib/audit-studio/preview";
import { StaffInterviews } from "./staff-interviews";
import { interviewPrompts, staffDeduction, questionEarned, effectiveResponse, hasInterviewGap, interviewNotes, isInterviewDerived, interviewEntries, withCurrentInterviewScoring } from "@/lib/audit-studio/staff-interviews";
import { Signature } from "./signature";
import { questionNotesHint } from "@/lib/audit-studio/question-guidance";
import { SuggestedNotes } from "./suggested-notes";
import { practicalCheckPrompts } from "@/lib/audit-studio/practical-checks";
import { MANAGER_QUESTION_GROUPS, managerReferences } from "@/lib/audit-studio/manager-questions";

const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const primary = `${button} !border-[#1c3426] !bg-[#1c3426] !text-white hover:!bg-[#2d503a]`;
const input =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base md:text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15 disabled:bg-slate-100";
const panel = "rounded-xl border border-slate-200 bg-white p-3 md:p-6";
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
  const textarea = useRef<HTMLTextAreaElement>(null);
  const resize = useCallback(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
  }, []);
  useEffect(() => { resize(); }, [value, resize]);
  useEffect(() => {
    const element = textarea.current;
    if (!element) return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth !== width) { width = element.clientWidth; resize(); }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [multiline, resize]);
  return (
    <div className="block min-w-0 space-y-1.5 text-sm font-medium">
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <label className="min-w-0 flex-1" htmlFor={fieldId}>{label}</label>
        {hint && (
          <details className="group min-w-0 shrink-0 open:w-full">
            <summary
              aria-label={`What to record: ${label}`}
              className="flex min-h-11 min-w-11 cursor-pointer list-none items-center gap-1.5 rounded px-1 text-xs font-medium text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 [&::-webkit-details-marker]:hidden"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only group-open:not-sr-only md:not-sr-only">What to record</span>
            </summary>
            <p
              id={`${fieldId}-hint`}
              className="mb-2 w-full break-words rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-normal leading-6 text-slate-800"
            >
              {hint} Photos are optional.
            </p>
          </details>
        )}
      </div>
      {multiline ? (
        <textarea
          ref={textarea}
          id={fieldId}
          aria-describedby={hint ? `${fieldId}-hint` : undefined}
          placeholder={placeholder || hint}
          className={`${input} resize-none overflow-hidden`}
          rows={3}
          onInput={resize}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={fieldId}
          className={`${input} min-w-0 max-w-full box-border ${type === "date" ? "appearance-none [&::-webkit-date-and-time-value]:min-w-0 [&::-webkit-date-and-time-value]:text-left" : ""}`}
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
    [showArchived, setShowArchived] = useState(false),
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
                operationId: clientId(),
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
        operationId: clientId(),
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
        id: clientId(),
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
      (showArchived || !data?.archivedAuditIds?.includes(a.id)) &&
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
        {userId.current && <TestingNotes userId={userId.current} context="Audit Studio / audit list" />}
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
        {!!data?.archivedAuditIds?.length && <label className="mb-4 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />Show archived audits ({data.archivedAuditIds.length})</label>}
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
                    <h3 className="font-bold">{a.document.site.storeName}</h3>{data?.archivedAuditIds?.includes(a.id) && <p className="text-xs font-semibold text-slate-500">Archived · retained for reference</p>}
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
    [review, setReview] = useState(initial.bundle.audit.status === "completed"),
    [buildingReport, setBuildingReport] = useState(false),
    [reportOpen, setReportOpen] = useState(initial.bundle.audit.status === "completed"),
    [otherTab, setOtherTab] = useState(false);
  const priorAuditStatus = useRef(draft.bundle.audit.status);
  useEffect(() => {
    if (priorAuditStatus.current !== "completed" && draft.bundle.audit.status === "completed") {
      setReview(true); setReportOpen(true);
    }
    priorAuditStatus.current = draft.bundle.audit.status;
  }, [draft.bundle.audit.status]);
  const previousPage = useRef(`${section}:${review}`);
  useEffect(() => {
    const page = `${section}:${review}`;
    if (previousPage.current === page) return;
    previousPage.current = page;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const frame = requestAnimationFrame(() => document.getElementById("audit-section-content")?.scrollIntoView({block: "start", behavior: "smooth"}));
    return () => cancelAnimationFrame(frame);
  }, [section, review]);
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
      operationId: clientId(),
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
          id: clientId(),
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
          operationId: clientId(),
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
    if (busy) return;
    setBuildingReport(true);
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
      setReview(true);
      setReportOpen(true);
      setStatus("Audit completed — PDF ready");
    } catch (e) {
      setError(textError(e));
      setStatus("Needs attention");
    } finally {
      setBuildingReport(false);
      setBusy(false);
    }
  };
  const publishToStore = async () => {
    setBusy(true); setError("");
    try {
      const result = await api<AuditBundle>(`audits/${b.audit.id}/publish`, "POST", {storeId: b.audit.store_id});
      await persist({...current.current, bundle: result, document: result.audit.document, baseRevision: result.audit.revision});
      setStatus("Saved to store");
    } catch (e) { setError(textError(e)); } finally { setBusy(false); }
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
      operationId: clientId(),
    };
    await persist(next);
    setConflict(null);
    setError("");
  };
  const [interviewsOpen, setInterviewsOpen] = useState(false);
  const [interviewTarget, setInterviewTarget] = useState<StaffInterviewTarget>();
  const shown = active.checks.filter(
    (q) =>
      filter === "all" ||
      (filter === "unanswered" && !effectiveResponse(doc, template, q.id).answer) ||
      (filter === "failures" && (effectiveResponse(doc, template, q.id).answer === "no" || staffDeduction(doc, template, q.id, q.weight) > 0)) ||
      (filter === "followup" && issues.some((i) => i.questionId === q.id)),
  );
  return (
    <div className={`audit-studio-editor min-h-full bg-[#f5f6f1] pb-24 pt-[108px] text-[#17291f] md:pb-0 md:pt-0`}>
      {buildingReport && <div role="dialog" aria-modal="true" aria-labelledby="building-audit-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 p-6"><div className="max-w-sm text-center"><Loader2 aria-hidden="true" className="mx-auto mb-6 h-12 w-12 text-emerald-800 motion-safe:animate-spin"/><h2 id="building-audit-title" className="text-2xl font-bold">Building your audit</h2><p role="status" className="mt-3 text-slate-600">Saving your answers and preparing the PDF with your signatures and evidence. It will open here when ready.</p><p className="mt-4 text-sm text-slate-500">Reports with lots of photos can take a few minutes.</p></div></div>}
      {b.audit.status === "completed" && <EvidenceViewer open={reportOpen} onOpenChange={setReportOpen} url={`/api/audit-studio/audits/${b.audit.id}/report`} label={`${doc.site.storeName} · ${doc.site.visitDate}`} title="Audit completed — PDF ready" actions={<>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{doc.purpose === "store" ? b.publication ? <p className="text-sm text-emerald-800">Attached to {doc.site.storeName}</p> : <button className={`${button} w-full`} disabled={busy || !online} onClick={publishToStore}>{busy ? "Attaching…" : `Attach to ${doc.site.storeName}`}</button> : <p className="text-center text-xs text-slate-500">Practice report · kept outside the live store tracker</p>}</>} downloadName={`Audit-${doc.site.storeCode}-${doc.site.visitDate}.pdf`} />}
      <header className="border-b border-slate-200 bg-white px-3 py-2 md:px-7 md:py-4">
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
              <p className="hidden text-xs uppercase tracking-wider text-slate-500 md:block">
                Audit Studio / Audit
              </p>
              <h1 className="text-sm font-bold md:text-xl">{doc.site.storeName}</h1>
              <p className="text-xs text-slate-500">
                {doc.site.storeCode} · {doc.site.visitDate}
              </p>
            </div>
          </div>
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold">Audit tools & save status</summary>
            <div className="mt-2 flex flex-wrap items-center gap-3">
            <TestingNotes userId={draft.userId} context={`${doc.site.storeName} (${doc.site.storeCode}) · ${review ? "Review audit" : `${String(section).padStart(2, "0")} / ${active.title}`}`} />
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
          </details>
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
              <button type="button" className={primary} onClick={() => setReportOpen(true)}><Download size={16} />View / download PDF</button>
              {doc.purpose === "store" && !b.publication && <button className={primary} disabled={!online || busy} onClick={publishToStore}>Save as current audit for {doc.site.storeName}</button>}
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
                      { id: clientId() },
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
      <div className="grid gap-2 px-0 pb-2 md:gap-3 md:px-7 md:pb-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <details className="rounded-lg border border-slate-200 bg-white p-3">
            <summary className="cursor-pointer text-sm font-semibold">Sections, interviews & offline tools</summary>
            <label className="mt-3 block text-sm">Jump to section
              <select className={input} value={section} onChange={e => {setSection(Number(e.target.value)); setReview(false); requestAnimationFrame(() => document.getElementById("audit-section-content")?.scrollIntoView({block: "start", behavior: "smooth"}));}}>
                {template.sections.map(s => <option key={s.page} value={s.page}>{s.page}. {s.page === 3 ? "Store manager Q&A" : s.title}</option>)}
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
          <StaffInterviews section={review ? 0 : section} doc={doc} template={template} readOnly={readOnly} open={interviewsOpen} target={interviewTarget} onOpenChange={open => {if (!open) setInterviewTarget(undefined); setInterviewsOpen(open);}} update={update} status={status} onQuestion={id => {setSection(Number(id.split(".")[0])); setReview(false); setFilter("all"); requestAnimationFrame(() => document.getElementById(`audit-question-${id}`)?.scrollIntoView({block: "center"}));}} />
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
          </details>
        </aside>
        {review && <header className="fixed inset-x-0 top-[var(--mobile-header-height,0px)] z-20 border-b border-slate-200 bg-white px-4 py-2 shadow-sm md:hidden">
          <p className="text-xs font-semibold text-slate-500">Final review</p>
          <h2 className="mt-0.5 text-base font-bold">{score.outcome}</h2>
          <div className="my-2 flex justify-between text-xs"><span>Overall <strong>{formatScore(score.percentage)}</strong></span><span>{score.answered}/{score.total} answered</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-[#608246]" style={{width: `${score.total ? score.answered / score.total * 100 : 0}%`}} /></div>
        </header>}
        <div id="audit-section-content" role="region" aria-label="Audit questions" className="min-w-0 px-3 md:px-0">
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
              <h3 id="audit-review-details" className="mb-3 mt-7 font-bold">
                {b.audit.status === "completed" ? "Audit completed" : issues.length
                  ? `${issues.length} details still needed`
                  : "Ready to complete"}
              </h3>
              <div className="space-y-2">
                {(b.audit.status === "completed" ? [] : issues).map((issue, i) => (
                  <button
                    className="block text-left text-sm text-amber-800 underline"
                    key={i}
                    onClick={() => {
                      if (issue.questionId === "staff-interviews") {setInterviewTarget(issue.interviewTarget); setInterviewsOpen(true); return;}
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
                {b.audit.status === "completed" ? "Your report is saved with all attached evidence. " : "Completion saves a read-only report with all attached evidence. "}
                {doc.purpose === "store" ? "View the PDF, download it or attach it to the selected store." : "Practice results stay outside the live tracker."}
              </p>
              {b.audit.status === "completed" ? <button className={primary} onClick={() => setReportOpen(true)}><Download size={16}/>View / download PDF</button> : <button
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
                Complete audit & view PDF
              </button>}
            </section>
          ) : (
            <>
              <header className="fixed inset-x-0 top-[var(--mobile-header-height,0px)] z-20 border-b border-slate-200 bg-white px-4 py-2 shadow-sm md:static md:mb-3 md:rounded-xl md:border md:p-3 md:shadow-none">
                <p className="text-xs font-semibold text-slate-500">Section {section} / {template.sections.length}</p>
                <h2 className="mt-0.5 truncate text-base font-bold md:text-lg">{active.page === 3 ? "Store manager Q&A" : active.title}</h2>
                <div className="my-2 flex flex-wrap justify-between gap-2 text-xs">
                  <span>Overall <strong>{formatScore(score.percentage)}</strong></span>
                  <span>Section <strong>{active.checks.length ? formatScore(score.sections.find(s => s.page === section)?.percentage ?? null) : "Not scored"}</strong></span>
                  <span>{score.answered}/{score.total} answered</span>
                </div>
                <div role="progressbar" aria-label="Audit completion" aria-valuemin={0} aria-valuemax={score.total} aria-valuenow={score.answered} className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-[#608246]" style={{width: `${score.total ? score.answered / score.total * 100 : 0}%`}} />
                </div>
                </header>
                <details className="mb-2 rounded-lg border border-[#d5dfc7] bg-[#edf3e5] px-3 py-2 text-sm">
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
                  <AssessmentTerms />
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
                <section className={`${panel} space-y-3 md:space-y-6`}>
                  <div>
                    <h3 className="hidden text-lg font-semibold md:block">Store manager Q&amp;A</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Record the manager’s answers, then compare with staff understanding and site checks.
                    </p>
                  </div>
                  {MANAGER_QUESTION_GROUPS.map((group) => (
                    <fieldset key={group.title} className="space-y-2 border-t border-slate-200 pt-2 md:space-y-4 md:pt-4">
                      <legend className="pr-3 text-base font-semibold">{group.title}</legend>
                      {group.questions.map(({ key, question, hint }) => (
                        <Field key={key} label={question} value={doc.site[key] || ""}
                          onChange={(v) => site(key, v)} placeholder={hint} hint={hint}
                          multiline={!["managerName", "staff", "maxStaff"].includes(key)} disabled={readOnly} />
                      ))}
                    </fieldset>
                  ))}
                  <fieldset className="space-y-2 border-t border-slate-200 pt-2 md:space-y-4 md:pt-4">
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
                      const savedSamples = interviewEntries(doc, template, q.id, true);
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
                            <p className="mt-2 text-sm leading-6">Only the staff topics you ask are assessed. Unasked topics are excluded from the score.</p>
                            <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={button} onClick={() => setInterviewsOpen(true)}>Open staff interviews</button>
                            {!doc.optionalStaffSampling && !readOnly && !hasSamples && <button type="button" className={button} onClick={() => answer(q.id, {answer: doc.responses[q.id]?.answer === "na" ? null : "na", naReason: doc.responses[q.id]?.answer === "na" ? "" : doc.responses[q.id]?.naReason || "", verified: true})}>{doc.responses[q.id]?.answer === "na" ? "Include in sampling" : "Not sampled this visit"}</button>}</div>
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
                          {(savedSamples.length > 0 || interviewPrompts(template).some(p => p.questionId === q.id)) && <aside className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm"><h4 className="font-semibold">Staff questions for this check</h4>{!hasSamples && <p className="mt-2 text-sm text-slate-600">Not asked · no staff deduction</p>}<div className="mt-3 space-y-3">{savedSamples.map(({staff, prompt, answer: sample}) => <div key={`${staff.id}-${prompt.id}`} className="border-b border-slate-200 pb-3 last:border-0 last:pb-0"><p className="text-sm font-medium">{staff.colleague || "Colleague"} · {prompt.title}</p><div className="mt-2 grid grid-cols-2 gap-2">{([true, false] as const).map(asked => <button key={String(asked)} type="button" disabled={readOnly} aria-pressed={(sample.askedThisVisit !== false) === asked} className={`${button} px-2 ${(sample.askedThisVisit !== false) === asked ? "!border-emerald-800 !bg-emerald-800 !text-white" : ""}`} onClick={() => update(d => ({...d, staffInterviews: d.staffInterviews?.map(s => s.id === staff.id ? {...s, answers: {...s.answers, [prompt.id]: {...s.answers[prompt.id], askedThisVisit: asked}}} : s)}))}>{asked ? "Asked today" : "Not asked"}</button>)}</div>{sample.askedThisVisit === false && <p className="mt-2 text-xs text-slate-500">Excluded from this visit’s score. Saved answer retained.</p>}</div>)}</div>{interviewGap && <p className="mt-2 font-semibold text-red-700">Staff gap recorded. Current question score: {questionEarned(doc, template, q.id, q.weight)}/{q.weight}. Record the follow-up below.</p>}<details className="mt-2"><summary className="cursor-pointer font-semibold">View answers assessed today</summary><div className="mt-3 space-y-3">{staffNotes.split("\n\n").map((entry, i) => <div key={i} className="rounded-lg border border-slate-200 bg-white p-3"><div className="space-y-2">{entry.split("\n").map((line, j) => <p key={j} className={`break-words leading-6 ${j === 0 ? "font-semibold" : ""}`}>{line}</p>)}</div></div>)}</div></details><button className={`${button} mt-3`} onClick={() => setInterviewsOpen(true)}>Open staff interviews</button></aside>}
                          {!(derived && doc.optionalStaffSampling) && (r.answer === "na" || (derived && doc.responses[q.id]?.answer === "na" && !hasSamples)) && (
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
                              <details className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3" aria-label="Manager Q&A reference"><summary className="cursor-pointer text-sm font-semibold">Manager reference</summary>
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
                              </details>
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
                              answer={conditionAnswer ?? null}
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
                <section className={`${panel} space-y-3 md:space-y-6`}>
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
              <div className="mt-6 hidden justify-between gap-4 md:flex">
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
      <nav aria-label="Audit page navigation" className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-slate-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <button type="button" className={`${button} flex-1`} onClick={() => {
          if (review) setReview(false);
          else if (section > 1) setSection(section - 1);
          else onBack();
          requestAnimationFrame(() => document.getElementById("audit-section-content")?.scrollIntoView({block: "start", behavior: "smooth"}));
        }}><ArrowLeft size={16} />Back</button>
        <button type="button" className={`${primary} flex-1`} onClick={() => {
          if (review) {
            if (b.audit.status === "completed") { setReportOpen(true); return; }
            if (!issues.length && !readOnly && !busy && online && !conflict && draft.generation === draft.syncedGeneration) { void complete(); return; }
            document.getElementById("audit-review-details")?.scrollIntoView({block: "start", behavior: "smooth"}); return;
          }
          if (section === 17) setReview(true); else setSection(section + 1);
          requestAnimationFrame(() => document.getElementById("audit-section-content")?.scrollIntoView({block: "start", behavior: "smooth"}));
        }}>{review ? b.audit.status === "completed" ? "View PDF" : issues.length ? "Details needed" : "Finish audit" : section === 17 ? "Review" : "Next"}<ArrowRight size={16} /></button>
      </nav>
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
              Add photos / files
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
  const [viewing, setViewing] = useState(false);
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
      <EvidenceViewer open={viewing} onOpenChange={setViewing} url={url} file={file && (/image\/hei[cf]/.test(file.type) ? file.preview || file.file : file.file)} label={ref.caption || file?.name || "Audit attachment"} />
      {!url ? <div className="h-36 rounded bg-slate-100" /> : <button type="button" className="block w-full rounded bg-slate-100" aria-label={`View ${ref.caption || file?.name || "evidence photo"}`} onClick={() => setViewing(true)}>
        {pdf || broken ? <span className="flex min-h-24 items-center justify-center gap-2 text-sm"><FileText size={24} />View attachment</span> : <img alt={ref.caption || "Audit evidence"} src={url} onError={() => setBroken(true)} className="h-36 w-full rounded object-contain" />}
      </button>}
      <p className="mt-2 break-all text-xs text-slate-500">
        {ref.id.slice(0, 8)} · {file?.name || "Stored attachment"}
      </p>
      <details className="mt-3 space-y-3"><summary className="min-h-8 cursor-pointer text-sm font-semibold">Caption and location{ref.caption || ref.location ? " · recorded" : " (optional)"}</summary>
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
      </details>
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
