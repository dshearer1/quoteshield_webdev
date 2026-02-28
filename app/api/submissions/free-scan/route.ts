import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { runFreeScan } from "@/lib/ai/analyzeQuote";

export const runtime = "nodejs";

const STORAGE_BUCKET = "quotes";

/**
 * GET /api/submissions/free-scan?submissionId=xxx
 * Returns submission status, token, and free_scan_json (if any). Used by scan page to decide redirect or show preview.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get("submissionId") ?? searchParams.get("submission_id");
    if (!submissionId) {
      return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const { data: sub, error } = await sb
      .from("submissions")
      .select("id, status, token, free_scan_json")
      .eq("id", submissionId)
      .single();

    if (error || !sub) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    return NextResponse.json({
      submissionId: sub.id,
      status: sub.status ?? null,
      token: sub.token ?? null,
      freeScan: sub.free_scan_json ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/submissions/free-scan
 * Body: { submissionId: string }
 *
 * For a submission with file_path (draft or pending_payment), runs a lightweight free scan
 * and stores/returns free_scan_json. Idempotent: if free_scan_json already set, returns it.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const submissionId = body?.submissionId;
    if (!submissionId) {
      return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const { data: sub, error: subErr } = await sb
      .from("submissions")
      .select("id, status, file_path, project_type, project_notes, token")
      .eq("id", submissionId)
      .single();

    if (subErr || !sub) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const status = sub.status ?? "";
    if (status !== "draft" && status !== "pending_payment") {
      return NextResponse.json(
        { error: "Free scan only for draft or pending_payment submissions" },
        { status: 400 }
      );
    }

    const filePath = sub.file_path ?? "";
    if (!filePath) {
      return NextResponse.json({ error: "No quote file uploaded" }, { status: 400 });
    }

    // Return cached free scan if present
    const { data: fullSub, error: fetchErr } = await sb
      .from("submissions")
      .select("free_scan_json")
      .eq("id", submissionId)
      .single();

    if (!fetchErr && fullSub?.free_scan_json != null) {
      return NextResponse.json({
        freeScan: fullSub.free_scan_json,
        status: sub.status,
        token: sub.token ?? null,
      });
    }

    const { data: fileData, error: dlErr } = await sb.storage
      .from(STORAGE_BUCKET)
      .download(filePath);

    if (dlErr || !fileData) {
      return NextResponse.json({ error: "Failed to download quote file" }, { status: 500 });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const freeScan = await runFreeScan(
      pdfBuffer,
      sub.project_type ?? null,
      sub.project_notes ?? null
    );

    const { error: updateErr } = await sb
      .from("submissions")
      .update({
        free_scan_json: freeScan,
        status: status === "draft" ? "pending_payment" : status,
      })
      .eq("id", submissionId);

    if (updateErr) {
      console.error("[free-scan] update error:", updateErr);
      return NextResponse.json({ error: "Failed to save free scan" }, { status: 500 });
    }

    return NextResponse.json({
      freeScan,
      status: "pending_payment",
      token: sub.token ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[free-scan]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
