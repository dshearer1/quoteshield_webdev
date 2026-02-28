import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromAuthHeader } from "@/lib/auth";

export const runtime = "nodejs";

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromAuthHeader(req.headers.get("authorization"));
    const form = await req.formData();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const projectType = String(form.get("projectType") || "").trim();
    const projectNotes = String(form.get("projectNotes") || "").trim();
    const file = form.get("file") as File | null;

    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
    if (!projectType) return NextResponse.json({ error: "Project type required" }, { status: 400 });
    if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "PDF too large (max 20MB)" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const token = makeToken();
    const insertPayload: Record<string, unknown> = {
      email,
      project_type: projectType || null,
      project_notes: projectNotes || null,
      status: userId ? "pending_payment" : "draft",
      file_path: null,
      token,
    };
    if (userId) insertPayload.user_id = userId;

    const { data: created, error: insErr } = await sb
      .from("submissions")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insErr || !created) throw new Error(insErr?.message || "Failed to create submission");

    const submissionId = created.id as string;
    const filePath = `submissions/${submissionId}/quote.pdf`;

    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await sb.storage.from("quotes").upload(filePath, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) throw new Error(upErr.message);

    const { error: updErr } = await sb
      .from("submissions")
      .update({ file_path: filePath })
      .eq("id", submissionId);
    if (updErr) throw new Error(updErr.message);

    return NextResponse.json({ submissionId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
