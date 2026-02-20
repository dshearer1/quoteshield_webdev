import type { QuoteReportJson } from "@/lib/ai/analyzeQuote";
import type { RiskScoresResult } from "@/lib/riskScoring";

export interface RiskExplanationItem {
  category: string;
  severity: "high" | "medium" | "low";
  text: string;
}

export interface RiskExplanationsResult {
  explanations: RiskExplanationItem[];
  summary_statement: string;
}

type ReportLike = QuoteReportJson | Record<string, unknown> | null;

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

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

/**
 * Generate structured risk explanations and a summary statement from report_json and risk_scores.
 * Homeowner-friendly, plain English; no contractor accusations.
 * Returns up to 4 highest-severity findings; each includes observation, impact, and recommendation.
 */
export function generateRiskExplanations(
  report_json: ReportLike,
  risk_scores: RiskScoresResult
): RiskExplanationsResult {
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
  const summary = (r.summary ?? r.quote_overview ?? {}) as Record<string, unknown>;
  const total = Number(summary?.total ?? summary?.quote_total ?? 0) || 1;

  const items: RiskExplanationItem[] = [];

  // --- PAYMENT ---
  const depositPercent = payment?.deposit_percent ?? null;
  const hasMilestoneStructure =
    /\b(milestone|phase|stage|upon completion|after (tear-?off|inspection|delivery)|%\s*(at|upon|due))\b/i.test(paymentTerms) ||
    (payment?.recommended_schedule_example?.length ?? 0) >= 2;

  if (depositPercent != null && depositPercent > 30) {
    items.push({
      category: "payment",
      severity: depositPercent > 50 ? "high" : "medium",
      text: [
        "Observation: The quote requests a " + depositPercent + "% deposit upfront.",
        "Impact: Large upfront deposits can increase your financial risk if the project is delayed or a dispute arises.",
        "Recommendation: Consider asking for a milestone-based schedule (for example, 20% to start, 40% at mid-project, 40% after final inspection and your sign-off).",
      ].join(" "),
    });
  } else if (!hasMilestoneStructure && (paymentTerms || depositPercent != null)) {
    items.push({
      category: "payment",
      severity: "low",
      text: [
        "Observation: The quote does not clearly tie payments to completed milestones or a final inspection.",
        "Impact: Paying in large lumps without checkpoints can make it harder to resolve issues if something goes wrong.",
        "Recommendation: Request a payment schedule that links each payment to a specific milestone or inspection.",
      ].join(" "),
    });
  }

  // --- TIMELINE ---
  const timelinePresent = timeline?.timeline_present === true;
  const timelineClarity = timeline?.timeline_clarity ?? "missing";

  if (!timelinePresent || timelineClarity === "missing") {
    items.push({
      category: "timeline",
      severity: timelineClarity === "missing" && !timelinePresent ? "high" : "medium",
      text: [
        "Observation: The quote does not include a written timeline, start date, or completion timeframe.",
        "Impact: Without agreed dates, it can be difficult to plan around the work or address delays.",
        "Recommendation: Ask for a written timeline with approximate start and completion dates, and key milestones (e.g., materials delivered, tear-off complete, final inspection).",
      ].join(" "),
    });
  }

  // --- SCOPE ---
  if (missingOrUnclear.length > 0) {
    const count = missingOrUnclear.length;
    const examples = missingOrUnclear.slice(0, 2).map((m) => m.item).join(" and ");
    items.push({
      category: "scope",
      severity: count >= 4 ? "high" : count >= 2 ? "medium" : "low",
      text: [
        "Observation: " + count + " scope item(s) are missing or unclear in the quote" + (examples ? " (e.g., " + examples + ")." : "."),
        "Impact: Gaps in scope can lead to surprise charges or disagreements later about what was included.",
        "Recommendation: Request that the quote clearly list all materials, labor, permits, and cleanup so you know exactly what is covered.",
      ].join(" "),
    });
  }

  // --- WARRANTY ---
  const hasWarrantyMention = presentLower.some((p) => /warrant/i.test(p)) || /warrant/i.test(notesText);
  const hasLaborWarranty = presentLower.some((p) => /labor.*warrant|workmanship|work\s*warrant/i.test(p));

  if (!hasWarrantyMention) {
    items.push({
      category: "warranty",
      severity: "medium",
      text: [
        "Observation: Warranty coverage is not clearly stated in the quote.",
        "Impact: You may be unsure what is covered if materials or workmanship fail after the job is done.",
        "Recommendation: Ask for written details on both manufacturer (materials) and contractor (labor) warranty before signing.",
      ].join(" "),
    });
  } else if (!hasLaborWarranty) {
    items.push({
      category: "warranty",
      severity: "low",
      text: [
        "Observation: Warranty is mentioned, but labor or workmanship coverage is not clearly spelled out.",
        "Impact: Labor warranty can protect you if installation issues appear later.",
        "Recommendation: Confirm in writing what labor or workmanship warranty is included and for how long.",
      ].join(" "),
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
    items.push({
      category: "pricing",
      severity: "medium",
      text: [
        "Observation: The quote does not show a line-item breakdown of costs.",
        "Impact: It can be hard to verify that labor, materials, and other charges are fair and complete.",
        "Recommendation: Request an itemized breakdown (labor, materials, disposal, permits, etc.) so you can review and compare.",
      ].join(" "),
    });
  } else if (largeSingleLine) {
    items.push({
      category: "pricing",
      severity: "medium",
      text: [
        "Observation: One line item makes up more than half of the total cost.",
        "Impact: A single large line can make it difficult to understand what you are paying for and to compare with other quotes.",
        "Recommendation: Ask for that cost to be broken down into specific items or phases so you can see how it was calculated.",
      ].join(" "),
    });
  }

  // Sort by severity (high first), then by category score (lowest score = higher priority), take top 4
  const categoryOrder = ["payment", "timeline", "scope", "warranty", "pricing"] as const;
  const scoreByCategory = (c: string) => {
    const key = c as keyof RiskScoresResult["category_scores"];
    return risk_scores.category_scores[key] ?? 100;
  };
  items.sort((a, b) => {
    const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sev !== 0) return sev;
    return scoreByCategory(a.category) - scoreByCategory(b.category);
  });
  const top = items.slice(0, 4);

  // Summary statement from highest-priority risks (plain English, no accusations)
  const summaryParts: string[] = [];
  if (risk_scores.risk_level === "high") {
    summaryParts.push("This quote has several areas that would benefit from clarification before you sign.");
  } else if (risk_scores.risk_level === "medium") {
    summaryParts.push("This quote has a mix of clear and unclear areas; a few details could strengthen your position.");
  } else {
    summaryParts.push("This quote appears reasonably clear overall.");
  }

  const highAndMedium = top.filter((e) => e.severity === "high" || e.severity === "medium");
  if (highAndMedium.length > 0) {
    const categories = [...new Set(highAndMedium.map((e) => e.category))];
    const labels = categories.map((c) => {
      if (c === "payment") return "payment structure";
      if (c === "timeline") return "timeline and milestones";
      if (c === "scope") return "scope and materials";
      if (c === "warranty") return "warranty coverage";
      if (c === "pricing") return "pricing breakdown";
      return c;
    });
    summaryParts.push("Before moving forward, consider getting written clarity on " + labels.join(", ") + ".");
  } else if (top.length > 0) {
    summaryParts.push("Review the suggestions below to make sure you have the details you need.");
  }

  return {
    explanations: top,
    summary_statement: summaryParts.join(" "),
  };
}
