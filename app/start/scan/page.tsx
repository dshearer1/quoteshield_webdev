"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import Button from "@/components/ui/Button";
import ReportPreviewPaywall from "@/components/ReportPreviewPaywall";
import AnalysisLoadingScreen from "@/components/AnalysisLoadingScreen";

const POLL_INTERVAL_MS = 2500;

export default function StartScanPage() {
  const searchParams = useSearchParams();
  const submissionId = searchParams.get("submissionId") ?? searchParams.get("submission_id");
  const checkoutSuccess = searchParams.get("checkout") === "success";
  const publicId = searchParams.get("public_id") ?? searchParams.get("token");
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [lineItems, setLineItems] = useState<unknown[] | null>(null);
  const [quoteType, setQuoteType] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processLoading, setProcessLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [resolvedSubmissionId, setResolvedSubmissionId] = useState<string | null>(null);
  const [transitioningFromAnalysis, setTransitioningFromAnalysis] = useState(false);
  const [accountCreatedConfirmation, setAccountCreatedConfirmation] = useState(false);
  const wasPollingRef = useRef(false);
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
    setAnalysis(data.analysis ?? null);
    setLineItems(data.lineItems ?? null);
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

  // Track when we were polling so we can run completion transition when report arrives
  if (isPolling) wasPollingRef.current = true;
  useEffect(() => {
    if (report != null && wasPollingRef.current) {
      wasPollingRef.current = false;
      setTransitioningFromAnalysis(true);
    }
  }, [report]);

  const showAnalysisScreen = loading || processLoading || isPolling || transitioningFromAnalysis;

  if (showAnalysisScreen) {
    return (
      <AnalysisLoadingScreen
        isComplete={!!report && transitioningFromAnalysis}
        onTransitionComplete={() => setTransitioningFromAnalysis(false)}
      />
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

  if (report) {
    return (
      <div className="relative min-h-screen animate-fade-in">
        <ReportPreviewPaywall
          submissionId={effectiveSubmissionId!}
          report={report}
          analysis={analysis}
          lineItems={lineItems}
          variant="scan"
          price={unlockPrice}
          showUpgradeCta={showPaywall}
          onUnlock={handleUnlock}
          unlockLoading={unlockLoading}
          unlockError={error}
          topContent={
            <>
              {accountCreatedConfirmation && (
                <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  Scan saved to your account. You can access it anytime from your dashboard.
                </div>
              )}
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
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-6">
      <p className="text-white/80">No report available. Start from the beginning.</p>
      <Link href="/start" className="mt-4 text-sm text-white underline hover:no-underline">
        Go to start
      </Link>
    </div>
  );
}