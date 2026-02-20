"use client";

import Link from "next/link";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import Button from "@/components/ui/Button";
import { useState } from "react";

const LOCKED_SECTIONS = [
  { title: "Scope audit (locked)", desc: "See what's missing, vague, or risky in the scope." },
  { title: "Pricing breakdown (locked)", desc: "Line-by-line ranges for labor and materials in your ZIP." },
  { title: "Timeline & milestones (locked)", desc: "What to put in writing before work starts." },
  { title: "Negotiation checklist (locked)", desc: "Exact questions to reduce change orders and cost." },
] as const;

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function getPreviewFromReport(report: Record<string, unknown>) {
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

interface ReportPreviewPaywallProps {
  submissionId: string;
  report: Record<string, unknown>;
  /** Optional; if provided, "Save and come back" can link to report later */
  token?: string | null;
  /** "scan" = /start/scan context, "token" = /r/[token] context. Default "token". */
  variant?: "scan" | "token";
  /** Price to display. Default 39. */
  price?: number;
  /** Override quick verdict (scan page uses riskMessage.headline). */
  quickVerdict?: string;
  /** Override top findings (scan page has preview_findings). */
  topFindings?: string[];
  /** Override confidence note. */
  confidenceNote?: string;
  /** Override unlock handler (scan page passes quote_type for comparison). */
  onUnlock?: () => void | Promise<void>;
  /** Override loading state. */
  unlockLoading?: boolean;
  /** Override error message. */
  unlockError?: string | null;
  /** Optional content above main layout (e.g. error banner, back link). */
  topContent?: React.ReactNode;
}

export default function ReportPreviewPaywall({
  submissionId,
  report,
  token: _token,
  variant = "token",
  price: priceProp,
  quickVerdict: quickVerdictProp,
  topFindings: topFindingsProp,
  confidenceNote: confidenceNoteProp,
  onUnlock: onUnlockProp,
  unlockLoading: unlockLoadingProp,
  unlockError: unlockErrorProp,
  topContent,
}: ReportPreviewPaywallProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const preview = getPreviewFromReport(report);

  const confidenceNote =
    confidenceNoteProp ??
    (preview.confidence === "high"
      ? "Document clarity: High"
      : preview.confidence === "low"
        ? "Document clarity: Low"
        : preview.confidence === "medium"
          ? "Document clarity: Medium"
          : "Based on your ZIP and the items we could extract.");

  const quickVerdict =
    quickVerdictProp ??
    (preview.red_flags?.[0]?.title || "We pulled key pricing and scope signals from your quote.");

  const topFindingsRaw = [
    ...(preview.red_flags?.map((f) => f.title).filter(Boolean) ?? []),
    ...(preview.missing_or_unclear ?? []),
    ...(preview.questions_to_ask ?? []),
  ];
  const topFindings =
    topFindingsProp ??
    (topFindingsRaw.length > 0
      ? topFindingsRaw.slice(0, 3)
      : [
          "Scope items detected and normalized",
          "Pricing compared to local ranges",
          "Potential risk items highlighted",
        ]);

  const price = priceProp ?? 39;

  async function internalHandleUnlock() {
    setInternalLoading(true);
    setInternalError(null);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
          ...(user?.id && { supabase_user_id: user.id }),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Checkout failed");
      if (json?.url) window.location.href = json.url;
    } catch (e) {
      setInternalError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setInternalLoading(false);
    }
  }

  const onUnlock = onUnlockProp ?? internalHandleUnlock;
  const unlockLoading = unlockLoadingProp ?? internalLoading;
  const unlockError = unlockErrorProp ?? internalError;

  const headerTitle = variant === "token" ? "Preview ready" : "Your free scan is ready";
  const headerSubhead =
    variant === "token"
      ? "Unlock the full review to see the full breakdown and red flags."
      : "Unlock the full review to see scope gaps, pricing ranges, and what to ask before you sign.";

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="min-w-0 lg:col-span-7">
            {topContent}

            <h1 className="text-xl font-semibold text-white sm:text-2xl">{headerTitle}</h1>
            <p className="mt-1 text-white/70">{headerSubhead}</p>
            {variant === "token" && (
              <p className="mt-2 text-sm text-white/60">You can come back anytime using this link.</p>
            )}

            {/* Mobile: CTA early */}
            <div className="mt-5 lg:hidden">
              <PurchaseCard
                price={price}
                onUnlock={onUnlock}
                unlockLoading={unlockLoading}
                unlockError={unlockError}
                variant={variant}
              />
            </div>

            {/* Free preview card */}
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.06] p-5">
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-white/40">Quick verdict</h3>
              <p className="mt-2 font-medium text-white">{quickVerdict}</p>
              {topFindings.length > 0 && (
                <>
                  <h3 className="mt-4 text-[11px] font-medium uppercase tracking-wider text-white/40">Top findings</h3>
                  <ul className="mt-2 space-y-1">
                    {topFindings.slice(0, 3).map((item, i) => (
                      <li key={i} className="flex gap-2 text-sm text-white/90">
                        <span className="shrink-0 text-amber-400">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {confidenceNote && (
                <p className="mt-4 text-xs text-white/45">{confidenceNote}</p>
              )}
            </div>

            {/* Locked sections */}
            <div className="mt-5 space-y-4">
              {LOCKED_SECTIONS.map((s) => (
                <LockedSectionCard key={s.title} title={s.title} desc={s.desc} />
              ))}
            </div>

            {/* Trust row */}
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-white/50">
              <span>Secure checkout</span>
              <span className="text-white/30">·</span>
              <span>No subscription</span>
              <span className="text-white/30">·</span>
              <span>Instant unlock</span>
            </div>
          </div>

          <aside className="hidden lg:block lg:col-span-5 lg:sticky lg:top-8 lg:self-start">
            <PurchaseCard
              price={price}
              onUnlock={onUnlock}
              unlockLoading={unlockLoading}
              unlockError={unlockError}
              variant={variant}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

function LockedSectionCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="relative rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="absolute right-4 top-4 text-white/40">
        <LockIcon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-white/70 pr-8">{title}</h3>
        <p className="mt-0.5 text-sm text-white/50">{desc}</p>
      </div>
    </div>
  );
}

function PurchaseCard({
  price,
  onUnlock,
  unlockLoading,
  unlockError,
  variant,
}: {
  price: number;
  onUnlock: () => void | Promise<void>;
  unlockLoading: boolean;
  unlockError?: string | null;
  variant: "scan" | "token";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-5 shadow-lg">
      <h3 className="text-lg font-semibold text-white">Unlock full review</h3>
      <p className="mt-1 text-2xl font-bold text-white">
        ${price} <span className="text-base font-normal text-white/60">· One-time</span>
      </p>
      <ul className="mt-4 space-y-2 text-sm text-white/90">
        <li className="flex items-center gap-2">
          <span className="text-emerald-400">✓</span> Full scope audit & red flags
        </li>
        <li className="flex items-center gap-2">
          <span className="text-emerald-400">✓</span> Line-by-line pricing insights
        </li>
        <li className="flex items-center gap-2">
          <span className="text-emerald-400">✓</span> Timeline review
        </li>
        <li className="flex items-center gap-2">
          <span className="text-emerald-400">✓</span> Negotiation checklist
        </li>
      </ul>
      {unlockError && (
        <p className="mt-4 text-center text-sm text-red-400" role="alert">
          {unlockError}
        </p>
      )}
      <Button
        className="mt-5 w-full font-semibold"
        variant="inverted"
        loading={unlockLoading}
        disabled={unlockLoading}
        onClick={onUnlock}
      >
        Unlock full review
      </Button>
      <p className="mt-3 text-center text-xs text-white/50">Secure checkout · No subscription</p>
      <Link
        href="/dashboard"
        className="mt-4 block text-center text-sm text-white/50 transition hover:text-white/80"
      >
        {variant === "token" ? "Open dashboard" : "I'll decide later"}
      </Link>
      {variant === "scan" && (
        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h4 className="text-[11px] font-medium uppercase tracking-wider text-white/40">What happens next</h4>
          <ul className="mt-2 space-y-1.5 text-sm text-white/70">
            <li>Unlock the full review</li>
            <li>See line-by-line pricing and scope gaps</li>
            <li>Download and use it to negotiate</li>
          </ul>
        </div>
      )}
    </div>
  );
}
