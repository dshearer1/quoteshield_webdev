import "server-only";
import OpenAI from "openai";
import type { QuoteReportJson } from "@/lib/ai/analyzeQuote";

export type NegotiationAnalysisJson = {
  response_summary: {
    tone: "cooperative" | "neutral" | "defensive" | "avoidant";
    clarity: "clear" | "partial" | "vague";
    overall_impression: "positive" | "mixed" | "concerning";
    one_sentence_takeaway: string;
  };
  topic_resolution: {
    payment: { addressed: boolean; result: "improved" | "unchanged" | "worse" | "unknown"; details: string };
    timeline: { addressed: boolean; result: "improved" | "unchanged" | "worse" | "unknown"; details: string };
    warranty: { addressed: boolean; result: "improved" | "unchanged" | "worse" | "unknown"; details: string };
    scope: {
      addressed: boolean;
      result: "improved" | "unchanged" | "worse" | "unknown";
      details: string;
      items_confirmed_in_writing: string[];
      items_still_unclear: string[];
    };
    permits: { addressed: boolean; result: "improved" | "unchanged" | "worse" | "unknown"; details: string };
    cleanup_disposal: { addressed: boolean; result: "improved" | "unchanged" | "worse" | "unknown"; details: string };
  };
  signals: {
    positive: Array<{ signal: string; why_it_matters: string }>;
    caution: Array<{ signal: string; why_it_matters: string; severity: "low" | "medium" | "high" }>;
  };
  risk_update: {
    previous_risk_level: "low" | "medium" | "high" | "unknown";
    new_risk_level: "low" | "medium" | "high";
    risk_delta: "reduced" | "unchanged" | "increased";
    top_reasons: string[];
  };
  recommended_next_steps: Array<{ action: string; why: string; priority: "high" | "medium" | "low" }>;
  follow_up_message: { enabled: boolean; subject: string; message: string };
  confidence: "low" | "medium" | "high";
};

export type AnalyzeContractorResponseInput = {
  contractorResponseText: string;
  reportJson?: QuoteReportJson | Record<string, unknown> | null;
  projectType?: string | null;
  homeownerQuestions?: string | null;
};

/** Input for short, texting-style advisor reply (max 3 bullets, ~400 chars). */
export type NegotiationShortReplyInput = {
  reportSummary: string;
  /** Last 5 assistant messages only (to avoid long context). */
  lastAssistantMessages: string[];
  /** Current user message: pasted contractor response OR a quick prompt (e.g. "Did this reduce my risk?"). */
  currentUserMessage: string;
  /** Optional: previous negotiation suggestions from the report (e.g. questions to ask). */
  previousNegotiationSuggestions?: string;
};

/** Build a compact summary from report_json (legacy or new schema) for the AI context. */
export function buildReportJsonSummary(reportJson?: QuoteReportJson | Record<string, unknown> | null): string {
  if (!reportJson) return "No report JSON available.";
  const r = reportJson as Record<string, unknown>;
  const summary = r.summary as Record<string, unknown> | undefined;
  const ov = r.quote_overview as Record<string, unknown> | undefined;
  const payment = r.payment as Record<string, unknown> | undefined;
  const timeline = r.timeline as Record<string, unknown> | undefined;
  const scope = r.scope as Record<string, unknown> | undefined;
  const redFlags = (r.red_flags ?? []) as Array<{ title: string; severity?: string; why_it_matters?: string }>;
  const missingInfo = (r.missing_info ?? []) as string[];
  const scopeMissing = (scope?.missing_or_unclear ?? []) as Array<{ item: string }>;

  const contractorName = summary?.contractor_name ?? ov?.contractor_name;
  const total = summary?.total ?? ov?.quote_total;
  const riskLevel = summary?.risk_level ?? "unknown";

  let depositPercent: number | string | null =
    typeof payment?.deposit_percent === "number" ? payment.deposit_percent : null;
  if (depositPercent == null && redFlags.length > 0) {
    const flagsText = redFlags.map((f) => (f.why_it_matters ?? "") + " " + f.title).join(" ");
    const match = flagsText.match(/(\d+)\s*%\s*(?:deposit|upfront)/i) ?? flagsText.match(/deposit\s*[:\s]*(\d+)/i);
    depositPercent = match ? match[1] : "unknown";
  } else if (depositPercent == null) {
    depositPercent = "unknown";
  }

  const timelinePresent: boolean | string =
    typeof timeline?.timeline_present === "boolean"
      ? timeline.timeline_present
      : missingInfo.some((m) => /timeline|milestone|schedule|start\s*date/i.test(m))
        ? false
        : "unknown";

  const warrantyPresent = missingInfo.some((m) => /warranty|warrant/i.test(m)) ? "missing" : (scope?.present ? "present" : "unknown");

  const topRedFlags = redFlags.slice(0, 3).map((f) => f.title).join("; ") || "none";
  const topMissing = scopeMissing.length > 0
    ? scopeMissing.slice(0, 5).map((m) => m.item).join(", ")
    : missingInfo.slice(0, 5).join(", ") || "none";

  return [
    `contractor_name: ${contractorName ?? "unknown"}`,
    `total: ${total ?? "unknown"}`,
    `risk_level: ${riskLevel}`,
    `deposit_percent: ${depositPercent}`,
    `timeline_present: ${timelinePresent}`,
    `timeline_clarity: ${timeline?.timeline_clarity ?? "unknown"}`,
    `warranty: ${warrantyPresent}`,
    `top_red_flags: ${topRedFlags}`,
    `top_missing_or_unclear: ${topMissing}`,
  ].join("\n");
}

const SHORT_REPLY_MAX_CHARS = 400;
const SHORT_REPLY_MAX_BULLETS = 3;

/**
 * Returns a short, texting-style advisor reply: Summary, Signal, Next Step (max 3 bullets, 1 sentence each).
 * Enforces 400 char limit and no markdown headings.
 */
export async function getNegotiationShortReply(
  input: NegotiationShortReplyInput
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const { reportSummary, lastAssistantMessages, currentUserMessage, previousNegotiationSuggestions } = input;
  const historyBlob =
    lastAssistantMessages.length > 0
      ? `Previous assistant replies (for context only; do not repeat):\n${lastAssistantMessages.slice(-5).map((m, i) => `[${i + 1}] ${m}`).join("\n")}`
      : "No previous replies yet.";

  const systemPrompt = `You are a calm, professional negotiation advisor. Reply in SHORT text-message style.

IMPORTANT RULES:
- Respond in short text-message style.
- Maximum 3 bullets total.
- Maximum 1 sentence per bullet.
- Focus ONLY on the contractor response and the homeowner's question.
- Do NOT restate the entire quote report.
- Provide actionable homeowner guidance.
- Avoid legal or confrontational tone.
- No markdown headings (no ## or **). Use only these three bullet prefixes: ✔ ⚠ ➡
- If the contractor response resolves major risks, reply with: ✔ This resolves the major outstanding risks. ➡ If the written contract matches this, you are safe to proceed. Then stop; do not add more suggestions.
- Do not repeat identical advice you already gave in previous replies.`;

  const userPrompt = `Quote report summary (reference only):
${reportSummary}
${previousNegotiationSuggestions ? `Previous negotiation suggestions from report:\n${previousNegotiationSuggestions}` : ""}

${historyBlob}

Current homeowner message (contractor reply they pasted OR a follow-up question):
${currentUserMessage.slice(0, 8000)}

Reply with EXACTLY 3 lines (or 2 if situation is resolved), each starting with one of: ✔ ⚠ ➡
Format:
✔ [One sentence summary]
⚠ [One risk or confirmation only]
➡ [One clear next step for the homeowner]
Keep each line under 120 characters. Total reply under ${SHORT_REPLY_MAX_CHARS} characters.`;

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  let raw = (completion.choices[0]?.message?.content?.trim() ?? "").replace(/^#+\s*/gm, "").trim();
  const bullets = raw.split(/\n/).filter((line) => /^[✔⚠➡]/.test(line.trim())).slice(0, SHORT_REPLY_MAX_BULLETS);
  if (bullets.length > 0) raw = bullets.join("\n");
  if (raw.length > SHORT_REPLY_MAX_CHARS) raw = raw.slice(0, SHORT_REPLY_MAX_CHARS - 3) + "...";
  return raw || "I’ve reviewed this. Ask if you’d like a specific next step.";
}

export async function analyzeContractorResponse(
  input: AnalyzeContractorResponseInput
): Promise<NegotiationAnalysisJson> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const contractorResponseText = (input.contractorResponseText ?? "").trim();
  if (contractorResponseText.length < 20) {
    throw new Error("Contractor response is too short to analyze.");
  }

  const reportSummary = buildReportJsonSummary(input.reportJson ?? null);
  const contextLines = [
    input.projectType ? `Project type: ${input.projectType}` : null,
    `Original quote highlights (from report JSON):\n${reportSummary}`,
    input.homeownerQuestions ? `Homeowner questions asked:\n${input.homeownerQuestions}` : "Homeowner questions asked: (not provided)",
  ].filter(Boolean);

  const prompt = `Return STRICT JSON only (no markdown, no commentary). Use only the contractor response and provided context. Do not invent facts.

Schema (must match exactly):
{
  "response_summary": {
    "tone": "cooperative"|"neutral"|"defensive"|"avoidant",
    "clarity": "clear"|"partial"|"vague",
    "overall_impression": "positive"|"mixed"|"concerning",
    "one_sentence_takeaway": string
  },
  "topic_resolution": {
    "payment": { "addressed": boolean, "result": "improved"|"unchanged"|"worse"|"unknown", "details": string },
    "timeline": { "addressed": boolean, "result": "improved"|"unchanged"|"worse"|"unknown", "details": string },
    "warranty": { "addressed": boolean, "result": "improved"|"unchanged"|"worse"|"unknown", "details": string },
    "scope": {
      "addressed": boolean,
      "result": "improved"|"unchanged"|"worse"|"unknown",
      "details": string,
      "items_confirmed_in_writing": string[],
      "items_still_unclear": string[]
    },
    "permits": { "addressed": boolean, "result": "improved"|"unchanged"|"worse"|"unknown", "details": string },
    "cleanup_disposal": { "addressed": boolean, "result": "improved"|"unchanged"|"worse"|"unknown", "details": string }
  },
  "signals": {
    "positive": [{"signal": string, "why_it_matters": string}],
    "caution": [{"signal": string, "why_it_matters": string, "severity": "low"|"medium"|"high"}]
  },
  "risk_update": {
    "previous_risk_level": "low"|"medium"|"high"|"unknown",
    "new_risk_level": "low"|"medium"|"high",
    "risk_delta": "reduced"|"unchanged"|"increased",
    "top_reasons": string[]
  },
  "recommended_next_steps": [{"action": string, "why": string, "priority": "high"|"medium"|"low"}],
  "follow_up_message": {"enabled": boolean, "subject": string, "message": string},
  "confidence": "low"|"medium"|"high"
}

Interpretation rules:
- addressed=true only if the contractor gave specific information in writing (not “we’ll discuss later”).
- improved if they added specificity (timeline window, milestones, documented warranty, reduced deposit, etc).
- worse if they refuse documentation, dismiss concerns, push urgency, or avoid specifics.
- Keep recommended_next_steps max 5.
- follow_up_message.enabled=true only if there are unresolved medium/high issues.
- Tone/clarity must be homeowner-friendly and calm.

CONTEXT:
${contextLines.join("\n\n")}

CONTRACTOR RESPONSE (verbatim):
${contractorResponseText.slice(0, 20000)}
`;

  const client = new OpenAI({ apiKey });

  console.log("[analyzeContractorResponse] OpenAI request start");
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: "Return strict JSON only, no markdown." },
      { role: "user", content: prompt },
    ],
  });
  console.log("[analyzeContractorResponse] OpenAI request end");

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  try {
    return JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) as NegotiationAnalysisJson;
  } catch {
    console.error("[analyzeContractorResponse] JSON parse failed:", raw.slice(0, 2000));
    throw new Error("Contractor response analysis could not be parsed as JSON.");
  }
}
