"use client";

import Link from "next/link";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import Button from "@/components/ui/Button";
import DeepAuditCTA from "@/components/DeepAuditCTA";
import { useState, useCallback } from "react";

/** From submission_analysis: used for free report pricing + benchmark + transparency */
export type SubmissionAnalysisForFree = {
  pricing_position?: string | null;
  job_units?: number | null;
  job_unit_name?: string | null;
  effective_unit_price?: number | null;
  pricing_confidence?: number | null;
  benchmark_snapshot?: {
    unit_low?: number;
    unit_mid?: number;
    unit_high?: number;
    low?: number;
    mid?: number;
    high?: number;
    source?: string;
    effective_date?: string;
  } | null;
  pricing_engine_result?: {
    notes?: string[];
    roof_squares_method?: string;
  } | null;
};

const ROOFING_CARDS = [
  {
    title: "Scope & Tear-Off Details",
    shortStatus: "Needs Clarification",
    statusVariant: "defined" as const,
    whyAffectsPrice: "Decking and tear-off are the #1 driver of change orders.",
    whyItMatters:
      "Roofing disputes often arise from what was not included in the tear-off or decking repair scope.",
    confirmInWriting: [
      "Number of shingle layers being removed",
      "Whether rotten decking replacement is included or billed separately",
      "Disposal and dumpster fees included",
      "Ice & water shield coverage areas defined",
    ],
    potentialExposure:
      "Decking replacement and underlayment upgrades are common sources of change orders.",
  },
  {
    title: "Material Specifications",
    shortStatus: "Verify",
    statusVariant: "listed" as const,
    whyAffectsPrice: "Warranty and material quality directly affect value for the price.",
    whyItMatters:
      "Warranty validity depends on exact material system and installation method.",
    confirmInWriting: [
      "Exact shingle model and manufacturer",
      "Underlayment type (synthetic vs felt)",
      "Ventilation components included",
      "Who registers the manufacturer warranty",
    ],
    potentialExposure:
      "Improper registration or mixed product systems can void enhanced warranties.",
  },
  {
    title: "Pricing Structure Transparency",
    shortStatus: "Pricing Detail Needed",
    statusVariant: "limited" as const,
    whyAffectsPrice: "Without unit pricing, change orders are harder to validate.",
    whyItMatters:
      "Without per-square or per-component pricing, it is harder to validate change orders.",
    confirmInWriting: [
      "Price per square",
      "Rate for additional decking replacement",
      "Flashing replacement pricing",
      "Upgrade pricing separated from base scope",
    ],
    potentialExposure:
      "Undefined unit pricing increases risk of cost escalation.",
  },
  {
    title: "Change Orders & Payment Terms",
    shortStatus: "Add Safeguard",
    statusVariant: "requires" as const,
    whyAffectsPrice: "Hidden conditions often lead to unbounded change orders.",
    whyItMatters:
      "Roofing projects frequently uncover hidden conditions.",
    confirmInWriting: [
      "Change orders must be signed before additional work",
      "Decking replacement pricing clearly defined",
      "Deposit percentage and payment schedule",
      "Final payment tied to completion and cleanup",
    ],
    potentialExposure:
      "Undefined change procedures increase financial risk.",
  },
];

const LOCKED_PREVIEW_BLOCKS = [
  { title: "Exact Overcharge Estimate (if applicable)", desc: "Quantified estimate of potential overcharge based on line-item analysis." },
  { title: "Line-by-Line Cost Comparison", desc: "Compare each major line item to verified local pricing ranges." },
  { title: "Risk-Weighted Decking Exposure Model", desc: "Understand hidden decking cost exposure before work begins." },
  { title: "Market Position Percentile", desc: "See where your quote falls versus local market distribution." },
  { title: "Written Negotiation Script", desc: "Ready-to-use language for price and scope discussions." },
  { title: "Contract Language Revision Suggestions", desc: "Specific edits to strengthen your contract protections." },
] as const;

const SMART_QUESTIONS_GROUPED = {
  Pricing: [
    "What is your price per square?",
    "What's your rate for additional decking replacement (per sheet)?",
    "Are upgrades priced separately from base scope?",
  ],
  Scope: [
    "How many layers are being removed?",
    "Are disposal/dumpster fees included?",
    "Is flashing/drip edge included or excluded?",
  ],
  Protection: [
    "Who registers the manufacturer warranty?",
    "Can you provide proof of liability + workers comp?",
    "Who pulls permits?",
  ],
} as const;

const CONTRACTOR_CHECKLIST = [
  "Active contractor license in your state",
  "General liability insurance",
  "Workers compensation coverage",
  "Permit responsibility defined",
  "Cleanup and debris removal included",
  "Timeline and weather delays addressed",
];

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

type PricingPosition = "within" | "elevated" | "above";

function getPricingPositionFromReport(report: Record<string, unknown>): { position: PricingPosition; label: string } {
  const benchmark = (report.benchmark_snapshot ?? report) as {
    market_range?: { low?: number; mid?: number; high?: number };
    quote_total?: number;
    normalized_quantity?: number;
    unit_price_estimated?: number;
  } | null;
  const summary = (report.summary ?? {}) as Record<string, unknown>;
  const quoteTotal = Number(summary.total ?? summary.quote_total ?? benchmark?.quote_total ?? 0);
  const range = benchmark?.market_range;
  const mid = range?.mid ?? (range?.low != null && range?.high != null ? (range.low + range.high) / 2 : null);
  if (quoteTotal <= 0 || mid == null || !Number.isFinite(mid)) {
    return { position: "within", label: "Within Expected Range" };
  }
  const pctAbove = ((quoteTotal - mid) / mid) * 100;
  if (pctAbove <= 10) return { position: "within", label: "Within Expected Range" };
  if (pctAbove <= 25) return { position: "elevated", label: "Slightly Elevated — Review Recommended" };
  return { position: "above", label: "Above Market Range — Investigation Recommended" };
}

function getMarketAnalysisFromReport(report: Record<string, unknown>): {
  squares: number | null;
  marketLowPerSq: number | null;
  marketHighPerSq: number | null;
  quotedRatePerSq: number | null;
  positionLabel: string;
  pctAboveMidpoint: number | null;
} {
  const benchmark = (report.benchmark_snapshot ?? report) as {
    market_range?: { low?: number; mid?: number; high?: number };
    quote_total?: number;
    normalized_quantity?: number;
    unit_price_estimated?: number;
  } | null;
  const summary = (report.summary ?? {}) as Record<string, unknown>;
  const quoteTotal = Number(summary.total ?? summary.quote_total ?? benchmark?.quote_total ?? 0);
  const squares = benchmark?.normalized_quantity ?? null;
  const range = benchmark?.market_range;
  const low = range?.low ?? null;
  const high = range?.high ?? null;
  const mid = range?.mid ?? (low != null && high != null ? (low + high) / 2 : null);

  let marketLowPerSq: number | null = null;
  let marketHighPerSq: number | null = null;
  let quotedRatePerSq: number | null = null;
  let pctAboveMidpoint: number | null = null;
  let positionLabel = "Within Range";

  if (squares != null && squares > 0 && quoteTotal > 0) {
    quotedRatePerSq = Math.round((quoteTotal / squares) * 10) / 10;
    if (low != null && high != null) {
      marketLowPerSq = Math.round((low / squares) * 10) / 10;
      marketHighPerSq = Math.round((high / squares) * 10) / 10;
      const midVal = mid != null ? mid : (low + high) / 2;
      pctAboveMidpoint = Math.round(((quoteTotal - midVal) / midVal) * 100);
      if (pctAboveMidpoint > 15) positionLabel = "Significantly Above";
      else if (pctAboveMidpoint > 5) positionLabel = "Above Range";
      else positionLabel = "Within Range";
    }
  } else if (quoteTotal > 0 && low != null && high != null) {
    positionLabel = quoteTotal > high ? "Above Range" : quoteTotal < low ? "Below Range" : "Within Range";
    if (mid != null) pctAboveMidpoint = Math.round(((quoteTotal - mid) / mid) * 100);
  }

  return {
    squares: squares != null && squares > 0 ? squares : null,
    marketLowPerSq,
    marketHighPerSq,
    quotedRatePerSq,
    positionLabel,
    pctAboveMidpoint,
  };
}

function getPricingPositionLabelAndSentence(position: string | undefined | null): { label: string; sentence: string } {
  const p = (position ?? "").toLowerCase().replace(/\s+/g, "_");
  if (p.includes("significantly") || p === "significantly_above") return { label: "Significantly Above Market Range", sentence: "This quote appears well above local norms; investigate and negotiate before proceeding." };
  if (p.includes("above") || p === "above_market") return { label: "Above Market Range", sentence: "This quote appears higher than typical local pricing; review scope and quantities before signing." };
  if (p.includes("below")) return { label: "Below Market Range", sentence: "This quote appears below typical local pricing; verify scope quality and warranty terms." };
  return { label: "Within Expected Range", sentence: "This quote appears aligned with typical pricing for your area." };
}

function getBenchmarkFromAnalysis(analysis: SubmissionAnalysisForFree | Record<string, unknown> | null): {
  unitLow: number | null;
  unitHigh: number | null;
  source?: string;
  effectiveDate?: string;
} {
  const snap = (analysis as SubmissionAnalysisForFree)?.benchmark_snapshot as Record<string, unknown> | null | undefined;
  if (!snap || typeof snap !== "object") return { unitLow: null, unitHigh: null };
  const range = snap.market_range as { low?: number; mid?: number; high?: number } | undefined;
  const low = (snap.unit_low as number | undefined) ?? (snap.low as number | undefined) ?? range?.low;
  const high = (snap.unit_high as number | undefined) ?? (snap.high as number | undefined) ?? range?.high;
  const source = snap.source as string | undefined;
  const effectiveDate = snap.effective_date as string | undefined;
  return {
    unitLow: typeof low === "number" && Number.isFinite(low) ? low : null,
    unitHigh: typeof high === "number" && Number.isFinite(high) ? high : null,
    source,
    effectiveDate,
  };
}

type SignalStatus = "pass" | "warn" | "unknown";

function SignalRow({ label, status }: { label: string; status: SignalStatus }) {
  const display = status === "unknown" ? "Not available in quote" : status === "pass" ? "OK" : "Review";
  const color = status === "pass" ? "text-emerald-400/90" : status === "warn" ? "text-amber-400/90" : "text-white/50";
  return (
    <li className="flex items-center justify-between gap-4 flex-wrap">
      <span className="text-white/85">{label}</span>
      <span className={`text-xs font-medium shrink-0 ${color}`}>{display}</span>
    </li>
  );
}

function CopyQuestionsButton() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    const lines: string[] = [];
    Object.entries(SMART_QUESTIONS_GROUPED).forEach(([group, questions]) => {
      lines.push(`${group}:`);
      questions.forEach((q) => lines.push(`• ${q}`));
      lines.push("");
    });
    const text = lines.join("\n").trim();
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);
  return (
    <Button type="button" variant="ghost" className="text-sm border border-white/20" onClick={copy}>
      {copied ? "Copied!" : "Copy questions"}
    </Button>
  );
}

interface ReportPreviewPaywallProps {
  submissionId: string;
  report: Record<string, unknown>;
  /** From submission_analysis; primary source for pricing/benchmark/transparency when present */
  analysis?: SubmissionAnalysisForFree | Record<string, unknown> | null;
  /** Lightweight line items for signals; not rendered as full table in free */
  lineItems?: unknown[] | null;
  token?: string | null;
  variant?: "scan" | "token";
  price?: number;
  quickVerdict?: string;
  topFindings?: string[];
  confidenceNote?: string;
  onUnlock?: () => void | Promise<void>;
  unlockLoading?: boolean;
  unlockError?: string | null;
  topContent?: React.ReactNode;
  /** When false, hide the bottom upgrade CTA (e.g. revised quote). Default true. */
  showUpgradeCta?: boolean;
}

export default function ReportPreviewPaywall({
  submissionId,
  report,
  analysis: analysisProp,
  lineItems: _lineItems,
  token: _token,
  variant = "token",
  price: priceProp,
  onUnlock: onUnlockProp,
  unlockLoading: unlockLoadingProp,
  unlockError: unlockErrorProp,
  topContent,
  showUpgradeCta = true,
}: ReportPreviewPaywallProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [howCalculatedOpen, setHowCalculatedOpen] = useState(false);

  const price = priceProp ?? 39;
  const analysis = analysisProp as SubmissionAnalysisForFree | null | undefined;

  const jobUnits = analysis?.job_units != null && Number.isFinite(analysis.job_units) ? Number(analysis.job_units) : null;
  const effectiveUnitPrice = analysis?.effective_unit_price != null && Number.isFinite(analysis.effective_unit_price) ? Number(analysis.effective_unit_price) : null;
  const pricingConfidence = analysis?.pricing_confidence != null && Number.isFinite(analysis.pricing_confidence) ? Number(analysis.pricing_confidence) : null;
  const pricingPositionRaw = analysis?.pricing_position ?? null;
  const benchmark = getBenchmarkFromAnalysis(analysis ?? null);
  const reportFallback = getMarketAnalysisFromReport(report);
  const reportPosition = getPricingPositionFromReport(report);

  const squares = jobUnits ?? reportFallback.squares;
  const effectivePerSq = effectiveUnitPrice ?? reportFallback.quotedRatePerSq;
  const benchmarkLow = benchmark.unitLow ?? reportFallback.marketLowPerSq;
  const benchmarkHigh = benchmark.unitHigh ?? reportFallback.marketHighPerSq;
  const hasBenchmark = benchmarkLow != null && benchmarkHigh != null;
  const positionLabelAndSentence = pricingPositionRaw
    ? getPricingPositionLabelAndSentence(pricingPositionRaw)
    : { label: reportPosition.label, sentence: getPricingPositionLabelAndSentence(reportFallback.positionLabel).sentence };

  const notEnoughData = squares == null || effectivePerSq == null;

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

  const maxWidthClass = "mx-auto max-w-3xl";

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className={`${maxWidthClass} px-4 py-10 sm:px-6 lg:px-8`}>
        {topContent}

        {/* Hero */}
        <header className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Roofing Price Validation & Transparency Report
          </h1>
          <p className="mt-3 text-white/70 max-w-2xl leading-relaxed">
            We estimated roof size and price-per-square, compared your quote to local benchmarks, and flagged items to clarify before you sign.
          </p>
        </header>

        {/* Not enough data banner */}
        {notEnoughData && (
          <section className="mb-8 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
            <p className="text-sm font-medium text-amber-200">Not enough data yet</p>
            <p className="mt-1 text-sm text-white/80">We need roof size and pricing from your quote to show benchmarks. Confirm roof squares with your contractor if your quote doesn’t list them.</p>
          </section>
        )}

        {/* Market Snapshot — 3 columns */}
        <section className="mb-12 rounded-xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-white/40 mb-6">
            Market Snapshot
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/50 mb-1">Your Estimated Roof Size</p>
              <p className="text-xl font-semibold text-white">
                {squares != null ? `${squares} squares` : "—"}
              </p>
              <p
                className="mt-0.5 text-xs text-white/50"
                title={
                  analysis?.pricing_engine_result
                    ? [((analysis.pricing_engine_result as { roof_squares_method?: string }).roof_squares_method && `Method: ${(analysis.pricing_engine_result as { roof_squares_method: string }).roof_squares_method}`), (analysis.pricing_engine_result as { notes?: string[] }).notes?.slice(0, 2).join(" ")].filter(Boolean).join("\n")
                    : undefined
                }
              >
                Estimated from quote line items
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/50 mb-1">Your Effective Price</p>
              <p className="text-xl font-semibold text-white">
                {effectivePerSq != null ? `$${effectivePerSq.toLocaleString()}/square` : "—"}
              </p>
              <p className="mt-0.5 text-xs text-white/50">Based on comparable roofing scope</p>
            </div>
            {hasBenchmark && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/50 mb-1">Local Market Range</p>
                <p className="text-xl font-semibold text-white">
                  ${benchmarkLow!.toLocaleString()}–${benchmarkHigh!.toLocaleString()}/square
                </p>
                <p
                  className="mt-0.5 text-xs text-white/50"
                  title={benchmark.source || benchmark.effectiveDate ? `Data source: ${benchmark.source ?? "—"} ${benchmark.effectiveDate ?? ""}`.trim() : undefined}
                >
                  Typical range for your area
                </p>
              </div>
            )}
            {!hasBenchmark && !notEnoughData && (
              <div className="sm:col-span-2" />
            )}
          </div>
          {!hasBenchmark && !notEnoughData && (
            <p className="mt-4 text-sm text-white/70">
              Benchmark not available for your area yet. We can still provide negotiation and scope safeguards below.
            </p>
          )}
          <div className="mt-6 pt-6 border-t border-white/10">
            {notEnoughData && (
              <p className="text-sm text-white/85 leading-relaxed">
                {squares == null && effectivePerSq == null
                  ? "Pricing estimate pending. Roof size and price per square could not be determined from this quote."
                  : squares == null
                    ? "Missing roof size. We couldn't determine squares from the quote; confirm with your contractor."
                    : "Pricing estimate pending. Effective price per square could not be determined."}
              </p>
            )}
            {!notEnoughData && !hasBenchmark && (
              <p className="text-sm text-white/85 leading-relaxed">
                Benchmark not available yet. Roof size and effective $/square are shown above.
              </p>
            )}
            {!notEnoughData && hasBenchmark && (
              <>
                <span className="inline-block rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white/90 max-w-[200px] truncate" title={positionLabelAndSentence.label}>
                  {positionLabelAndSentence.label}
                </span>
                <p className="mt-3 text-sm text-white/85 leading-relaxed">
                  {positionLabelAndSentence.sentence}
                </p>
              </>
            )}
          </div>
        </section>

        {/* How we calculated — collapsible */}
        <section className="mb-12 rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <button
            type="button"
            onClick={() => setHowCalculatedOpen((o) => !o)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/[0.03] transition"
          >
            <h2 className="text-sm font-semibold text-white">How this estimate was calculated</h2>
            <span className="text-white/50">{howCalculatedOpen ? "▼" : "▶"}</span>
          </button>
          {howCalculatedOpen && (
            <div className="px-6 pb-6 pt-0 border-t border-white/10 space-y-3 text-sm text-white/85">
              {jobUnits != null && <p>Roof size estimate: {jobUnits} squares</p>}
              {(analysis?.pricing_engine_result as { roof_squares_method?: string } | undefined)?.roof_squares_method && (
                <p>Method: {(analysis!.pricing_engine_result as { roof_squares_method: string }).roof_squares_method}</p>
              )}
              {Array.isArray((analysis?.pricing_engine_result as { notes?: string[] })?.notes) &&
                ((analysis!.pricing_engine_result as { notes: string[] }).notes as string[])
                  .slice(0, 4)
                  .map((note, i) => (
                    <li key={i} className="list-disc list-inside">{note}</li>
                  ))}
              {pricingConfidence != null && (
                <p className="pt-1">
                  {pricingConfidence >= 0.75
                    ? "High confidence estimate"
                    : pricingConfidence >= 0.5
                      ? "Moderate confidence estimate"
                      : "Estimate may vary — confirm roof squares with contractor"}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Material & Quantity Signals — only show evaluable signals */}
        <section className="mb-12 rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-white/40 mb-4">
            Material & Quantity Signals
          </h2>
          {squares != null ? (
            <ul className="space-y-3 text-sm">
              <SignalRow label={`Roof squares identified in line items: ${squares}`} status="pass" />
            </ul>
          ) : (
            <p className="text-sm text-white/60">
              No quantity signals could be validated from this quote format.
            </p>
          )}
        </section>

        {/* Negotiation Levers */}
        <section className="mb-12">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-white/40 mb-4">
            Negotiation Levers (What to clarify to avoid overcharges)
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {ROOFING_CARDS.map((card) => (
              <RoofingCard key={card.title} card={card} />
            ))}
          </div>
        </section>

        {/* What's a normal markup? */}
        <section className="mb-12 rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-white/40 mb-2">
            What's a normal markup?
          </h2>
          <p className="text-sm text-white/85 leading-relaxed mb-2">
            Most roofing quotes include labor, overhead, and profit — that's normal.
          </p>
          <p className="text-sm text-white/85 leading-relaxed mb-2">
            The goal is not zero markup; the goal is avoiding excessive pricing or padded quantities.
          </p>
          <p className="text-sm text-white/85 leading-relaxed">
            If your $/square is above local range, ask for: labor vs material split, decking rate, and upgrade pricing.
          </p>
        </section>

        {/* Questions to Ask — grouped + copy */}
        <section className="mb-12 rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-white/40 mb-2">
            Questions to Ask
          </h2>
          <CopyQuestionsButton />
          <div className="mt-4 space-y-6">
            {Object.entries(SMART_QUESTIONS_GROUPED).map(([group, questions]) => (
              <div key={group}>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">{group}</p>
                <ul className="space-y-1.5 text-sm text-white/85">
                  {questions.map((q, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-white/50 shrink-0">•</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Contractor Checklist — bring to contractor */}
        <section className="mb-12 rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-white/40 mb-2">
            Contractor Checklist
          </h2>
          <p className="text-sm font-medium text-white/90 mb-1">Bring this to your contractor</p>
          <p className="text-sm text-white/60 mb-4">Ask for documents, not promises.</p>
          <ul className="space-y-2 text-sm text-white/85">
            {CONTRACTOR_CHECKLIST.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-400/80 shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Premium Unlocks */}
        <section className="mb-12">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-white/40 mb-2">
            Premium Unlocks
          </h2>
          <p className="text-sm text-white/60 mb-4">
            Premium quantifies the impact (overcharge estimate, market percentile, and a negotiation script).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {LOCKED_PREVIEW_BLOCKS.map((block) => (
              <LockedPreviewBlock key={block.title} title={block.title} desc={block.desc} />
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        {showUpgradeCta && (
          <DeepAuditCTA
            price={price}
            onUnlock={onUnlock}
            unlockLoading={unlockLoading}
            unlockError={unlockError}
            secondaryLinkText={variant === "token" ? "Open dashboard" : ""}
            secondaryLinkHref={variant === "scan" ? "/start" : "/dashboard"}
          />
        )}
      </div>
    </div>
  );
}

function roofingStatusTagClass(variant: "defined" | "listed" | "limited" | "requires"): string {
  switch (variant) {
    case "defined":
      return "bg-white/8 text-white/70 border-white/15";
    case "listed":
      return "bg-white/8 text-white/70 border-white/15";
    case "limited":
      return "bg-amber-500/10 text-amber-200/90 border-amber-500/20";
    case "requires":
      return "bg-amber-500/10 text-amber-200/90 border-amber-500/20";
    default:
      return "bg-white/8 text-white/70 border-white/15";
  }
}

function RoofingCard({
  card,
}: {
  card: (typeof ROOFING_CARDS)[number];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="text-base font-semibold text-white leading-tight">{card.title}</h3>
      <span
        className={`mt-2 inline-block rounded border px-2 py-0.5 text-xs font-medium max-w-[140px] truncate ${roofingStatusTagClass(card.statusVariant)}`}
        title={card.shortStatus}
      >
        {card.shortStatus}
      </span>
      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-white/45">
        Why this affects price
      </p>
      <p className="mt-1 text-sm text-white/80 leading-relaxed">{card.whyAffectsPrice}</p>
      <p className="mt-4 text-xs font-medium uppercase tracking-wider text-white/45">
        What to confirm in writing
      </p>
      <ul className="mt-1.5 space-y-1 text-sm text-white/75">
        {card.confirmInWriting.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-white/40 shrink-0">•</span>
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs font-medium uppercase tracking-wider text-white/45">
        Potential exposure
      </p>
      <p className="mt-1 text-sm text-white/70 leading-relaxed">{card.potentialExposure}</p>
    </div>
  );
}

function LockedPreviewBlock({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="relative rounded-xl border border-white/10 bg-white/[0.03] p-4 opacity-90">
      <div className="absolute right-3 top-3 text-white/40">
        <LockIcon className="h-4 w-4" />
      </div>
      <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">Premium</span>
      <h3 className="mt-1 text-sm font-medium text-white/80 pr-8">{title}</h3>
      <p className="mt-0.5 text-sm text-white/50">{desc}</p>
    </div>
  );
}
