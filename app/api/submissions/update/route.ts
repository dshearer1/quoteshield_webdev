import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const ALLOWED_KEYS = [
  "address",
  "project_type",
  "project_notes",
  "customer_name",
  "contractor_name",
  "contractor_email",
  "project_value",
  "email",
] as const;

/**
 * POST /api/submissions/update
 * Body: { submissionId: string, fields: { address?, project_type?, ... } }
 * Updates only draft or pending_payment submissions. All fields optional.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const submissionId = body?.submissionId ?? body?.submission_id ?? null;
    const fields = body?.fields ?? body ?? {};

    if (!submissionId || typeof submissionId !== "string") {
      return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_KEYS) {
      if (!(key in fields)) continue;
      const v = fields[key];
      if (key === "project_value") {
        const num = v === "" || v == null ? null : Number(v);
        updates[key] = num === Number(num) ? num : null;
      } else if (key === "email") {
        const s = v == null ? null : String(v).trim().toLowerCase();
        if (s !== null && s !== "") updates[key] = s;
      } else {
        const s = v == null ? null : String(v).trim();
        updates[key] = s || null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
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

    const { error: updateErr } = await sb
      .from("submissions")
      .update(updates)
      .eq("id", submissionId);

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message ?? "Update failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
