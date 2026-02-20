import "server-only";
import OpenAI from "openai";
import pdfParse from "@/lib/pdfParse";
import { computeFreeScore, type ScoreInputs } from "../scoring";
import { buildPreviewFindings } from "../previewFindings";

/** Legacy shape (still supported for backward compatibility). */
export interface QuoteOverviewLegacy {
  contractor_name?: string | null;
  project_type?: string | null;
  quote_total?: number | null;
  currency?: string | null;
}

export interface QuoteReportJson {
  /** New schema: executive summary */
  summary?: {
    total?: number | null;
    contractor_name?: string | null;
    project_type?: string | null;
    risk_level?: "low" | "medium" | "high";
    quality_score?: number | null;
    confidence?: "high" | "medium" | "low";
  };
  /** New schema: payment & deposit */
  payment?: {
    deposit_percent?: number | null;
    deposit_required?: boolean | null;
    payment_terms_text?: string | null;
    payment_risk?: "low" | "medium" | "high";
    recommended_schedule_example?: string[];
  };
  /** New schema: timeline & milestones */
  timeline?: {
    timeline_present?: boolean;
    timeline_text?: string | null;
    timeline_clarity?: "missing" | "basic" | "clear";
    recommended_milestones?: Array<{
      key: string;
      title: string;
      meaning?: string;
      example?: string;
    }>;
  };
  /** New schema: cost breakdown */
  costs?: {
    line_items?: Array<{ name: string; qty?: number | null; unit_price?: number | null; total?: number | null }>;
    labor_total?: number | null;
    materials_total?: number | null;
    disposal_total?: number | null;
    breakdown?: { labor_pct?: number; materials_pct?: number; disposal_pct?: number };
    high_cost_flags?: Array<{ name: string; reason: string }>;
  };
  /** New schema: scope audit */
  scope?: {
    present?: string[];
    missing_or_unclear?: Array<{ item: string; severity?: "info" | "warn"; why?: string }>;
  };
  /** New schema: negotiation playbook */
  negotiation?: {
    items?: Array<{ ask: string; why?: string }>;
  };
  /** New schema: quote terms */
  terms?: {
    valid_days?: number | null;
    discount?: number | null;
    tax_percent?: number | null;
  };
  /** Red flags (new uses "detail", legacy uses "why_it_matters") */
  red_flags?: Array<{
    title: string;
    severity: "low" | "medium" | "high";
    why_it_matters?: string;
    detail?: string;
  }>;
  /** Scoring-ready signals (prefer when present for computeFreeScore) */
  signals?: {
    pricing_outliers?: number;
    missing_scope?: number;
    warranty_red_flags?: number;
    timeline_red_flags?: number;
  };
  /** Scoring-ready quality 0..1 (prefer when present) */
  quality?: {
    doc_quality?: number;
    line_item_clarity?: number;
  };
  /** 2–3 preview findings for free scan (no dollar amounts) */
  preview_findings?: string[];
  /** Legacy fields (for backward compatibility) */
  quote_overview?: QuoteOverviewLegacy;
  missing_info?: string[];
  questions_to_ask?: string[];
  notes?: string[];
  confidence?: "high" | "medium" | "low";
}

export interface AnalyzeResult {
  report_json: QuoteReportJson;
  report_html: string;
}

export interface AnalyzeQuoteContext {
  projectType?: string | null;
  projectNotes?: string | null;
  address?: string | null;
  projectValue?: number | null;
  contractorName?: string | null;
  propertyType?: string | null;
  projectSize?: string | null;
  specialConditions?: string[] | string | null;
}

export interface AnalyzeQuoteOptions {
  /** Optional AbortSignal for timeout (e.g. 90s). */
  signal?: AbortSignal | null;
}

export async function analyzeQuote(
  pdfBuffer: Buffer,
  projectType?: string | null,
  projectNotes?: string | null,
  extraContext?: AnalyzeQuoteContext | null,
  options?: AnalyzeQuoteOptions | null
): Promise<AnalyzeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  let extractedText = "";
  try {
    const { text } = await pdfParse(pdfBuffer);
    extractedText = (text ?? "").trim();
  } catch {
    extractedText = "(Could not extract text from PDF)";
  }
  console.log("[analyzeQuote] pdfParse extracted text length:", extractedText.length);

  const ctx = extraContext ?? {};
  const contextLines: string[] = [];
  if (projectType?.trim()) contextLines.push(`Project type: ${projectType.trim()}`);
  if (ctx.address?.trim()) contextLines.push(`Work location: ${ctx.address.trim()}`);
  if (ctx.propertyType?.trim()) contextLines.push(`Property type: ${ctx.propertyType.trim()}`);
  if (ctx.projectSize?.trim()) contextLines.push(`Project size: ${ctx.projectSize.trim()}`);
  const sc = ctx.specialConditions;
  if (sc != null && (Array.isArray(sc) ? sc.length > 0 : String(sc).trim())) {
    const list = Array.isArray(sc) ? sc.join(", ") : String(sc).trim();
    if (list) contextLines.push(`Special conditions: ${list}`);
  }
  if (ctx.projectValue != null && ctx.projectValue > 0) contextLines.push(`Estimated project value: ${ctx.projectValue}`);
  if (ctx.contractorName?.trim()) contextLines.push(`Contractor name: ${ctx.contractorName.trim()}`);
  if (projectNotes?.trim()) contextLines.push(`Customer project notes: ${projectNotes.trim()}`);
  const context = contextLines.join("\n");

  const client = new OpenAI({ apiKey });

  const prompt = `Analyze this contractor quote in depth and return ONLY valid JSON with this exact schema. Extract every field you can infer; use null for unknown.

{
  "summary": {
    "total": number | null,
    "contractor_name": string | null,
    "project_type": string | null,
    "risk_level": "low"|"medium"|"high",
    "quality_score": number 0-100 | null,
    "confidence": "low"|"medium"|"high"
  },
  "payment": {
    "deposit_percent": number | null,
    "deposit_required": boolean | null,
    "payment_terms_text": string | null,
    "payment_risk": "low"|"medium"|"high",
    "recommended_schedule_example": ["20% deposit", "40% mid-project", "40% after inspection"]
  },
  "timeline": {
    "timeline_present": boolean,
    "timeline_text": string | null,
    "timeline_clarity": "missing"|"basic"|"clear",
    "recommended_milestones": [
      {"key": "materials_delivered", "title": "Materials Delivered", "meaning": "one sentence what it means", "example": "one sentence example good wording"},
      {"key": "tearoff_complete", "title": "Tear-off Complete", "meaning": "...", "example": "..."},
      {"key": "deck_inspection", "title": "Deck Inspection Complete", "meaning": "...", "example": "..."},
      {"key": "install_complete", "title": "Install Complete", "meaning": "...", "example": "..."},
      {"key": "final_inspection", "title": "Cleanup & Final Inspection", "meaning": "...", "example": "..."},
      {"key": "warranty_docs", "title": "Warranty Docs Provided", "meaning": "...", "example": "..."}
    ]
  },
  "costs": {
    "line_items": [{"name": string, "qty": number|null, "unit_price": number|null, "total": number|null}],
    "labor_total": number|null,
    "materials_total": number|null,
    "disposal_total": number|null,
    "breakdown": {"labor_pct": number, "materials_pct": number, "disposal_pct": number},
    "high_cost_flags": [{"name": string, "reason": string}]
  },
  "scope": {
    "present": [string],
    "missing_or_unclear": [{"item": string, "severity": "info"|"warn", "why": string}]
  },
  "negotiation": {
    "items": [{"ask": string, "why": string}]
  },
  "terms": {
    "valid_days": number|null,
    "discount": number|null,
    "tax_percent": number|null
  },
  "red_flags": [{"title": string, "severity": "low"|"medium"|"high", "detail": string}],
  "signals": {
    "pricing_outliers": number,
    "missing_scope": number,
    "warranty_red_flags": number,
    "timeline_red_flags": number
  },
  "quality": {
    "doc_quality": number 0-1,
    "line_item_clarity": number 0-1
  },
  "preview_findings": [string]
}

Rules: Use null when unknown. Be specific and homeowner-friendly. For roofing quotes infer scope items (ice & water shield, underlayment, drip edge, ventilation, flashing, deck inspection, permit, cleanup). No markdown, JSON only.
Signals (conservative counts): pricing_outliers 0-10, missing_scope 0-10, warranty_red_flags 0-5, timeline_red_flags 0-5.
Quality: doc_quality and line_item_clarity must be 0..1.
preview_findings: 2–3 items max, homeowner-friendly, NO dollar amounts.
${context ? `\nContext:\n${context}` : ""}

QUOTE TEXT:
${extractedText.slice(0, 120000)}`;

  console.log("[analyzeQuote] OpenAI request start");
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: "Return strict JSON only, no markdown." },
      { role: "user", content: prompt },
    ],
  });
  console.log("[analyzeQuote] OpenAI request end");

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  let report_json: QuoteReportJson;
  try {
    report_json = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) as QuoteReportJson;
  } catch {
    report_json = {
      notes: ["Analysis could not be parsed."],
      confidence: "low",
    };
  }

  const report_html = buildReportHtml(report_json);
  return { report_json, report_html };
}

function buildReportHtml(r: QuoteReportJson): string {
  const summary = r.summary;
  const ov = r.quote_overview ?? {};
  const contractor = summary?.contractor_name ?? ov.contractor_name;
  const projectType = summary?.project_type ?? ov.project_type;
  const total = summary?.total ?? ov.quote_total;
  const currency = "USD";

  const lines: string[] = [
    "<div class='quote-report'>",
    "<h2>Project snapshot</h2>",
    "<ul>",
    contractor ? `<li><strong>Contractor:</strong> ${escapeHtml(String(contractor))}</li>` : "",
    projectType ? `<li><strong>Project type:</strong> ${escapeHtml(String(projectType))}</li>` : "",
    total != null ? `<li><strong>Total:</strong> ${currency} ${Number(total)}</li>` : "",
    "</ul>",
  ];

  const flags = r.red_flags ?? [];
  if (flags.length) {
    lines.push("<h2>Red flags</h2>", "<ul>");
    for (const f of flags) {
      const detail = f.detail ?? f.why_it_matters ?? "";
      lines.push(`<li><strong>${escapeHtml(f.title)}</strong> (${f.severity}) — ${escapeHtml(detail)}</li>`);
    }
    lines.push("</ul>");
  }

  const missing = r.scope?.missing_or_unclear?.map((m) => m.item) ?? r.missing_info ?? [];
  if (missing.length) {
    lines.push("<h2>Missing or unclear</h2>", "<ul>");
    for (const m of missing) lines.push(`<li>${escapeHtml(m)}</li>`);
    lines.push("</ul>");
  }

  const negotiation = r.negotiation?.items ?? r.questions_to_ask?.map((q) => ({ ask: q, why: "" })) ?? [];
  if (negotiation.length) {
    lines.push("<h2>Negotiation</h2>", "<ul>");
    for (const n of negotiation) {
      const ask = typeof n === "string" ? n : n.ask;
      lines.push(`<li>${escapeHtml(ask)}</li>`);
    }
    lines.push("</ul>");
  }

  const notes = r.notes ?? [];
  if (notes.length) {
    lines.push("<h2>Terms</h2>", "<ul>");
    for (const n of notes) lines.push(`<li>${escapeHtml(n)}</li>`);
    lines.push("</ul>");
  }

  const conf = summary?.confidence ?? r.confidence ?? "medium";
  lines.push("<p><small>Confidence: " + conf + "</small></p>", "</div>");
  return lines.filter(Boolean).join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Preview finding with severity for UI styling. */
export interface PreviewFindingWithSeverity {
  text: string;
  severity: "positive" | "warning" | "risk";
}

/** Free scan UI result (snapshot shown before payment). */
export interface FreeScanUiResult {
  overall_score: number;
  overall_rating: "Low Concern" | "Moderate Concern" | "High Concern";
  confidence: "High" | "Medium" | "Low";
  categories: Array<{ name: string; score: number; risk: "Low" | "Medium" | "High" }>;
  preview_findings: PreviewFindingWithSeverity[];
  locked_findings_count: number;
  top_red_flags: Array<{ title: string; detail?: string }>;
  score_breakdown?: { inputs: ScoreInputs };
}

/** Internal expected OpenAI JSON shape for free scan signals. */
type FreeScanSignalsJson = {
  signals: {
    pricing_outliers: number;
    missing_scope: number;
    warranty_red_flags: number;
    timeline_red_flags: number;
  };
  quality: {
    doc_quality: number; // 0..1
    line_item_clarity: number; // 0..1
  };
  payment?: { deposit_percent?: number | null };
  preview_findings: string[]; // 2–3 short bullets
  top_red_flags: Array<{ title: string; detail?: string }>; // max 2
};

function safeNum(n: unknown, fallback: number) {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/**
 * Lightweight analysis for free scan preview.
 * Returns a stable, debuggable score object (same shape the UI expects).
 */
export async function runFreeScan(
  pdfBuffer: Buffer,
  projectType?: string | null,
  projectNotes?: string | null
): Promise<FreeScanUiResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  let extractedText = "";
  try {
    const { text } = await pdfParse(pdfBuffer);
    extractedText = (text ?? "").trim();
  } catch {
    extractedText = "(Could not extract text from PDF)";
  }

  const context = [projectType && `Project type: ${projectType}`, projectNotes && `Notes: ${projectNotes}`]
    .filter(Boolean)
    .join("\n");

  const client = new OpenAI({ apiKey });

  const prompt = `Analyze this contractor quote for a FREE preview.
Return ONLY valid JSON with the exact schema below (no markdown, no extra keys).
Do NOT include dollar amounts, totals, or detailed line items.
Be conservative: if something is unclear, reduce quality scores and do not over-count signals.

SCHEMA:
{
  "signals": {
    "pricing_outliers": number,      // integer 0-10
    "missing_scope": number,         // integer 0-10
    "warranty_red_flags": number,    // integer 0-5
    "timeline_red_flags": number     // integer 0-5
  },
  "quality": {
    "doc_quality": number,           // 0..1
    "line_item_clarity": number      // 0..1
  },
  "payment": {"deposit_percent": number | null},
  "preview_findings": [string],      // 2-3 items max, 10-140 chars each
  "top_red_flags": [{"title": string, "detail": string}]  // 0-2 items max, no dollar amounts
}

Rules: max 3 preview_findings, max 2 top_red_flags. NO dollar amounts. quality fields 0..1. JSON only.
Extract deposit_percent from the quote if a deposit percentage is stated (e.g. "50% deposit", "20% upfront"); use null if not found or unclear.
GUIDANCE:
- pricing_outliers: count unusual pricing patterns (e.g. vague lump sums, missing quantities, unusually high unit costs) WITHOUT stating prices.
- missing_scope: count missing/unclear scope items typical for ${projectType ?? "this project"} (roofing: underlayment, drip edge, flashing, ventilation, ice & water, cleanup, deck inspection, permits, disposal).
- warranty_red_flags: count warranty gaps (missing warranty, unclear terms, very limited coverage).
- timeline_red_flags: count schedule gaps (no timeline, unclear start/end, no milestones).
- doc_quality: readability and completeness (0=poor, 1=excellent)
- line_item_clarity: presence of quantities/unit pricing (0=none, 1=clear)

${context ? `\nContext:\n${context}` : ""}

QUOTE TEXT:
${extractedText.slice(0, 80000)}`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: "Return strict JSON only. No markdown. No commentary." },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  console.log("[runFreeScan] raw (first 400 chars):", raw.slice(0, 400));

  let parsed: FreeScanSignalsJson | null = null;
  try {
    parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) as FreeScanSignalsJson;
  } catch {
    parsed = null;
  }

  // Fallback defaults (conservative)
  const signals = parsed?.signals ?? {
    pricing_outliers: 1,
    missing_scope: 1,
    warranty_red_flags: 0,
    timeline_red_flags: 0,
  };

  const quality = parsed?.quality ?? {
    doc_quality: 0.55,
    line_item_clarity: 0.5,
  };

  const depositPercent =
    typeof parsed?.payment?.deposit_percent === "number" && Number.isFinite(parsed.payment.deposit_percent)
      ? parsed.payment.deposit_percent
      : null;
  const depositBump = depositPercent != null && depositPercent >= 40 ? 1 : 0;

  // Normalize/clamp inputs (deposit >= 40 increases pricing + warranty signals)
  const inputs: ScoreInputs = {
    doc_quality: clamp01(safeNum(quality.doc_quality, 0.55)),
    line_item_clarity: clamp01(safeNum(quality.line_item_clarity, 0.5)),
    missing_scope_signals: clampInt(safeNum(signals.missing_scope, 1), 0, 10),
    pricing_outlier_signals: clampInt(safeNum(signals.pricing_outliers, 1) + depositBump, 0, 10),
    warranty_signals: clampInt(safeNum(signals.warranty_red_flags, 0) + depositBump, 0, 5),
    timeline_signals: clampInt(safeNum(signals.timeline_red_flags, 0), 0, 5),
  };

  const scoreObj = computeFreeScore(inputs);

  const modelFindings = Array.isArray(parsed?.preview_findings)
    ? (parsed.preview_findings as string[]).filter((s) => typeof s === "string" && (s as string).trim().length >= 10).slice(0, 3).map((s) => (s as string).trim())
    : [];
  const scoreFindings = Array.isArray(scoreObj.preview_findings) ? (scoreObj.preview_findings as string[]) : [];
  const finalPreview = buildPreviewFindings(depositPercent, modelFindings, scoreFindings, 4);

  // Red flags: prefer model output but cap
  const top_red_flags =
    (Array.isArray(parsed?.top_red_flags) ? parsed.top_red_flags : [])
      .filter((f) => f && typeof f.title === "string")
      .slice(0, 2)
      .map((f) => ({ title: String(f.title).trim(), detail: f.detail ? String(f.detail).trim() : "" })) ?? [];

  return {
    overall_score: scoreObj.overall_score,
    overall_rating: scoreObj.overall_rating,
    confidence: scoreObj.confidence as "High" | "Medium" | "Low",
    categories: scoreObj.categories,
    preview_findings: finalPreview,
    locked_findings_count: scoreObj.locked_findings_count,
    top_red_flags,
    score_breakdown: scoreObj.score_breakdown,
  };
}
