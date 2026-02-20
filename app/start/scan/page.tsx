"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import Button from "@/components/ui/Button";
import { getPrimaryRiskCategory } from "@/lib/getPrimaryRiskCategory";
import { premiumRiskMessages } from "@/lib/premiumRiskMessages";
import ReportPreviewPaywall from "@/components/ReportPreviewPaywall";

const POLL_INTERVAL_MS = 2500;

const CATEGORY_HELPER: Record<string, string> = {
  Labor: "Checks clarity of work scope and labor structure.",
  Materials: "Checks completeness of quantities and material specifications.",
  Scope: "Checks for missing or unclear required work items.",
  Warranty: "Checks contract protections and warranty clarity.",
  Timeline: "Checks schedule definition and milestone structure.",
};

/** Derive preview fields from full report (ai_result) for free preview. */
function getPreviewFromReport(report: Record<string, unknown> | null) {
  if (!report) return null;
  const summary = (report.summary ?? {}) as Record<string, unknown>;
  const riskLevel = summary.risk_level as string | undefined;
  const confidence = summary.confidence as string | undefined;
  const qualityScoreRaw = summary.quality_score ?? (report as Record<string, unknown>).quality_score;
  const num = typeof qualityScoreRaw === "number" ? qualityScoreRaw : Number(qualityScoreRaw);
  const qualityScore = Number.isFinite(num) ? Math.min(100, Math.max(0, Math.round(num))) : null;
  const redFlags = (report.red_flags ?? []) as Array<{ title?: string; detail?: string }>;
  const scope = (report.scope ?? {}) as Record<string, unknown>;
  const missingArr = (scope.missing_or_unclear ?? []) as Array<{ item?: string } | string>;
  const missingItems = missingArr
    .slice(0, 3)
    .map((m) => (typeof m === "string" ? m : m?.item ?? ""))
    .filter(Boolean);
  const negotiation = (report.negotiation ?? {}) as Record<string, unknown>;
  const items = (negotiation.items ?? []) as Array<{ ask?: string } | string>;
  const questions = items
    .slice(0, 3)
    .map((q) => (typeof q === "string" ? q : (q as { ask?: string })?.ask ?? ""))
    .filter(Boolean);
  return {
    risk_level: riskLevel ?? null,
    confidence: confidence ?? null,
    risk_score: qualityScore ?? null,
    red_flags: redFlags.slice(0, 2).map((f) => ({ title: f.title ?? "", detail: f.detail ?? "" })),
    missing_or_unclear: missingItems,
    questions_to_ask: questions,
  };
}

export default function StartScanPage() {
  const searchParams = useSearchParams();
  const submissionId = searchParams.get("submissionId") ?? searchParams.get("submission_id");
  const checkoutSuccess = searchParams.get("checkout") === "success";
  const publicId = searchParams.get("public_id") ?? searchParams.get("token");
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [quoteType, setQuoteType] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processLoading, setProcessLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [resolvedSubmissionId, setResolvedSubmissionId] = useState<string | null>(null);
  const hasTriggeredProcess = useRef(false);

  const isRevised = quoteType === "revised";
  const isComparison = quoteType === "comparison";

  const loadScan = useCallback(async () => {
    if (!submissionId && !publicId) return;
    const params = new URLSearchParams();
    if (submissionId) params.set("submissionId", submissionId);
    else if (publicId) params.set("public_id", publicId);
    const res = await fetch(`/api/submissions/scan?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error ?? "Failed to load");
      setLoading(false);
      return;
    }
    const status = data.status ?? "draft";
    setScanStatus(status);
    setQuoteType(data.quoteType ?? null);
    if (data.submissionId) setResolvedSubmissionId(data.submissionId);
    setErrorMessage(data.error_message ?? null);
    if (status === "complete" && data.token) {
      window.location.href = `/r/${data.token}`;
      return;
    }
    if (data.report != null) {
      setReport(data.report as Record<string, unknown>);
      setError(null);
    } else {
      setReport(null);
    }
    setLoading(false);
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.log("[scan] status:", status, "report:", data.report ? "present" : "null");
    }
  }, [submissionId, publicId]);

  const runProcess = useCallback(async () => {
    const id = submissionId ?? resolvedSubmissionId;
    const body = id ? { submissionId: id } : publicId ? { public_id: publicId } : null;
    if (!body) return;
    if (typeof window !== "undefined") console.log("[scan] calling POST /api/process");
    setProcessLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Analysis failed");
        setErrorMessage(data?.error ?? null);
        setProcessLoading(false);
        setLoading(false);
        return;
      }
      setScanStatus("processing");
      await loadScan();
    } finally {
      setProcessLoading(false);
    }
  }, [submissionId, resolvedSubmissionId, publicId, loadScan]);

  useEffect(() => {
    if (!submissionId && !publicId) {
      setError("Missing submission");
      setLoading(false);
      return;
    }
    loadScan();
  }, [submissionId, publicId, loadScan]);

  useEffect(() => {
    const shouldTrigger =
      !loading &&
      !processLoading &&
      (submissionId || publicId) &&
      report == null &&
      !hasTriggeredProcess.current &&
      (scanStatus === "draft" || scanStatus === "pending_payment");
    if (shouldTrigger) {
      hasTriggeredProcess.current = true;
      runProcess();
    }
  }, [loading, processLoading, submissionId, scanStatus, report, runProcess]);

  useEffect(() => {
    if ((!submissionId && !publicId) || scanStatus !== "processing") return;
    const t = setInterval(loadScan, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [submissionId, publicId, scanStatus, loadScan]);

  // Post-checkout: poll until status is complete or 30s timeout
  useEffect(() => {
    if (!checkoutSuccess || !submissionId) return;
    const CHECKOUT_POLL_MS = 2000;
    const CHECKOUT_POLL_MAX_MS = 30000;
    let pollCount = 0;
    const maxPolls = Math.ceil(CHECKOUT_POLL_MAX_MS / CHECKOUT_POLL_MS);

    loadScan(); // Check immediately
    const t = setInterval(() => {
      pollCount++;
      if (pollCount >= maxPolls) {
        clearInterval(t);
        return;
      }
      loadScan();
    }, CHECKOUT_POLL_MS);

    return () => clearInterval(t);
  }, [checkoutSuccess, submissionId, loadScan]);

  const effectiveSubmissionId = submissionId ?? resolvedSubmissionId;

  async function handleUnlock() {
    if (!effectiveSubmissionId) return;
    setUnlockLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: effectiveSubmissionId,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
          ...(user?.id && { supabase_user_id: user.id }),
          ...(isComparison && { quote_type: "comparison" }),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Checkout failed");
      if (json?.url) window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setUnlockLoading(false);
    }
  }

  const preview = getPreviewFromReport(report);
  const hasScoreShape =
    report != null && typeof (report as { overall_score?: unknown }).overall_score === "number";
  const scoreShape = hasScoreShape ? (report as { overall_rating?: string; confidence?: string }) : null;
  const hasResult = hasScoreShape && scoreShape?.overall_rating;
  const ratingLabel =
    scoreShape?.overall_rating === "High Concern"
      ? "High Concern"
      : scoreShape?.overall_rating === "Moderate Concern"
        ? "Moderate Concern"
        : scoreShape?.overall_rating === "Low Concern"
          ? "Low Concern"
          : scoreShape?.overall_rating?.includes("High")
            ? "High Concern"
            : scoreShape?.overall_rating?.includes("Moderate")
              ? "Moderate Concern"
              : scoreShape?.overall_rating?.includes("Low")
                ? "Low Concern"
                : preview?.risk_level === "high"
                  ? "High Concern"
                  : preview?.risk_level === "medium"
                    ? "Moderate Concern"
                    : preview?.risk_level === "low"
                      ? "Low Concern"
                      : "—";
  const clarityLevel =
    scoreShape?.confidence === "High"
      ? "High"
      : scoreShape?.confidence === "Low"
        ? "Low"
        : scoreShape?.confidence === "Medium"
          ? "Medium"
          : preview?.confidence === "high"
            ? "High"
            : preview?.confidence === "low"
              ? "Low"
              : preview?.confidence === "medium"
                ? "Medium"
                : null;
  const clarityLabel = clarityLevel ? `Document clarity: ${clarityLevel}` : "—";

  if (!submissionId && !publicId) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-6">
        <p className="text-white/80">Missing submission. Start from the beginning.</p>
        <Link href="/start" className="mt-4 text-sm text-white underline hover:no-underline">
          Go to start
        </Link>
      </div>
    );
  }

  const isPolling = scanStatus === "processing" && report == null;
  if (loading || processLoading || isPolling) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <p className="mt-4 text-white/80">
          {processLoading || isPolling ? "Analyzing your quote…" : "Loading…"}
        </p>
        {isPolling && (
          <p className="mt-2 text-sm text-white/50">This usually takes 1–2 minutes.</p>
        )}
      </div>
    );
  }

  if (scanStatus === "failed") {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-6">
        <h1 className="text-xl font-semibold text-white">Analysis failed</h1>
        <p className="mt-2 text-white/70 max-w-md text-center">
          {errorMessage ?? "Something went wrong. You can try again."}
        </p>
        <Button
          className="mt-6"
          variant="inverted"
          onClick={() => {
            hasTriggeredProcess.current = false;
            runProcess();
          }}
          disabled={processLoading}
        >
          Retry analysis
        </Button>
        <Link href="/start" className="mt-4 text-sm text-white/60 hover:text-white">
          Back to start
        </Link>
      </div>
    );
  }

  const unlockPrice = isComparison ? 19 : 39;
  const showPaywall = !isRevised;
  const isPendingPayment = scanStatus === "pending_payment";

  const categories = hasScoreShape && Array.isArray((report as { categories?: unknown[] }).categories)
    ? (report as { categories: Array<{ name: string; score?: number; risk?: string }> }).categories
    : [];
  const highestRiskCategory = categories.find((c) => c.risk === "High" || c.risk === "Medium")?.name ?? null;

  const categoryRisks = categories.map((c) => ({
    name: c.name,
    score: typeof c.score === "number" ? c.score : 0,
    risk: (c.risk === "High" || c.risk === "Medium" || c.risk === "Low" ? c.risk : "Low") as "Low" | "Medium" | "High",
  }));
  const primaryRisk = getPrimaryRiskCategory(categoryRisks.length > 0 ? categoryRisks : undefined);
  const riskMessage =
    primaryRisk && primaryRisk.name in premiumRiskMessages && primaryRisk.name !== "fallback"
      ? premiumRiskMessages[primaryRisk.name as keyof typeof premiumRiskMessages]
      : premiumRiskMessages.fallback;

  const quickVerdict = riskMessage?.headline ?? "We pulled key pricing and scope signals from your quote.";
  const topFindingsRaw = [
    ...(preview?.red_flags?.map((f) => f.title).filter(Boolean) ?? []),
    ...(hasScoreShape && Array.isArray((report as { preview_findings?: unknown[] }).preview_findings)
      ? (report as { preview_findings: Array<{ text?: string } | string> }).preview_findings
          .slice(0, 3)
          .map((f) => (typeof f === "string" ? f : (f as { text?: string }).text ?? ""))
          .filter(Boolean)
      : []),
    ...(preview?.missing_or_unclear ?? []),
  ];
  const topFindings =
    topFindingsRaw.length > 0
      ? topFindingsRaw.slice(0, 3)
      : [
          "Scope items detected and normalized",
          "Pricing compared to local ranges",
          "Potential risk items highlighted",
        ];
  const confidenceNote = clarityLabel !== "—" ? clarityLabel : "Based on your ZIP and the items we could extract.";

  const paywallCard = showPaywall ? (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-left shadow-lg">
      <h2 className="text-xl font-semibold text-white">Know exactly what to question before you sign</h2>
      <p className="mt-2 text-sm text-white/80">
        Most homeowners discover overlooked contract details during full reviews. QuoteShield highlights risks, missing scope, and negotiation opportunities.
      </p>
      <div className="mb-5 mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="mb-1 text-xs uppercase tracking-wide text-white/40">Based on your scan results</p>
        <p className="text-sm font-semibold text-white">
          <span
            className={`mr-2 inline-block h-2 w-2 rounded-full ${
              primaryRisk?.risk === "High"
                ? "bg-red-500"
                : primaryRisk?.risk === "Medium"
                  ? "bg-yellow-400"
                  : "bg-green-400"
            }`}
          />
          {riskMessage.headline}
        </p>
        <p className="mt-1 text-sm text-white/70">{riskMessage.description}</p>
      </div>
      <Button
        className="mt-2 w-full font-semibold"
        variant="inverted"
        loading={unlockLoading}
        disabled={unlockLoading}
        onClick={handleUnlock}
      >
        {primaryRisk
          ? `Unlock Full ${primaryRisk.name} Review — $${unlockPrice} →`
          : `Unlock Full Quote Review — $${unlockPrice} →`}
      </Button>
      {primaryRisk && (
        <p className="mt-3 text-center text-xs text-white/50">
          Most issues we detect occur in <span className="font-medium text-white">{primaryRisk.name}</span> contracts.
        </p>
      )}
      <ul className="mt-4 space-y-1.5 text-xs text-white/50">
        <li className="flex items-center gap-2">✔ One-time payment</li>
        <li className="flex items-center gap-2">✔ No subscription</li>
        <li className="flex items-center gap-2">✔ Professional report included</li>
        <li className="flex items-center gap-2">✔ Takes about 60 seconds</li>
      </ul>
      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="mb-3 text-sm text-white/60">Want a copy of your snapshot summary?</p>
        <button
          type="button"
          className="w-full rounded-lg border border-white/20 py-2 text-white/80 transition hover:bg-white/5"
        >
          Email me my snapshot report
        </button>
      </div>
      <Link
        href="/dashboard"
        className="mt-5 block text-center text-sm text-white/60 hover:text-white transition"
      >
        I’ll decide later
      </Link>
    </div>
  ) : null;

  if (isPendingPayment && showPaywall) {
    return (
      <ReportPreviewPaywall
        submissionId={effectiveSubmissionId!}
        report={report!}
        variant="scan"
        price={unlockPrice}
        quickVerdict={quickVerdict}
        topFindings={topFindings}
        confidenceNote={confidenceNote}
        onUnlock={handleUnlock}
        unlockLoading={unlockLoading}
        unlockError={error}
        topContent={
          <>
            {checkoutSuccess && (
              <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Confirming payment… this can take a few seconds.
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
            <div className="mb-4 flex items-center justify-between">
              <Link href="/start" className="text-sm text-white/60 hover:text-white transition">
                ← Back
              </Link>
              <Link
                href="/signin"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/10 transition"
              >
                <svg className="h-3.5 w-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2L15 8.5L22 9.5L17 14L18 21L12 18L6 21L7 14L2 9.5L9 8.5L12 2Z" />
                </svg>
                Create account
              </Link>
            </div>
          </>
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">Free Scan Results</h1>
            <p className="mt-1 text-white/60">A quick look at your quote. Unlock the full review for the complete picture.</p>

            <div className="mt-8 space-y-6">
              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">QuoteShield Snapshot</h3>
                <div className="mt-2 flex flex-wrap items-baseline gap-3">
                  {!hasResult ? (
                    <span className="text-lg font-medium text-white/70">Processing…</span>
                  ) : (
                    <>
                      <span
                        className={`rounded-full px-3 py-1.5 text-base font-semibold ${
                          ratingLabel === "High Concern"
                            ? "bg-red-500/20 text-red-300"
                            : ratingLabel === "Moderate Concern"
                              ? "bg-amber-500/20 text-amber-300"
                              : ratingLabel === "Low Concern"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-white/10 text-white/90"
                        }`}
                      >
                        {ratingLabel}
                      </span>
                      <span className="text-white/60">·</span>
                      <span className="text-sm text-white/80">{clarityLabel}</span>
                    </>
                  )}
                </div>
                {hasResult && (
                  <>
                    <p className="mt-1 text-xs text-white/40">
                      Shows how detailed and complete the contractor quote is.
                    </p>
                    <p className="mt-2 text-xs text-white/35">
                      Detailed scoring available in full review
                    </p>
                  </>
                )}
                <p className="mt-3 text-sm text-white/50">
                  This quick scan highlights potential risk areas and how clearly your contractor documented the project. The full review verifies scope accuracy, pricing structure, and contract protections.
                </p>
              </section>

              {hasScoreShape &&
                Array.isArray((report as { categories?: unknown[] }).categories) &&
                ((report as { categories: Array<{ name: string; score?: number; risk?: string }> }).categories.length > 0) && (
                <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Category risk</h3>
                  <p className="mt-1 text-xs text-white/50">These categories indicate where deeper review is most valuable.</p>
                  {/* Free scan only: colored risk label, no score. Premium report shows full detail including scores. */}
                  <ul className="mt-3 space-y-3">
                    {(report as { categories: Array<{ name: string; score?: number; risk?: string }> }).categories.map((c, i) => (
                      <li key={i}>
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="text-white/90">{c.name}</span>
                          <span
                            className={
                              c.risk === "High"
                                ? "text-red-400"
                                : c.risk === "Medium"
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                            }
                          >
                            {c.risk ?? "—"}
                          </span>
                        </div>
                        {CATEGORY_HELPER[c.name] && (
                          <p className="mt-0.5 text-xs text-white/45">{CATEGORY_HELPER[c.name]}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {hasScoreShape && (
                <>
                  <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                    <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">What We Found</h3>
                    {Array.isArray((report as { preview_findings?: unknown[] }).preview_findings) &&
                     (report as { preview_findings: Array<{ text?: string; severity?: string } | string> }).preview_findings.length > 0 && (
                      <ul className="mt-3 space-y-2 list-none pl-0">
                        {(report as { preview_findings: Array<{ text?: string; severity?: string } | string> }).preview_findings
                          .slice(0, 4)
                          .map((item, i) => {
                            const f = typeof item === "string" ? { text: item, severity: "warning" as const } : item;
                            const text = f?.text ?? (typeof item === "string" ? item : "");
                            const sev = f?.severity ?? "warning";
                            const bulletClass =
                              sev === "risk"
                                ? "text-red-400/90"
                                : sev === "positive"
                                  ? "text-emerald-400/90"
                                  : "text-amber-400/80";
                            return (
                              <li key={i} className="flex gap-2">
                                <span className={`shrink-0 ${bulletClass}`}>•</span>
                                <span className="text-white/90">{text}</span>
                              </li>
                            );
                          })}
                      </ul>
                    )}
                  </section>
                </>
              )}

              <section className="relative mt-6 rounded-xl border border-amber-500/15 bg-white/[0.015] p-6 overflow-hidden">
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                  Premium Review Insights
                  <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-400/80 opacity-90">
                    Premium
                  </span>
                </h3>
                <p className="mt-3 text-sm text-white/80">
                  We analyze your quote beyond the quick scan to verify:
                </p>
                <ul className="mt-3 space-y-2 text-sm text-white/60">
                  <li className="flex gap-2">
                    <span className="text-white/40 shrink-0">•</span>
                    <span>Pricing accuracy across materials and labor</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-white/40 shrink-0">•</span>
                    <span>Missing scope items that could cause change orders</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-white/40 shrink-0">•</span>
                    <span>Contract protections and warranty coverage</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-white/40 shrink-0">•</span>
                    <span>Safer payment and milestone structure</span>
                  </li>
                </ul>
                <p className="mt-4 text-xs text-white/50">
                  Built specifically from your uploaded quote.
                </p>
                <p className="mt-2 text-[11px] text-white/40">
                  Most customers upgrade to confirm pricing and contract protections before signing.
                </p>
              </section>

              {(preview?.red_flags?.length ?? 0) > 0 && (
                <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Top red flags</h3>
                  <ul className="mt-3 space-y-3">
                    {preview!.red_flags!.slice(0, 2).map((f, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-red-400 shrink-0">•</span>
                        <div>
                          <span className="font-medium text-white">{f.title}</span>
                          {f.detail && <p className="mt-0.5 text-sm text-white/70">{f.detail}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {(preview?.missing_or_unclear?.length ?? 0) > 0 && (
                <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Missing or unclear</h3>
                  <ul className="mt-3 list-disc list-inside space-y-1 text-white/90">
                    {preview!.missing_or_unclear!.slice(0, 3).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>
              )}

              {(preview?.questions_to_ask?.length ?? 0) > 0 && (
                <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Questions to ask</h3>
                  <ul className="mt-3 list-disc list-inside space-y-1 text-white/90">
                    {preview!.questions_to_ask!.slice(0, 3).map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>

          {showPaywall && (
            <aside className="hidden lg:block lg:sticky lg:top-8 lg:self-start">
              {paywallCard}
            </aside>
          )}
        </div>

        {showPaywall && (
          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-neutral-950/95 backdrop-blur lg:hidden">
            <div className="mx-auto max-w-lg px-4 py-4 flex flex-col gap-2">
              <Button
                variant="inverted"
                className="w-full"
                loading={unlockLoading}
                disabled={unlockLoading}
                onClick={handleUnlock}
              >
                {primaryRisk
                  ? `Unlock Full ${primaryRisk.name} Review — $${unlockPrice} →`
                  : `Unlock Full Quote Review — $${unlockPrice} →`}
              </Button>
              <Link href="/dashboard" className="text-center text-xs text-white/50 hover:text-white/70">
                Save and come back later
              </Link>
            </div>
          </div>
        )}

        <div className={showPaywall ? "h-24 lg:hidden" : "h-8"} />
      </div>
    </div>
  );
}
