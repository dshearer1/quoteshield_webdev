import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const STORAGE_BUCKET = "quotes";
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * POST /api/submissions/upload
 * FormData: submissionId, file (PDF)
 * Uploads PDF for an existing draft submission and sets file_path.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const submissionId = form.get("submissionId") ?? form.get("submission_id");
    const file = form.get("file") as File | null;

    if (!submissionId || typeof submissionId !== "string") {
      return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
    }
    if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "PDF too large (max 20MB)" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const { data: sub, error: fetchErr } = await sb
      .from("submissions")
      .select("id, status")
      .eq("id", submissionId)
      .single();

    if (fetchErr || !sub) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    if (sub.status !== "draft" && sub.status !== "pending_payment") {
      return NextResponse.json({ error: "Submission cannot be updated" }, { status: 400 });
    }

    const filePath = `submissions/${submissionId}/quote.pdf`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await sb.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, bytes, { contentType: "application/pdf", upsert: true });

    if (upErr) {
      return NextResponse.json(
        { error: upErr.message ?? "Upload failed" },
        { status: 500 }
      );
    }

    const { error: updateErr } = await sb
      .from("submissions")
      .update({ file_path: filePath })
      .eq("id", submissionId);

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message ?? "Failed to save file path" },
        { status: 500 }
      );
    }

    // Trigger /api/process immediately so analysis starts
    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      fetch(`${appUrl.replace(/\/$/, "")}/api/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      }).catch((e) => console.error("[/api/submissions/upload] failed to trigger process:", e));
    }

    return NextResponse.json({ ok: true, submissionId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
