import type { QuoteReportJson } from "@/lib/ai/analyzeQuote";
import type { RiskScoresResult } from "@/lib/riskScoring";

export interface NegotiationSuggestion {
  category: string;
  ask_script: string;
  why_it_matters: string;
  confidence: "low" | "medium" | "high";
}

export interface NegotiationSuggestionsResult {
  suggestions: NegotiationSuggestion[];
}

type ReportLike = QuoteReportJson | Record<string, unknown> | null;

const CATEGORY_PRIORITY: Record<string, number> = {
  payment: 0,
  timeline: 1,
  warranty: 2,
  scope: 3,
  pricing: 4,
};

function getPayment(r: ReportLike) {
  return (r?.payment ?? {}) as QuoteReportJson["payment"];
}

function getTimeline(r: ReportLike) {
  return (r?.timeline ?? {}) as QuoteReportJson["timeline"];
}

function getScope(r: ReportLike) {
  return (r?.scope ?? {}) as QuoteReportJson["scope"];
}

function getCosts(r: ReportLike) {
  return (r?.costs ?? {}) as QuoteReportJson["costs"];
}

function scoreToConfidence(score: number): "low" | "medium" | "high" {
  if (score < 50) return "high";
  if (score < 70) return "medium";
  return "low";
}

/**
 * Generate negotiation suggestions from report_json and risk_scores.
 * Collaborative tone; up to 5 suggestions, prioritized Payment > Timeline > Warranty > Scope > Pricing.
 * No duplicate or overlapping suggestions.
 */
export function generateNegotiationSuggestions(
  report_json: ReportLike,
  risk_scores: RiskScoresResult
): NegotiationSuggestionsResult {
  const r = report_json ?? {};
  const payment = getPayment(r);
  const timeline = getTimeline(r);
  const scope = getScope(r);
  const costs = getCosts(r);
  const notes = (r.notes ?? []) as string[];
  const notesText = notes.join(" ").toLowerCase();
  const paymentTerms = (payment?.payment_terms_text ?? "").toLowerCase();
  const present = scope?.present ?? [];
  const presentLower = present.map((p) => p.toLowerCase());
  const missingOrUnclear = scope?.missing_or_unclear ?? [];
  const lineItems = costs?.line_items ?? [];
  const highCostFlags = (costs?.high_cost_flags ?? []) as Array<{ name: string; reason: string }>;
  const summary = (r.summary ?? r.quote_overview ?? {}) as Record<string, unknown>;
  const total = Number(summary?.total ?? summary?.quote_total ?? 0) || 1;

  const list: NegotiationSuggestion[] = [];

  // --- PAYMENT ---
  const depositPercent = payment?.deposit_percent ?? null;
  const hasMilestoneStructure =
    /\b(milestone|phase|stage|upon completion|after (tear-?off|inspection|delivery)|%\s*(at|upon|due))\b/i.test(paymentTerms) ||
    (payment?.recommended_schedule_example?.length ?? 0) >= 2;

  if (depositPercent != null && depositPercent > 30) {
    list.push({
      category: "payment",
      ask_script:
        "Would you be open to tying payments to milestones? For example, 20% to start, 40% after tear-off and deck inspection, and 40% after final inspection and my sign-off?",
      why_it_matters:
        "Milestone-based payments align your payments with completed work and can reduce risk if there are delays or disputes.",
      confidence: depositPercent > 50 ? "high" : "medium",
    });
  } else if (!hasMilestoneStructure && (paymentTerms || depositPercent != null)) {
    list.push({
      category: "payment",
      ask_script:
        "Could we add a payment schedule that ties each payment to a specific milestone or inspection? That would help me plan and know we're both aligned on progress.",
      why_it_matters:
        "Clear payment milestones make it easier to track progress and ensure payments match completed work.",
      confidence: scoreToConfidence(risk_scores.category_scores.payment),
    });
  }

  // --- TIMELINE ---
  const timelinePresent = timeline?.timeline_present === true;
  const timelineClarity = timeline?.timeline_clarity ?? "missing";

  if (!timelinePresent || timelineClarity === "missing") {
    list.push({
      category: "timeline",
      ask_script:
        "Would you be able to provide a written timeline with an approximate start date, key milestones (like materials delivery and tear-off complete), and expected completion?",
      why_it_matters:
        "A shared timeline helps both of us plan and sets clear expectations, so we can address any delays early.",
      confidence: timelineClarity === "missing" && !timelinePresent ? "high" : "medium",
    });
  }

  // --- WARRANTY ---
  const hasWarrantyMention = presentLower.some((p) => /warrant/i.test(p)) || /warrant/i.test(notesText);
  const hasLaborWarranty = presentLower.some((p) => /labor.*warrant|workmanship|work\s*warrant/i.test(p));

  if (!hasWarrantyMention) {
    list.push({
      category: "warranty",
      ask_script:
        "Could we add a line to the quote that spells out the manufacturer warranty on materials and your labor or workmanship warranty, including how long each lasts?",
      why_it_matters:
        "Having warranty details in writing gives you both a clear reference if any issues come up after the job is done.",
      confidence: "high",
    });
  } else if (!hasLaborWarranty) {
    list.push({
      category: "warranty",
      ask_script:
        "Can we clarify in the quote what labor or workmanship warranty is included and for how long?",
      why_it_matters:
        "Labor warranty covers installation quality and can protect you if something needs to be corrected later.",
      confidence: "medium",
    });
  }

  // --- SCOPE ---
  if (missingOrUnclear.length > 0) {
    const examples = missingOrUnclear.slice(0, 3).map((m) => m.item);
    list.push({
      category: "scope",
      ask_script:
        examples.length > 0
          ? "Would you be able to add a bit more detail to the quote so we're aligned on what's included? I'd like to see " + examples.join(", ") + " clearly called out."
          : "Would you be able to add a bit more detail to the quote so we're aligned on what's included? I'd like to see materials, labor, permits, and cleanup clearly listed.",
      why_it_matters:
        "When scope is written down, both sides know what's covered and it can prevent misunderstandings or surprise charges later.",
      confidence: missingOrUnclear.length >= 4 ? "high" : missingOrUnclear.length >= 2 ? "medium" : "low",
    });
  }

  // --- PRICING ---
  const itemizedCount = lineItems.length;
  let largeSingleLine = false;
  if (total > 0 && lineItems.length > 0) {
    const maxLine = Math.max(...lineItems.map((i) => Number((i as { total?: number }).total ?? 0)));
    if (maxLine > total * 0.5) largeSingleLine = true;
  }

  if (itemizedCount === 0) {
    list.push({
      category: "pricing",
      ask_script:
        "Could we add a simple breakdown showing labor, materials, and any other major cost categories? It would help me understand how the total is made up.",
      why_it_matters:
        "An itemized breakdown makes it easier to compare quotes and confirm that all expected items are included.",
      confidence: scoreToConfidence(risk_scores.category_scores.pricing),
    });
  } else if (largeSingleLine) {
    list.push({
      category: "pricing",
      ask_script:
        "One line item makes up a large portion of the total. Would you be able to break that out into a few sub-items so I can see how it's calculated?",
      why_it_matters:
        "Seeing the components of a large line item helps you verify the cost and compare with other quotes.",
      confidence: "medium",
    });
  }

  // high_cost_flags: add a pricing suggestion only if we don't already have one (avoid duplicate)
  if (highCostFlags.length > 0 && !list.some((s) => s.category === "pricing")) {
    const firstFlag = highCostFlags[0];
    list.push({
      category: "pricing",
      ask_script:
        "Could you walk me through how " +
        firstFlag.name +
        " is calculated, or add a short note in the quote? I want to make sure I understand what's included.",
      why_it_matters:
        firstFlag.reason ||
        "Clarifying how specific costs are determined helps you budget and compare options.",
      confidence: "medium",
    });
  }

  // Prioritize by category order (Payment > Timeline > Warranty > Scope > Pricing), then by confidence (high first), dedupe by category (keep first per category)
  const byCategory = new Map<string, NegotiationSuggestion>();
  const confOrder = { high: 0, medium: 1, low: 2 };
  list.sort((a, b) => {
    const prio = (CATEGORY_PRIORITY[a.category] ?? 99) - (CATEGORY_PRIORITY[b.category] ?? 99);
    if (prio !== 0) return prio;
    return confOrder[a.confidence] - confOrder[b.confidence];
  });
  for (const s of list) {
    if (!byCategory.has(s.category)) byCategory.set(s.category, s);
  }
  const sorted = Array.from(byCategory.values()).sort(
    (a, b) => (CATEGORY_PRIORITY[a.category] ?? 99) - (CATEGORY_PRIORITY[b.category] ?? 99)
  );
  const suggestions = sorted.slice(0, 5);

  return { suggestions };
}
