/**
 * Preview findings with severity for free scan UI.
 * Ensures risk signals (e.g. high deposit) always use caution language.
 */
export type FindingSeverity = "positive" | "warning" | "risk";

export interface PreviewFinding {
  text: string;
  severity: FindingSeverity;
}

const RISK_KEYWORDS =
  /deposit|upfront|missing\s+scope|scope\s+gap|warranty\s+gap|limited\s+warranty|timeline\s+unclear|no\s+timeline|payment\s+risk/i;
const WARNING_KEYWORDS =
  /unclear|slightly|may\s+need|could\s+improve|consider\s+clarifying/i;

/**
 * Classify raw AI finding text into severity.
 * Risk-related topics must use caution language (never neutral for risk signals).
 */
function classifySeverity(text: string): FindingSeverity {
  const lower = text.toLowerCase();
  if (RISK_KEYWORDS.test(lower)) return "risk";
  if (WARNING_KEYWORDS.test(lower)) return "warning";
  return "warning"; // default: treat unknown as warning (not positive)
}

/**
 * Build deposit finding based on deposit_percent.
 * >= 40: risk (must NOT be neutral)
 * 30–39: warning
 * <= 30: positive
 */
export function depositFinding(depositPercent: number | null | undefined): PreviewFinding | null {
  if (depositPercent == null || !Number.isFinite(depositPercent)) return null;
  if (depositPercent >= 40)
    return {
      text: "The required deposit appears higher than typical industry ranges.",
      severity: "risk",
    };
  if (depositPercent >= 30 && depositPercent < 40)
    return {
      text: "The deposit is slightly above common industry ranges.",
      severity: "warning",
    };
  if (depositPercent <= 30)
    return {
      text: "Deposit amount appears within common industry ranges.",
      severity: "positive",
    };
  return null;
}

/**
 * Convert raw string findings to severity format.
 * Applies rule-based corrections: risk topics get "risk" severity.
 */
export function toSeverityFindings(
  raw: string[],
  options?: { maxItems?: number }
): PreviewFinding[] {
  const max = options?.maxItems ?? 4;
  return raw
    .filter((s) => typeof s === "string" && s.trim().length >= 10)
    .slice(0, max)
    .map((s) => ({
      text: (s as string).trim(),
      severity: classifySeverity(s as string),
    }));
}

/**
 * Build final preview findings: deposit first (if any), then AI/score findings.
 * Max 4 items. Risk findings always included when present.
 */
export function buildPreviewFindings(
  depositPercent: number | null | undefined,
  aiFindings: string[],
  scoreFindings: string[],
  maxItems = 4
): PreviewFinding[] {
  const out: PreviewFinding[] = [];
  const seen = new Set<string>();

  const deposit = depositFinding(depositPercent);
  if (deposit) {
    out.push(deposit);
    seen.add(deposit.text);
  }

  const aiSeverity = toSeverityFindings(aiFindings, { maxItems: maxItems - out.length });
  for (const f of aiSeverity) {
    if (!seen.has(f.text) && out.length < maxItems) {
      out.push(f);
      seen.add(f.text);
    }
  }

  const scoreSeverity = toSeverityFindings(scoreFindings, { maxItems: maxItems - out.length });
  for (const f of scoreSeverity) {
    if (!seen.has(f.text) && out.length < maxItems) {
      out.push(f);
      seen.add(f.text);
    }
  }

  if (out.length === 0) {
    out.push({
      text: "This snapshot highlights areas to double-check before signing.",
      severity: "warning",
    });
  }

  return out.slice(0, maxItems);
}
