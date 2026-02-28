"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ReportActions } from "@/components/ReportActions";
import { Accordion } from "@/components/report/Accordion";
import {
  DEFAULT_MILESTONES,
  SCOPE_CHECKLIST_ITEMS,
  SCOPE_ITEM_TOOLTIPS,
} from "@/components/report/DefaultMilestones";
import { ContractorResponseSection } from "@/components/ContractorResponseSection";

type ReportData = Record<string, unknown>;

function ChevronDown({ className, open }: { className?: string; open: boolean }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      )}
    </svg>
  );
}

function Card({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 border-b border-white/5 px-4 py-4 text-left sm:px-6 hover:bg-white/5 transition-colors"
        aria-expanded={open}
      >
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <ChevronDown open={open} className="h-5 w-5 shrink-0 text-white/50" />
      </button>
      {open && <div className="p-4 sm:p-6">{children}</div>}
    </section>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function SeverityPill({ severity }: { severity: string }) {
  const s = severity?.toLowerCase() ?? "";
  if (s === "high")
    return (
      <span className="rounded-lg bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-200">High</span>
    );
  if (s === "medium")
    return (
      <span className="rounded-lg bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-200">
        Medium
      </span>
    );
  return (
    <span className="rounded-lg bg-white/10 px-2 py-0.5 text-xs font-medium text-white/70">Low</span>
  );
}

function formatSnapshotLabel(value: string): string {
  if (value === "missing") return "Not provided in quote";
  if (value === "weak") return "Limited detail";
  return value;
}

function SnapshotChip({
  label,
  children,
  tooltip,
}: {
  label: string;
  children: React.ReactNode;
  tooltip?: string;
}) {
  const content = (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-xs font-medium text-white/50">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-white">{children}</div>
    </div>
  );
  if (tooltip) {
    return <span title={tooltip}>{content}</span>;
  }
  return content;
}

// --- Project Snapshot ---
function ProjectSnapshot({ data }: { data: ReportData }) {
  const summary = data?.summary as Record<string, unknown> | undefined;
  const ov = data?.quote_overview as Record<string, unknown> | undefined;
  const payment = data?.payment as Record<string, unknown> | undefined;
  const timeline = data?.timeline as Record<string, unknown> | undefined;
  const scope = data?.scope as Record<string, unknown> | undefined;

  const total = summary?.total ?? ov?.quote_total;
  const currency = (summary ?? ov)?.currency ?? "USD";
  const contractor = summary?.contractor_name ?? ov?.contractor_name;
  const projectType = summary?.project_type ?? ov?.project_type;
  const riskLevel = summary?.risk_level ?? "medium";
  const qualityScore = summary?.quality_score;
  const confidence = summary?.confidence ?? data?.confidence;
  const paymentRisk = payment?.payment_risk ?? "medium";
  const timelineClarityRaw = timeline?.timeline_clarity ?? "missing";
  const timelineClarity = formatSnapshotLabel(String(timelineClarityRaw));
  const present: string[] = Array.isArray(scope?.present) ? (scope.present as string[]) : [];
  const missing: unknown[] = Array.isArray(scope?.missing_or_unclear) ? (scope.missing_or_unclear as unknown[]) : [];
  const warrantyCoverageRaw = present.some((s) => /warranty|warrant/i.test(s))
    ? "clear"
    : missing.length
      ? "basic"
      : "missing";
  const warrantyCoverage = formatSnapshotLabel(String(warrantyCoverageRaw));
  const scopeCompletenessRaw =
    present.length && missing.length
      ? present.length / (present.length + missing.length) > 0.6
        ? "strong"
        : "medium"
      : "weak";
  const scopeCompleteness = scopeCompletenessRaw === "weak" ? "Limited detail" : String(scopeCompletenessRaw);

  const contractorStr = contractor != null ? String(contractor).trim() : "";
  const projectTypeStr = projectType != null ? String(projectType).trim() : "";
  const confidenceStr = confidence != null ? String(confidence).trim() : "";

  const hasAny =
    total != null ||
    contractorStr ||
    projectTypeStr ||
    riskLevel ||
    qualityScore != null ||
    paymentRisk ||
    timelineClarityRaw ||
    scopeCompletenessRaw;

  if (!hasAny) return null;

  const riskTooltip =
    "Overall assessment of quote clarity, payment terms, and scope completeness.";
  const paymentRiskTooltip =
    "Higher risk when deposit is large or payment terms are unclear.";
  const timelineTooltip =
    timelineClarityRaw === "missing"
      ? "No project start date or completion timeframe was provided in the quote."
      : timelineClarityRaw === "basic"
        ? "Some timeline info was found but key dates or milestones may be unclear."
        : "The quote includes clear timeline or milestone information.";
  const warrantyTooltip =
    warrantyCoverageRaw === "missing"
      ? "Warranty coverage was not clearly stated in the quote."
      : "Warranty details are mentioned in the quote.";
  const scopeTooltip =
    scopeCompletenessRaw === "weak"
      ? "Several scope items are not clearly listed or are unclear."
      : "Scope and materials are largely spelled out in the quote.";

  return (
    <Card title="Project Snapshot">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">
            Decision-critical
          </p>
          <div className="flex flex-wrap gap-3">
            {total != null && (
              <SnapshotChip label="Total">
                {String(currency)} {Number(total).toLocaleString()}
              </SnapshotChip>
            )}
            {contractorStr && (
              <SnapshotChip label="Contractor">{contractorStr}</SnapshotChip>
            )}
            {projectTypeStr && (
              <SnapshotChip label="Project type">{projectTypeStr}</SnapshotChip>
            )}
            <span title={riskTooltip}>
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-xs font-medium text-white/50">Overall risk</div>
                <div className="mt-0.5">
                  <SeverityPill severity={String(riskLevel)} />
                </div>
              </div>
            </span>
            <span title={paymentRiskTooltip}>
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-xs font-medium text-white/50">Payment risk</div>
                <div className="mt-0.5">
                  <SeverityPill severity={String(paymentRisk)} />
                </div>
              </div>
            </span>
            <SnapshotChip label="Timeline clarity" tooltip={timelineTooltip}>
              {timelineClarity}
            </SnapshotChip>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">
            Supporting signals
          </p>
          <div className="flex flex-wrap gap-3">
            <SnapshotChip label="Warranty coverage" tooltip={warrantyTooltip}>
              {warrantyCoverage}
            </SnapshotChip>
            <SnapshotChip label="Scope completeness" tooltip={scopeTooltip}>
              {scopeCompleteness}
            </SnapshotChip>
            {confidenceStr && (
              <SnapshotChip label="Confidence score">
                {confidenceStr}
              </SnapshotChip>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// --- Payment & Deposit Analysis ---
function PaymentSection({ data }: { data: ReportData }) {
  const payment = data?.payment as Record<string, unknown> | undefined;
  const depositPercent = payment?.deposit_percent as number | null | undefined;
  const depositRequired = payment?.deposit_required;
  const paymentTermsText = payment?.payment_terms_text as string | null | undefined;
  const paymentRisk = payment?.payment_risk as string | undefined;

  const hasPayment = depositPercent != null || depositRequired != null || paymentTermsText;

  if (!hasPayment && !paymentRisk) return null;

  return (
    <Card title="Payment Review">
      <div className="space-y-4">
        {depositPercent != null && (
          <div>
            <div className="text-sm font-medium text-white">Deposit requested: {depositPercent}%</div>
            <p className="mt-1 text-sm text-white/60">Typical range: 10–30%. Above 30% may indicate elevated risk.</p>
          </div>
        )}
        {depositRequired != null && !depositPercent && (
          <div className="text-sm text-white/80">
            Deposit required: {depositRequired ? "Yes" : "No"}
          </div>
        )}
        {paymentTermsText && (
          <p className="text-sm text-white/70">&ldquo;{paymentTermsText}&rdquo;</p>
        )}
        {paymentRisk && (
          <div>
            <span className="text-sm font-medium text-white/80">Risk level: </span>
            <SeverityPill severity={paymentRisk} />
          </div>
        )}
        <p className="text-sm text-white/60">
          Large upfront deposits increase homeowner financial risk if delays or disputes occur.
        </p>
        <Accordion title="What good looks like" className="border-t border-white/10 pt-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-white/70">
            <li>Milestone-based payments tied to completed work</li>
            <li>Lower upfront deposit (e.g. 20% or less)</li>
            <li>Final payment after inspection and your sign-off</li>
          </ul>
        </Accordion>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="text-sm font-medium text-white">Example milestone-based payment schedule</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/70">
            <li>20% deposit to start</li>
            <li>40% after tear-off and deck inspection</li>
            <li>40% after final inspection and homeowner sign-off</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

// --- Timeline & Milestone Planner ---
function TimelineSection({
  data,
  onMilestoneTextReady,
}: {
  data: ReportData;
  onMilestoneTextReady: (text: string) => void;
}) {
  const timeline = data?.timeline as Record<string, unknown> | undefined;
  const clarity = timeline?.timeline_clarity ?? "missing";
  const timelineText = timeline?.timeline_text as string | null | undefined;
  const recommended = (timeline?.recommended_milestones as Array<{
    key: string;
    title: string;
    meaning?: string;
    example?: string;
  }>) ?? DEFAULT_MILESTONES;

  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const milestoneText = useMemo(() => {
    return recommended
      .map((m) => `${m.title}\n  What it means: ${m.meaning ?? "—"}\n  Good wording: ${m.example ?? "—"}`)
      .join("\n\n");
  }, [recommended]);

  useEffect(() => {
    onMilestoneTextReady(milestoneText);
  }, [milestoneText, onMilestoneTextReady]);

  const clarityLabel = clarity === "missing" ? "Not provided in quote" : String(clarity);

  return (
    <Card title="Timeline & Milestones">
      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium text-white">Timeline clarity: {clarityLabel}</div>
          <p className="mt-1 text-sm text-white/60">
            A written timeline protects you from delays and sets clear expectations between you and the contractor.
          </p>
          {timelineText && (
            <p className="mt-2 text-sm text-white/70">&ldquo;{timelineText}&rdquo;</p>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-white/50">
            Recommended milestones (not provided in quote)
          </p>
          <ul className="space-y-2">
            {recommended.map((m) => (
              <li key={m.key} className="rounded-lg border border-white/10 bg-white/5">
                <button
                  type="button"
                  onClick={() => setExpandedKey(expandedKey === m.key ? null : m.key)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-white"
                >
                  {m.title}
                  <span className="text-white/50">{expandedKey === m.key ? "−" : "+"}</span>
                </button>
                {expandedKey === m.key && (
                  <div className="border-t border-white/10 px-3 pb-3 pt-2 text-sm text-white/70">
                    <p><strong>What it means:</strong> {m.meaning ?? "—"}</p>
                    <p className="mt-1"><strong>Good wording:</strong> {m.example ?? "—"}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

// --- Benchmark Comparison ---
function BenchmarkComparisonSection({
  benchmark,
}: {
  benchmark: {
    mode?: "unit" | "total";
    quote_total?: number;
    total?: number;
    unit_price_estimated?: number;
    unit_basis?: string;
    normalized_quantity?: number;
    market_range?: { low?: number; mid?: number; high?: number };
    range?: { low?: number; mid?: number; high?: number };
    low?: number;
    mid?: number;
    high?: number;
    region_key?: string;
  };
}) {
  const mode = benchmark.mode ?? "total";
  const total = benchmark.quote_total ?? benchmark.total;
  const unitPrice = benchmark.unit_price_estimated;
  const range = benchmark.market_range ?? benchmark.range ?? (benchmark.low != null || benchmark.mid != null || benchmark.high != null ? { low: benchmark.low, mid: benchmark.mid, high: benchmark.high } : undefined);
  const hasRange = range && (range.low != null || range.mid != null || range.high != null);

  const yourValue = mode === "unit" ? unitPrice : total;
  if (yourValue == null && !hasRange) return null;

  const unitLabel = mode === "unit" && benchmark.unit_basis ? `Your $/${benchmark.unit_basis}` : "Your quote total";

  return (
    <Card title="Benchmark Comparison">
      <div className="space-y-4">
        {yourValue != null && (
          <div>
            <div className="text-sm font-medium text-white">{unitLabel}</div>
            <p className="mt-1 text-lg font-semibold text-white">
              USD {Number(yourValue).toLocaleString()}{mode === "unit" ? "/sq" : ""}
            </p>
            {mode === "unit" && benchmark.normalized_quantity != null && (
              <p className="mt-0.5 text-sm text-white/70">Scope: {benchmark.normalized_quantity} squares</p>
            )}
          </div>
        )}
        {hasRange && (
          <div>
            <div className="text-sm font-medium text-white/80">Market range for your region</div>
            <div className="mt-2 flex flex-wrap gap-3">
              {range!.low != null && (
                <span className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/80">
                  Low: ${Number(range!.low).toLocaleString()}
                </span>
              )}
              {range!.mid != null && (
                <span className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/80">
                  Mid: ${Number(range!.mid).toLocaleString()}
                </span>
              )}
              {range!.high != null && (
                <span className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/80">
                  High: ${Number(range!.high).toLocaleString()}
                </span>
              )}
            </div>
            {!range!.low && !range!.mid && !range!.high && (
              <p className="mt-2 text-sm text-white/50">Market benchmarks coming soon for your region.</p>
            )}
          </div>
        )}
        {!hasRange && yourValue != null && (
          <p className="text-sm text-white/50">Benchmark comparison will be available when we have market data for your region.</p>
        )}
      </div>
    </Card>
  );
}

// --- Cost Breakdown ---
function CostBreakdownSection({ data, lineItems = [] }: { data: ReportData; lineItems?: LineItemRow[] }) {
  const costs = data?.costs as Record<string, unknown> | undefined;
  const breakdown = costs?.breakdown as Record<string, number> | undefined;
  const laborTotal = costs?.labor_total as number | null | undefined;
  const materialsTotal = costs?.materials_total as number | null | undefined;
  const disposalTotal = costs?.disposal_total as number | null | undefined;
  const highCostFlags = (costs?.high_cost_flags as Array<{ name: string; reason: string }>) ?? [];
  const dataLineItems = (costs?.line_items as Array<{ name: string; total?: number }>) ?? [];
  const hasDbLineItems = lineItems.length > 0;
  const displayLineItems = hasDbLineItems
    ? lineItems
    : dataLineItems.map((li, i) => ({
        description_raw: li.name,
        quantity: null,
        unit_price: null,
        line_total: li.total ?? null,
        category: null,
        sort_order: i,
      }));

  const laborPct = breakdown?.labor_pct ?? 0;
  const materialsPct = breakdown?.materials_pct ?? 0;
  const disposalPct = breakdown?.disposal_pct ?? 0;
  const hasBreakdown = laborPct > 0 || materialsPct > 0 || disposalPct > 0;

  if (!hasBreakdown && highCostFlags.length === 0 && displayLineItems.length === 0) return null;

  return (
    <Card title="Cost Breakdown Intelligence">
      <div className="space-y-4">
        {hasBreakdown && (
          <div className="space-y-2">
            {laborPct > 0 && (
              <div>
                <div className="flex justify-between text-sm text-white/80">
                  <span className="font-medium">Labor</span>
                  <span>{laborPct}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white/70"
                    style={{ width: `${laborPct}%` }}
                  />
                </div>
              </div>
            )}
            {materialsPct > 0 && (
              <div>
                <div className="flex justify-between text-sm text-white/80">
                  <span className="font-medium">Materials</span>
                  <span>{materialsPct}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white/60"
                    style={{ width: `${materialsPct}%` }}
                  />
                </div>
              </div>
            )}
            {disposalPct > 0 && (
              <div>
                <div className="flex justify-between text-sm text-white/80">
                  <span className="font-medium">Disposal / equipment</span>
                  <span>{disposalPct}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white/50"
                    style={{ width: `${disposalPct}%` }}
                  />
                </div>
              </div>
            )}
            {(laborTotal != null || materialsTotal != null || disposalTotal != null) && (
              <p className="text-xs text-white/50">
                {laborTotal != null && `Labor: ${laborTotal.toLocaleString()} · `}
                {materialsTotal != null && `Materials: ${materialsTotal.toLocaleString()} · `}
                {disposalTotal != null && `Disposal: ${disposalTotal.toLocaleString()}`}
              </p>
            )}
            {hasBreakdown && (() => {
              const msg =
                disposalPct > 15
                  ? `Disposal and equipment costs represent ~${Math.round(disposalPct)}% of the total project cost, which may be slightly higher than typical for similar projects.`
                  : laborPct > 55
                    ? `Labor represents ~${Math.round(laborPct)}% of the total, which may be on the higher end for this type of work.`
                    : materialsPct > 60
                      ? `Materials represent ~${Math.round(materialsPct)}% of the total; confirm what is included.`
                      : null;
              return msg ? <p className="mt-2 text-sm text-white/60">{msg}</p> : null;
            })()}
          </div>
        )}
        {displayLineItems.length > 0 && (
          <div>
            <div className="text-sm font-medium text-white">Line-item breakdown</div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-white/50">
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Unit $</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {displayLineItems.map((li, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-2 text-white/90">{li.description_raw ?? "—"}</td>
                      <td className="py-2 text-right text-white/70">{li.quantity != null ? li.quantity : "—"}</td>
                      <td className="py-2 text-right text-white/70">{li.unit_price != null ? `$${li.unit_price.toLocaleString()}` : "—"}</td>
                      <td className="py-2 text-right text-white">{li.line_total != null ? `$${li.line_total.toLocaleString()}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {highCostFlags.length > 0 && (
          <div>
            <div className="text-sm font-medium text-white">Items to confirm</div>
            <ul className="mt-2 space-y-1 text-sm text-white/70">
              {highCostFlags.map((f, i) => (
                <li key={i}>
                  <strong>{f.name}</strong>: {f.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Maps deterministic signal keys to human-readable scope labels. */
const SCOPE_KEY_TO_LABEL: Record<string, string> = {
  flashing_scope: "Flashing replacement",
  underlayment_scope: "Underlayment / Synthetic Felt",
  cleanup_disposal: "Cleanup / haul-away details",
  ice_water: "Ice & Water Shield",
  drip_edge: "Drip Edge",
  ventilation: "Ventilation",
  permit: "Permit responsibility",
  tearoff_included: "Tear-off / removal",
  warranty_terms: "Warranty terms",
  timeline_defined: "Timeline defined",
  materials_specified: "Materials specified",
};

// --- Scope Audit ---
/** Shape of each row in the scope audit table; all branches must return this. */
interface ScopeAuditRow {
  item: string;
  status: "included" | "unclear" | "not_listed";
  why: string;
}

/** Only mark as "included" when explicitly stated in quote (present from report); otherwise unclear or not listed. */
function ScopeAuditSection({ data, scopeChecklist, scopeMissingKeys }: { data: ReportData; scopeChecklist?: unknown; scopeMissingKeys?: string[] }) {
  const scope = data?.scope as Record<string, unknown> | undefined;
  const present = (scope?.present as string[]) ?? [];
  const fromData = (scope?.missing_or_unclear as Array<{ item: string; severity?: string; why?: string }>) ?? [];
  const fromScopeChecklist = Array.isArray(scopeChecklist)
    ? (scopeChecklist as Array<{ item: string; severity?: string; why?: string }>).map((m) =>
        typeof m === "string" ? { item: m, severity: "warn" as const } : m
      )
    : [];
  const fromMissingKeys = (scopeMissingKeys ?? []).map((k) => ({
    item: SCOPE_KEY_TO_LABEL[k] ?? k.replace(/_/g, " "),
    severity: "warn" as const,
  }));
  const fromFlags = fromScopeChecklist.length > 0 ? fromScopeChecklist : fromMissingKeys;
  const missingOrUnclear = fromData.length > 0 ? fromData : fromFlags;

  const presentLower = present.map((p) => p.toLowerCase());
  const missingByKey = new Map(
    missingOrUnclear.map((m) => [m.item.toLowerCase().replace(/\s+/g, " "), m])
  );

  const items: ScopeAuditRow[] = SCOPE_CHECKLIST_ITEMS.map((item): ScopeAuditRow => {
    const key = item.toLowerCase();
    const presentMatch = presentLower.some((p) => p.includes(key) || key.includes(p));
    const missingEntry =
      missingByKey.get(key) ??
      [...missingByKey.entries()].find(([k]) => key.includes(k) || k.includes(key))?.[1];
    const missingWhy = missingEntry && "why" in missingEntry ? missingEntry.why : undefined;
    const tooltip = SCOPE_ITEM_TOOLTIPS[item] ?? "Confirm scope with your contractor.";
    const why = missingWhy ?? tooltip;
    if (presentMatch) return { item, status: "included", why };
    if (missingEntry)
      return {
        item,
        status: (missingEntry.severity === "warn" ? "unclear" : "not_listed") as "unclear" | "not_listed",
        why,
      };
    return { item, status: "not_listed", why: tooltip };
  });

  return (
    <Card title="Scope Audit">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/50">
              <th className="pb-2 font-medium">Item</th>
              <th className="w-24 pb-2 text-center font-medium">Status</th>
              <th className="pb-2 font-medium">Why it matters</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="py-2 text-white">{row.item}</td>
                <td className="py-2 text-center">
                  {row.status === "included" ? (
                    <span className="text-emerald-400" title="Explicitly stated in quote">✅ Included</span>
                  ) : row.status === "unclear" ? (
                    <span className="text-amber-400" title="Mentioned but unclear">⚠ Mentioned but unclear</span>
                  ) : (
                    <span className="text-red-400" title="Not listed in quote">❌ Not listed</span>
                  )}
                </td>
                <td className="py-2 text-white/60" title={row.why}>
                  {row.why}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// --- Negotiation Playbook ---
function NegotiationSection({ data, negotiationQuestions }: { data: ReportData; negotiationQuestions?: unknown }) {
  const negotiation = data?.negotiation?.items as Array<{ ask: string; why?: string }> | undefined;
  const legacyQuestions = data?.questions_to_ask as string[] | undefined;
  const fromFlags = Array.isArray(negotiationQuestions)
    ? (negotiationQuestions as Array<{ ask: string; why?: string } | string>).map((n) =>
        typeof n === "string" ? { ask: n, why: "" } : n
      )
    : [];
  const items = negotiation ?? legacyQuestions?.map((q) => ({ ask: q, why: "" })) ?? fromFlags;

  if (items.length === 0) return null;

  return (
    <Card title="Negotiation Checklist">
      <ul className="space-y-3">
        {items.map((n, i) => {
          const ask = typeof n === "string" ? n : n.ask;
          const why = typeof n === "string" ? undefined : n.why;
          return (
            <li key={i} className="border-t border-white/5 pt-3 first:border-0 first:pt-0">
              <div className="font-medium text-white">&ldquo;{ask}&rdquo;</div>
              {why && (
                <Accordion title="Why it matters" className="mt-1">
                  <p className="text-sm text-white/70">{why}</p>
                </Accordion>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// --- Premium Pricing Table (Category, Quoted, Typical range, Status) ---
function PremiumPricingTable({
  data,
  lineItems = [],
  analysis,
}: {
  data: ReportData;
  lineItems?: LineItemRow[];
  analysis?: AnalysisRow | null;
}) {
  const costs = data?.costs as Record<string, unknown> | undefined;
  const dataLineItems = (costs?.line_items as Array<{ name: string; total?: number }>) ?? [];
  const hasDbLineItems = lineItems.length > 0;
  const displayLineItems = hasDbLineItems
    ? lineItems
    : dataLineItems.map((li, i) => ({
        description_raw: li.name,
        category: null,
        quantity: null,
        unit_price: null,
        line_total: li.total ?? null,
        sort_order: i,
      }));
  const benchmark = analysis?.benchmark_snapshot as { market_range?: { low?: number; mid?: number; high?: number } } | null | undefined;
  const range = benchmark?.market_range;
  const total = (data?.summary as Record<string, unknown>)?.total ?? (data?.quote_overview as Record<string, unknown>)?.quote_total;

  const hasContent = displayLineItems.length > 0 || total != null;
  if (!hasContent) return null;

  const getStatus = (quoted: number | null) => {
    if (quoted == null || !range) return "—";
    const low = range.low ?? 0;
    const high = range.high ?? (low > 0 ? low * 1.5 : 0);
    if (quoted < low) return "Below typical";
    if (quoted > high) return "Above typical";
    return "In range";
  };

  const rangeStr = range
    ? `$${(range.low ?? 0).toLocaleString()} – $${(range.high ?? 0).toLocaleString()}`
    : "—";

  return (
    <Card title="Pricing Breakdown">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/50">
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 text-right font-medium">Quoted</th>
              <th className="pb-2 text-right font-medium">Typical range</th>
              <th className="pb-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayLineItems.map((li, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="py-2 text-white/90">{li.category ?? li.description_raw ?? "—"}</td>
                <td className="py-2 text-right text-white">
                  {li.line_total != null ? `$${li.line_total.toLocaleString()}` : "—"}
                </td>
                <td className="py-2 text-right text-white/60">—</td>
                <td className="py-2 text-right text-white/70">—</td>
              </tr>
            ))}
            <tr className="border-b-0 border-white/10 font-medium">
              <td className="py-2 text-white">Total</td>
              <td className="py-2 text-right text-white">
                {total != null ? `$${Number(total).toLocaleString()}` : "—"}
              </td>
              <td className="py-2 text-right text-white/60">{rangeStr}</td>
              <td className="py-2 text-right text-white/70">{getStatus(total as number)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// --- Warranty & Contract Protections ---
function WarrantyAndContractSection({ data }: { data: ReportData }) {
  const scope = data?.scope as Record<string, unknown> | undefined;
  const terms = data?.terms as Record<string, unknown> | undefined;
  const notes = data?.notes as string[] | undefined;
  const hasWarranty = (scope?.present as string[] | undefined)?.some((s) => /warranty|warrant/i.test(s));
  const validDays = terms?.valid_days as number | null | undefined;
  const discount = terms?.discount as number | null | undefined;
  const taxPercent = terms?.tax_percent as number | null | undefined;
  const hasTerms = validDays != null || discount != null || taxPercent != null || (notes && notes.length > 0);

  if (!hasWarranty && !hasTerms) return null;

  return (
    <Card title="Warranty & Contract Protections">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-white">Warranty coverage</p>
          <p className="mt-1 text-sm text-white/70">
            {hasWarranty ? "Warranty or coverage details are mentioned in the quote." : "Warranty coverage was not clearly stated in the quote. Confirm labor and materials warranty in writing."}
          </p>
        </div>
        {hasTerms && (
          <div>
            <p className="text-sm font-medium text-white">Quote terms</p>
            <ul className="mt-2 space-y-1 text-sm text-white/70">
              {validDays != null && <li>Valid for: {validDays} days</li>}
              {discount != null && <li>Discount applied: {Number(discount).toLocaleString()}</li>}
              {taxPercent != null && <li>Sales tax: {taxPercent}%</li>}
              {notes?.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

// --- Quote Terms ---
function QuoteTermsSection({ data }: { data: ReportData }) {
  const terms = data?.terms as Record<string, unknown> | undefined;
  const notes = data?.notes as string[] | undefined;
  const summary = data?.summary as Record<string, unknown> | undefined;
  const ov = data?.quote_overview as Record<string, unknown> | undefined;
  const total = summary?.total ?? ov?.quote_total;
  const validDays = terms?.valid_days as number | null | undefined;
  const discount = terms?.discount as number | null | undefined;
  const taxPercent = terms?.tax_percent as number | null | undefined;
  const currency = (summary ?? ov)?.currency ?? "USD";

  const hasTerms = validDays != null || discount != null || taxPercent != null || (notes && notes.length > 0);
  if (!hasTerms) return null;

  const discountDisplay =
    discount != null
      ? total != null && discount <= 100
        ? `${currency} ${(Number(total) * (discount / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
        : `${currency} ${Number(discount).toLocaleString()}`
      : null;

  return (
    <Card title="Quote Terms">
      <ul className="space-y-1.5 text-sm text-white/80">
        {validDays != null && <li>Valid for: {validDays} days</li>}
        {discountDisplay != null && <li>Discount applied: {discountDisplay}</li>}
        {taxPercent != null && <li>Sales tax: {taxPercent}%</li>}
        {notes?.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-white/50">
        Quotes often expire because material and labor costs can change.
      </p>
    </Card>
  );
}

// --- Key takeaway (for Executive Summary) ---
function getKeyTakeaway(data: ReportData): string {
  const summary = data?.summary as Record<string, unknown> | undefined;
  const payment = data?.payment as Record<string, unknown> | undefined;
  const timeline = data?.timeline as Record<string, unknown> | undefined;
  const scope = data?.scope as Record<string, unknown> | undefined;
  const riskLevel = String(summary?.risk_level ?? "medium");
  const timelineClarity = timeline?.timeline_clarity ?? "missing";
  const paymentRisk = String(payment?.payment_risk ?? "medium");
  const depositPercent = payment?.deposit_percent as number | null | undefined;
  const hasWarranty = (scope?.present as string[] | undefined)?.some((s) =>
    /warranty|warrant/i.test(s)
  );

  const parts: string[] = [];
  if (riskLevel === "low") {
    parts.push("This quote appears reasonably structured.");
  } else if (riskLevel === "high") {
    parts.push("This quote has several areas that need attention before signing.");
  } else {
    parts.push("This quote has a mix of strengths and gaps to clarify.");
  }
  if (timelineClarity === "missing") {
    parts.push("Request written project milestones and approximate dates.");
  }
  if (!hasWarranty) {
    parts.push("Confirm warranty coverage (labor and materials) in writing.");
  }
  if (paymentRisk === "high" || (depositPercent != null && depositPercent > 30)) {
    parts.push("Consider negotiating a milestone-based payment structure.");
  }
  if (parts.length === 1) {
    parts.push("Review the sections below for any missing details to confirm with your contractor.");
  }

  return parts.join(" ");
}

// --- What this means for you ---
function WhatThisMeansSection({ data }: { data: ReportData }) {
  const sentence = getKeyTakeaway(data);
  return (
    <Card title="What this means for you">
      <p className="text-sm text-white/80">{sentence}</p>
    </Card>
  );
}

// --- Red Flags (main content) ---
function RedFlagsSection({ data }: { data: ReportData }) {
  const redFlags = (data?.red_flags as Array<{ title: string; severity: string; why_it_matters?: string; detail?: string }>) ?? [];
  if (redFlags.length === 0) return null;

  return (
    <Card title="Risk Flags">
      <ul className="space-y-4">
        {redFlags.map((f, i) => (
          <li key={i} className="border-t border-white/5 pt-4 first:border-0 first:pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-white">{f.title}</span>
              <SeverityPill severity={f.severity} />
            </div>
            <p className="mt-1.5 text-sm text-white/70">{f.detail ?? f.why_it_matters ?? ""}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// --- Sidebar (single global summary: top 3 risks, top 5 missing, top 3 actions) ---
function ReportSidebar({ data }: { data: ReportData }) {
  const redFlags = (data?.red_flags as Array<{ title: string; severity?: string }>) ?? [];
  const payment = data?.payment as Record<string, unknown> | undefined;
  const timeline = data?.timeline as Record<string, unknown> | undefined;
  const scope = data?.scope as Record<string, unknown> | undefined;
  const negotiation = (data?.negotiation?.items as Array<{ ask: string }>) ?? (data?.questions_to_ask as string[] ?? []).map((q) => ({ ask: q }));
  const depositPercent = payment?.deposit_percent as number | null | undefined;
  const paymentRisk = String(payment?.payment_risk ?? "");
  const timelineClarity = timeline?.timeline_clarity ?? "missing";
  const hasWarranty = (scope?.present as string[] | undefined)?.some((s) => /warranty|warrant/i.test(s));
  const scopeMissing = (scope?.missing_or_unclear as Array<{ item: string }>) ?? [];
  const scopePresent = (scope?.present as string[]) ?? [];
  const scopeRatio = scopePresent.length / (scopePresent.length + scopeMissing.length) || 0;
  const scopeWeak = scopeRatio < 0.6;

  const severityOrder = (s: string) => (s === "high" ? 0 : s === "medium" ? 1 : 2);
  const aggregatedRisks: Array<{ label: string; severity: string }> = [
    ...redFlags.map((r) => ({ label: r.title, severity: String(r.severity ?? "medium") })),
    ...(paymentRisk === "high" || (depositPercent != null && depositPercent > 30)
      ? [{ label: "High deposit or payment risk", severity: "high" as const }]
      : []),
    ...(timelineClarity === "missing" ? [{ label: "Timeline not provided in quote", severity: "medium" as const }] : []),
    ...(!hasWarranty ? [{ label: "Warranty not clearly stated", severity: "medium" as const }] : []),
    ...(scopeWeak ? [{ label: "Scope has limited detail", severity: "medium" as const }] : []),
  ];
  const keyRisks = [...aggregatedRisks]
    .sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))
    .slice(0, 3)
    .map((r) => r.label);

  const missingItems: string[] = [
    ...scopeMissing.map((m) => m.item),
    ...(timelineClarity === "missing" ? ["Timeline / milestones"] : []),
    ...(!hasWarranty ? ["Warranty coverage"] : []),
    ...(scopeMissing.some((m) => /permit/i.test(m.item)) ? [] : ["Permit responsibility"]),
  ];
  const missingTop = [...new Set(missingItems)].slice(0, 5);

  const nextActionsList: string[] = [
    ...negotiation.map((n) => (typeof n === "string" ? n : n.ask)),
    ...(timelineClarity === "missing" ? ["Request written timeline and milestones"] : []),
    ...(depositPercent != null && depositPercent > 30 ? ["Discuss milestone-based payment structure"] : []),
  ];
  const nextActions = [...new Map(nextActionsList.map((a) => [a, a])).values()].slice(0, 3);

  const [openCard, setOpenCard] = useState<"risks" | "missing" | "actions" | null>("risks");

  const cardClass = "rounded-xl border border-white/10 bg-white/5 overflow-hidden";
  const headerClass =
    "flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-white lg:cursor-default";
  const toggleClass = "lg:hidden flex items-center justify-center w-8 h-8 rounded text-white/50";

  return (
    <div className="space-y-4">
      <div className={cardClass}>
        <button
          type="button"
          onClick={() => setOpenCard(openCard === "risks" ? null : "risks")}
          className={`${headerClass} ${keyRisks.length === 0 ? "cursor-default" : ""}`}
        >
          Key risks
          {keyRisks.length > 0 && (
            <span className={toggleClass}>{openCard === "risks" ? "−" : "+"}</span>
          )}
        </button>
        <div className={`px-4 pb-4 ${openCard === "risks" || keyRisks.length === 0 ? "block" : "hidden lg:block"}`}>
          {keyRisks.length === 0 ? (
            <p className="text-sm text-white/50">No major risks identified yet</p>
          ) : (
            <ul className="space-y-1.5 text-sm text-white/70">
              {keyRisks.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={cardClass}>
        <button
          type="button"
          onClick={() => setOpenCard(openCard === "missing" ? null : "missing")}
          className={headerClass}
        >
          Missing info checklist
          <span className={toggleClass}>{openCard === "missing" ? "−" : "+"}</span>
        </button>
        <div className={`px-4 pb-4 ${openCard === "missing" ? "block" : "hidden lg:block"}`}>
          {missingTop.length === 0 ? (
            <p className="text-sm text-white/50">No items listed</p>
          ) : (
            <ul className="space-y-1.5 text-sm text-white/70">
              {missingTop.map((m, i) => (
                <li key={i}>• {m}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={cardClass}>
        <button
          type="button"
          onClick={() => setOpenCard(openCard === "actions" ? null : "actions")}
          className={headerClass}
        >
          Recommended next actions
          <span className={toggleClass}>{openCard === "actions" ? "−" : "+"}</span>
        </button>
        <div className={`px-4 pb-4 ${openCard === "actions" ? "block" : "hidden lg:block"}`}>
          {nextActions.length === 0 ? (
            <p className="text-sm text-white/50">Review report sections above</p>
          ) : (
            <ul className="space-y-1.5 text-sm text-white/70">
              {nextActions.map((a, i) => (
                <li key={i}>• {a}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

type LineItemRow = {
  id?: string;
  category: string | null;
  description_raw: string | null;
  quantity: number | null;
  unit_price: number | null;
  line_total: number | null;
  sort_order?: number;
};

type AnalysisRow = {
  scope_score: number | null;
  price_score: number | null;
  clarity_score: number | null;
  risk_level: string | null;
  flags?: {
    benchmark_snapshot?: unknown;
    scope_completeness?: unknown;
    scope_missing_keys?: string[];
    negotiation_questions?: unknown;
  };
  benchmark_snapshot?: { quote_total?: number; market_range?: { low?: number; mid?: number; high?: number }; region_key?: string } | null;
};

// --- Main export ---
export function ReportView({
  data,
  reportJson,
  aiConfidence,
  submissionId,
  initialChatMessages,
  lineItems = [],
  analysis = null,
}: {
  data: ReportData;
  reportJson: string;
  aiConfidence: string | null;
  submissionId?: string;
  initialChatMessages?: Array<{ id: string; role: "user" | "assistant"; message_text: string; created_at: string }>;
  lineItems?: LineItemRow[];
  analysis?: AnalysisRow | null;
}) {
  const [milestoneText, setMilestoneText] = useState<string>("");

  const handleMilestoneReady = (text: string) => setMilestoneText(text);

  const summary = data?.summary as Record<string, unknown> | undefined;
  const riskLevel = String(summary?.risk_level ?? "medium");
  const qualityScore = summary?.quality_score;
  const qualityNum = typeof qualityScore === "number" ? Math.min(100, Math.max(0, Math.round(qualityScore))) : null;
  const benchmark = analysis?.benchmark_snapshot as { region_key?: string } | null | undefined;
  const regionKey = benchmark?.region_key;

  return (
    <div className="lg:flex lg:gap-8">
      <main className="min-w-0 flex-1">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition hover:text-white"
        >
          <BackIcon className="h-4 w-4" />
          Back to dashboard
        </Link>

        {/* Non-blocking banner */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-white/90">Save this report to your dashboard.</p>
          <div className="flex items-center gap-2">
            <Link
              href="/start"
              className="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
            >
              Create account
            </Link>
            <Link
              href="/signin"
              className="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* 1. Confirmation header */}
        <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.06] p-6">
          <h1 className="text-2xl font-semibold text-white">Full Review Unlocked</h1>
          <p className="mt-2 text-sm text-white/70">
            {regionKey
              ? `Pricing benchmarked against typical ranges for your region (${regionKey}). Your complete QuoteShield review is ready below.`
              : "Your complete QuoteShield review is ready below."}
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/50">
            <span>One-time purchase</span>
            <span className="text-white/30">·</span>
            <span>Secure</span>
            <span className="text-white/30">·</span>
            <span>No subscription</span>
          </div>
        </div>

        {/* 2. Executive Summary */}
        <section className="mb-8 rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">Executive Summary</h2>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div>
              <span className="text-xs font-medium text-white/50">Risk level</span>
              <div className="mt-1">
                <SeverityPill severity={riskLevel} />
              </div>
            </div>
            {qualityNum != null && (
              <div className="min-w-[140px]">
                <span className="text-xs font-medium text-white/50">Quality score</span>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white/70"
                    style={{ width: `${qualityNum}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-white/50">{qualityNum}/100</p>
              </div>
            )}
          </div>
          <p className="mt-4 text-sm text-white/80">{getKeyTakeaway(data)}</p>
        </section>

        {/* 3. Pricing Breakdown table */}
        <PremiumPricingTable data={data} lineItems={lineItems} analysis={analysis} />

        {/* 4. Scope Audit */}
        <div className="mt-8">
          <ScopeAuditSection data={data} scopeChecklist={analysis?.flags?.scope_completeness} scopeMissingKeys={analysis?.flags?.scope_missing_keys} />
        </div>

        {/* 5. Risk Flags */}
        <div className="mt-8">
          <RedFlagsSection data={data} />
        </div>

        {/* 6. Timeline & Payment Review */}
        <div className="mt-8 space-y-4">
          <TimelineSection data={data} onMilestoneTextReady={handleMilestoneReady} />
          <PaymentSection data={data} />
        </div>

        {/* 7. Negotiation Checklist */}
        <div className="mt-8">
          <NegotiationSection data={data} negotiationQuestions={analysis?.flags?.negotiation_questions} />
        </div>

        {/* 8. Warranty & Contract Protections */}
        <div className="mt-8">
          <WarrantyAndContractSection data={data} />
        </div>

        {/* 9. How to use this report */}
        <section className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-semibold text-white">How to use this report</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>• Bring this to your contractor before signing</li>
            <li>• Ask the highlighted negotiation questions</li>
            <li>• Confirm scope gaps in writing</li>
            <li>• Review flagged pricing ranges</li>
          </ul>
        </section>

        {/* 10. Action row */}
        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-5">
          <ReportActions reportJson={reportJson} milestoneText={milestoneText || null} />
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
          >
            Save to dashboard
          </Link>
        </div>
      </main>

      <aside
        className={`mt-8 lg:mt-0 lg:shrink-0 ${submissionId ? "lg:w-[380px]" : "lg:w-72"}`}
      >
        <div className="lg:sticky lg:top-24 space-y-6">
          <ReportSidebar data={data} />
          {submissionId && (
            <ContractorResponseSection
              submissionId={submissionId}
              initialMessages={initialChatMessages ?? []}
            />
          )}
        </div>
      </aside>
    </div>
  );
}
