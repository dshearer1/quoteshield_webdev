import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { analyzeQuote } from "@/lib/ai/analyzeQuote";
import { saveFullAnalysis } from "@/lib/ai/saveAnalysis";
import { aiResultToScoreInputs } from "@/lib/aiResultToScoreInputs";
import { computeFreeScore } from "@/lib/scoring";
import { buildPreviewFindings } from "@/lib/previewFindings";

export const runtime = "nodejs";

const STORAGE_BUCKET = "quotes";

const OPENAI_TIMEOUT_MS = 90_000;

/**
 * POST /api/process
 * Body: { submissionId: string }
 *
 * 1) Sets status=processing immediately for draft/failed.
 * 2) Runs PDF download + analyzeQuote + scoring.
 * 3) On success: status=complete (or pending_payment for unpaid preview).
 * 4) On error: status=failed, ai_error=message; returns 504 on timeout.
 */
export async function POST(req: Request) {
  const sb = supabaseAdmin;
  let submissionId: string | null;

  try {
    const body = await req.json().catch(() => ({}));
    console.log("[/api/process] called with body:", body);

    // Support multiple possible keys
    submissionId =
      body?.submissionId ??
      body?.submission_id ??
      body?.id ??
      null;

    // If submissionId is missing but public_id (token) is provided, resolve it
    if (!submissionId && body?.public_id) {
      const { data } = await sb
        .from("submissions")
        .select("id")
        .eq("token", body.public_id)
        .single();

      submissionId = data?.id ?? null;
    }

    // If submissionId is still missing but stripe_session_id is provided (webhook case)
    if (!submissionId && body?.stripe_session_id) {
      const { data } = await sb
        .from("submissions")
        .select("id")
        .eq("stripe_session_id", body.stripe_session_id)
        .single();

      submissionId = data?.id ?? null;
    }

    if (!submissionId) {
      console.error("[/api/process] Missing submissionId. Body:", body);
      return NextResponse.json(
        { ok: false, error: "Missing submissionId" },
        { status: 400 }
      );
    }

    console.log("[/api/process] submissionId:", submissionId);

    const { data: sub, error: subErr } = await sb
      .from("submissions")
      .select("id, status, file_path, project_type, project_notes, address, project_value, contractor_name, ai_result, quote_type")
      .eq("id", submissionId)
      .single();

    if (subErr || !sub) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (sub.status === "complete") {
      console.log("[api/process] already complete, skipping");
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }

    if (sub.status === "processing" && sub.ai_result == null) {
      console.log("[api/process] already processing (no ai_result yet), skipping");
      return NextResponse.json({ ok: true, alreadyProcessing: true });
    }

    const filePath = sub.file_path ?? "";
    const isUnpaidPreview =
      (sub.status === "draft" || sub.status === "pending_payment") && !!filePath;
    const isPaidRun = sub.status === "processing" || sub.status === "paid" || sub.status === "failed";

    // Paid/processing but report already generated: ensure report_json score exists, then mark complete.
    if ((sub.status === "paid" || sub.status === "processing") && sub.ai_result != null) {
      const ai = sub.ai_result as Record<string, unknown> & { preview_findings?: unknown; payment?: { deposit_percent?: number | null } };
      const inputs = aiResultToScoreInputs(ai);
      const scoreObj = computeFreeScore(inputs);
      const depositPercent = ai?.payment?.deposit_percent ?? null;
      const aiPreview = Array.isArray(ai.preview_findings)
        ? (ai.preview_findings as string[]).filter((s) => typeof s === "string" && (s as string).trim().length >= 10).slice(0, 3).map((s) => String(s).trim())
        : [];
      const scoreFindings = Array.isArray(scoreObj.preview_findings) ? (scoreObj.preview_findings as string[]) : [];
      const preview_findings = buildPreviewFindings(depositPercent, aiPreview, scoreFindings, 4);
      await sb
        .from("submissions")
        .update({ status: "complete", report_json: { ...scoreObj, preview_findings } as object })
        .eq("id", submissionId);
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }

    if (!isUnpaidPreview && !isPaidRun) {
      return NextResponse.json({ error: "Submission not eligible for processing" }, { status: 400 });
    }

    // If we already have ai_result for unpaid preview, ensure report_json has score then return (idempotent).
    if (isUnpaidPreview && sub.ai_result != null) {
      const ai = sub.ai_result as Record<string, unknown> & { preview_findings?: unknown; payment?: { deposit_percent?: number | null } };
      const inputs = aiResultToScoreInputs(ai);
      const scoreObj = computeFreeScore(inputs);
      const depositPercent = ai?.payment?.deposit_percent ?? null;
      const aiPreview = Array.isArray(ai.preview_findings)
        ? (ai.preview_findings as string[]).filter((s) => typeof s === "string" && (s as string).trim().length >= 10).slice(0, 3).map((s) => String(s).trim())
        : [];
      const scoreFindings = Array.isArray(scoreObj.preview_findings) ? (scoreObj.preview_findings as string[]) : [];
      const preview_findings = buildPreviewFindings(depositPercent, aiPreview, scoreFindings, 4);
      await sb
        .from("submissions")
        .update({ report_json: { ...scoreObj, preview_findings } as object })
        .eq("id", submissionId);
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }

    // Set status=processing immediately so scan page shows "processing" and can poll.
    await sb
      .from("submissions")
      .update({ status: "processing", analysis_status: "parsing", ai_error: null })
      .eq("id", submissionId);

    if (!filePath) {
      console.error("[api/process] no file_path for submission");
      return NextResponse.json(
        { error: "No file uploaded. Please upload a PDF first." },
        { status: 400 }
      );
    }
    console.log("[api/process] file_path:", filePath);

    const { data, error: dlErr } = await sb.storage.from(STORAGE_BUCKET).download(filePath);
    if (dlErr || !data) {
      console.error("[api/process] PDF download failed:", dlErr?.message ?? "no data");
      return NextResponse.json(
        { error: "Failed to download PDF. The file may be missing or inaccessible." },
        { status: 502 }
      );
    }
    const arrayBuffer = await data.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    console.log("[/api/process] pdf bytes:", pdfBuffer?.length ?? 0);
    if (!pdfBuffer || pdfBuffer.length === 0) throw new Error("PDF download returned 0 bytes");

    const rawNotes = sub.project_notes ?? "";
    const ptMatch = rawNotes.match(/Property type:\s*(.+?)(?=\n|$)/i);
    const psMatch = rawNotes.match(/Project size:\s*(.+?)(?=\n|$)/i);
    const scMatch = rawNotes.match(/Special conditions:\s*(.+?)(?=\n|$)/i);
    const customerNotesRest = rawNotes
      .replace(/\n?Property type:.*(?=\n|$)/gi, "\n")
      .replace(/\n?Project size:.*(?=\n|$)/gi, "\n")
      .replace(/\n?Special conditions:.*(?=\n|$)/gi, "\n")
      .replace(/\n+/g, "\n")
      .trim();
    const propertyType = ptMatch ? ptMatch[1].trim() : null;
    const projectSize = psMatch ? psMatch[1].trim() : null;
    const specialConditions = scMatch
      ? scMatch[1].split(",").map((s: string) => s.trim()).filter(Boolean)
      : null;

    const analyzePromise = analyzeQuote(
      pdfBuffer,
      sub.project_type ?? null,
      customerNotesRest || rawNotes,
      {
        projectType: sub.project_type ?? null,
        projectNotes: customerNotesRest || rawNotes,
        address: sub.address ?? null,
        projectValue: sub.project_value ?? null,
        contractorName: sub.contractor_name ?? null,
        propertyType: propertyType ?? undefined,
        projectSize: projectSize ?? undefined,
        specialConditions: specialConditions ?? undefined,
      },
      null
    );
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(Object.assign(new Error("Analysis timed out"), { statusCode: 504 })),
        OPENAI_TIMEOUT_MS
      );
    });
    let analyzeResult: Awaited<ReturnType<typeof analyzeQuote>>;
    try {
      console.log("[api/process] openai start");
      analyzeResult = await Promise.race([analyzePromise, timeoutPromise]);
      console.log("[api/process] openai end");
    } catch (openaiErr: unknown) {
      const isTimeout = openaiErr instanceof Error && (openaiErr as { statusCode?: number }).statusCode === 504;
      console.error("[api/process] openai error:", openaiErr);
      throw isTimeout ? Object.assign(new Error("Analysis timed out"), { statusCode: 504 }) : openaiErr;
    }

    const { report_json, report_html } = analyzeResult;
    console.log("[/api/process] analyzed. report_json.summary:", !!report_json?.summary, "line_items:", report_json?.costs?.line_items?.length ?? 0);
    const r = report_json as Record<string, unknown> & {
      signals?: unknown;
      quality?: unknown;
      preview_findings?: unknown;
      payment?: { deposit_percent?: number | null };
    };
    const hasSignalsQuality =
      r?.signals != null && typeof r.signals === "object" &&
      r?.quality != null && typeof r.quality === "object";
    console.log("[api/process] analyzeQuote returned signals/quality:", hasSignalsQuality);

    const inputs = aiResultToScoreInputs(report_json as Parameters<typeof aiResultToScoreInputs>[0]);
    const scoreObj = computeFreeScore(inputs);
    console.log("[api/process] computed inputs:", JSON.stringify(inputs));
    console.log("[api/process] overall_score:", scoreObj.overall_score);

    const depositPercent = r?.payment?.deposit_percent ?? null;
    const aiPreview = Array.isArray(r.preview_findings)
      ? (r.preview_findings as string[]).filter((s) => typeof s === "string" && s.trim().length >= 10).slice(0, 3).map((s) => String(s).trim())
      : [];
    const scoreFindings = Array.isArray(scoreObj.preview_findings)
      ? (scoreObj.preview_findings as string[])
      : [];
    const preview_findings = buildPreviewFindings(depositPercent, aiPreview, scoreFindings, 4);

    const reportJsonForUi = {
      ...scoreObj,
      preview_findings,
    };

    const ai_confidence = (r?.summary as { confidence?: string })?.confidence ?? (r?.confidence as string) ?? "medium";
    const isRevisedFree = isUnpaidPreview && sub.quote_type === "revised";

    const { error: saveErr } = await saveFullAnalysis(submissionId, analyzeResult, {
      isUnpaidPreview,
      isRevisedFree,
      address: sub.address ?? null,
    });

    if (saveErr) throw saveErr;
    console.log("[/api/process] saveFullAnalysis completed");

    return NextResponse.json({ ok: true, confidence: ai_confidence });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/process] failed:", err);
    if (submissionId) {
      try {
        await sb
          .from("submissions")
          .update({
            status: "error",
            analysis_status: "error",
            ai_error: msg,
          })
          .eq("id", submissionId);
      } catch (updateEx) {
        console.error("[/api/process] failed to set status=error:", updateEx);
      }
    }
    const statusCode = (err as { statusCode?: number })?.statusCode ?? 500;
    return NextResponse.json(
      { ok: false, error: msg },
      { status: statusCode === 504 ? 504 : 500 }
    );
  }
}
