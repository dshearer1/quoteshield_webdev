import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildReportJsonSummary,
  getNegotiationShortReply,
} from "@/lib/ai/analyzeContractorResponse";

export const runtime = "nodejs";

function getPreviousNegotiationSuggestions(reportJson: Record<string, unknown> | null): string {
  if (!reportJson) return "";
  const negotiation = reportJson.negotiation as { items?: Array<{ ask?: string }> } | undefined;
  const questions = (reportJson.questions_to_ask as string[] | undefined) ?? [];
  const items = negotiation?.items ?? [];
  const asks = items.map((i) => i.ask).filter(Boolean) as string[];
  const combined = [...new Set([...asks, ...questions])].slice(0, 8);
  return combined.length ? combined.join("; ") : "";
}

export async function POST(req: Request) {
  const sb = supabaseAdmin;

  try {
    const body = await req.json().catch(() => ({}));
    const submissionId = body?.submissionId as string | undefined;
    const messageText = (body?.messageText ?? body?.contractorResponseText) as string | undefined;
    const homeownerQuestions = (body?.homeownerQuestions as string | undefined) ?? null;

    const userMessage = messageText?.trim() ?? "";
    if (!submissionId) {
      return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
    }
    if (userMessage.length < 10) {
      return NextResponse.json(
        { error: "Message too short (paste a contractor reply or use a quick question)" },
        { status: 400 }
      );
    }

    const fullUserMessage =
      homeownerQuestions?.trim() ? `${userMessage}\n\nQuestions I asked: ${homeownerQuestions.trim()}` : userMessage;

    const { data: sub, error: subErr } = await sb
      .from("submissions")
      .select("id, user_id, project_type, report_json")
      .eq("id", submissionId)
      .single();

    if (subErr || !sub) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const reportJson = (sub.report_json ?? null) as Record<string, unknown> | null;
    const reportSummary = buildReportJsonSummary(reportJson);
    const previousNegotiationSuggestions = getPreviousNegotiationSuggestions(reportJson);

    const { data: lastMessages } = await sb
      .from("negotiation_chat_messages")
      .select("role, message_text")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false })
      .limit(10);

    const assistantOnly = (lastMessages ?? [])
      .filter((m) => m.role === "assistant")
      .map((m) => m.message_text)
      .reverse()
      .slice(-5);

    const shortReply = await getNegotiationShortReply({
      reportSummary,
      lastAssistantMessages: assistantOnly,
      currentUserMessage: fullUserMessage,
      previousNegotiationSuggestions: previousNegotiationSuggestions || undefined,
    });

    const { error: userInsErr } = await sb.from("negotiation_chat_messages").insert({
      submission_id: submissionId,
      role: "user",
      message_text: fullUserMessage,
    });
    if (userInsErr) {
      console.error("[api/negotiation/analyze] insert user message:", userInsErr);
      throw new Error(`Failed to save message: ${userInsErr.message}`);
    }

    const { error: assistantInsErr } = await sb.from("negotiation_chat_messages").insert({
      submission_id: submissionId,
      role: "assistant",
      message_text: shortReply,
    });
    if (assistantInsErr) {
      console.error("[api/negotiation/analyze] insert assistant message:", assistantInsErr);
      throw new Error(`Failed to save reply: ${assistantInsErr.message}`);
    }

    return NextResponse.json({ ok: true, message: shortReply });
  } catch (e: unknown) {
    console.error("[api/negotiation/analyze] error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
