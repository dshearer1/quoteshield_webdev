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

function elapsed(ms: number): string {
  return `${Math.round(ms)}ms`;
}

/** Safe message from unknown error (no property access on unknown). */
function errorMessage(e: unknown): string | null {
  if (e == null) return null;
  if (e instanceof Error) return e.message;
  return String(e);
}

/** Step-by-step tracer: logs step name, elapsed time since start, and optional extra. Returns current step for error reporting. */
function createTracer(startTime: number) {
  let lastStep = "init";
  return {
    trace(step: string, extra?: Record<string, unknown>) {
      lastStep = step;
      const ms = Date.now() - startTime;
      if (extra) {
        console.log(`[/api/process] ${step} ${elapsed(ms)}`, extra);
      } else {
        console.log(`[/api/process] ${step} ${elapsed(ms)}`);
      }
      return lastStep;
    },
    get step() {
      return lastStep;
    },
  };
}

/**
 * POST /api/process
 * Body: { submissionId: string }
 *
 * Uses server-side supabaseAdmin (service role) only — no browser client.
 * 1) Sets status=processing immediately for draft/failed.
 * 2) Runs PDF download + analyzeQuote + scoring.
 * 3) On success: status=complete (or pending_payment for unpaid preview).
 * 4) On error: status=error, ai_error=message, processed_at=now(); returns 504 on timeout.
 */
export async function POST(req: Request) {
  const sb = supabaseAdmin;
  let submissionId: string | null = null;
  const startTime = Date.now();
  const tracer = createTracer(startTime);

  try {
    tracer.trace("parse_body");
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
        { ok: false, error: "Missing submissionId", step: "resolve_id" },
        { status: 400 }
      );
    }

    tracer.trace("resolve_id", { submissionId });

    const t0Fetch = Date.now();
    const { data: sub, error: subErr } = await sb
      .from("submissions")
      .select("id, status, file_path, project_type, project_notes, address, project_value, contractor_name, ai_result, quote_type")
      .eq("id", submissionId)
      .single();
    const subErrMsg = errorMessage(subErr);
    tracer.trace("fetch_submission", { elapsed: elapsed(Date.now() - t0Fetch), error: subErrMsg });

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

    tracer.trace("set_processing");
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
    const t0Download = Date.now();
    tracer.trace("download_pdf_start", { filePath, bucket: STORAGE_BUCKET });
    const { data, error: dlErr } = await sb.storage.from(STORAGE_BUCKET).download(filePath);
    const dlErrMsg = errorMessage(dlErr);
    tracer.trace("download_pdf", { elapsed: elapsed(Date.now() - t0Download), error: dlErrMsg, hasData: !!data });
    if (dlErr || !data) {
      console.error("[api/process] PDF download failed:", dlErrMsg ?? "no data", "path:", filePath, "bucket:", STORAGE_BUCKET);
      await sb
        .from("submissions")
        .update({ status: "error", analysis_status: "error", ai_error: "Failed to download PDF. The file may be missing or inaccessible.", processed_at: new Date().toISOString() })
        .eq("id", submissionId);
      return NextResponse.json(
        { error: "Failed to download PDF. The file may be missing or inaccessible." },
        { status: 502 }
      );
    }

    tracer.trace("pdf_buffer_start");
    let pdfBuffer: Buffer;
    try {
      const arrayBuffer = await data.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);
    } catch (parseErr: unknown) {
      const parseMsg = errorMessage(parseErr) ?? String(parseErr);
      console.error("[api/process] PDF buffer/parse failed:", parseMsg, parseErr);
      await sb
        .from("submissions")
        .update({ status: "error", analysis_status: "error", ai_error: `PDF read failed: ${parseMsg}`, processed_at: new Date().toISOString() })
        .eq("id", submissionId);
      return NextResponse.json(
        { error: "PDF could not be read. The file may be corrupted or in an unsupported format." },
        { status: 502 }
      );
    }
    tracer.trace("pdf_buffer", { bytes: pdfBuffer?.length ?? 0 });
    if (!pdfBuffer || pdfBuffer.length === 0) {
      await sb
        .from("submissions")
        .update({ status: "error", analysis_status: "error", ai_error: "PDF download returned 0 bytes", processed_at: new Date().toISOString() })
        .eq("id", submissionId);
      return NextResponse.json(
        { error: "PDF download returned 0 bytes" },
        { status: 502 }
      );
    }

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
    tracer.trace("ai_analyze_start");
    let analyzeResult: Awaited<ReturnType<typeof analyzeQuote>>;
    const t0Ai = Date.now();
    try {
      analyzeResult = await Promise.race([analyzePromise, timeoutPromise]);
      tracer.trace("ai_analyze", { elapsed: elapsed(Date.now() - t0Ai) });
    } catch (openaiErr: unknown) {
      console.error("[api/process] openai error after", elapsed(Date.now() - t0Ai), openaiErr);
      const isTimeout = openaiErr instanceof Error && (openaiErr as { statusCode?: number }).statusCode === 504;
      const errMsg = errorMessage(openaiErr) ?? String(openaiErr);
      await sb
        .from("submissions")
        .update({ status: "error", analysis_status: "error", ai_error: errMsg, processed_at: new Date().toISOString() })
        .eq("id", submissionId);
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

    tracer.trace("save_full_analysis_start");
    const t0Save = Date.now();
    const { error: saveErr } = await saveFullAnalysis(submissionId, analyzeResult, {
      isUnpaidPreview,
      isRevisedFree,
      address: sub.address ?? null,
    });
    const saveErrMsg = errorMessage(saveErr);
    tracer.trace("save_full_analysis", { elapsed: elapsed(Date.now() - t0Save), error: saveErrMsg });

    if (saveErr) {
      await sb
        .from("submissions")
        .update({ status: "error", analysis_status: "error", ai_error: saveErrMsg ?? String(saveErr), processed_at: new Date().toISOString() })
        .eq("id", submissionId);
      throw saveErr;
    }

    tracer.trace("done", { total: elapsed(Date.now() - startTime) });
    return NextResponse.json({ ok: true, confidence: ai_confidence });
  } catch (err: unknown) {
    const msg = errorMessage(err) ?? String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const step = tracer.step;
    console.error("[/api/process] failed", { submissionId, step, err, stack });
    if (submissionId) {
      try {
        await sb
          .from("submissions")
          .update({
            status: "error",
            analysis_status: "error",
            ai_error: msg,
            processed_at: new Date().toISOString(),
          })
          .eq("id", submissionId);
      } catch (updateEx) {
        console.error("[/api/process] failed to set status=error:", updateEx);
      }
    }
    const statusCode = (err as { statusCode?: number })?.statusCode ?? 500;
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      { ok: false, step, message: msg, error: msg, ...(isDev && stack ? { stack } : {}) },
      { status: statusCode === 504 ? 504 : 500 }
    );
  }
}
