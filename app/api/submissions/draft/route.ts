import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * GET /api/submissions/draft?submissionId=xxx
 * Returns draft fields for repopulating the start form. Only for status draft or pending_payment.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get("submissionId") ?? searchParams.get("submission_id");
    if (!submissionId) {
      return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
    }

    const { data: sub, error } = await getSupabaseAdmin()
      .from("submissions")
      .select("id, status, email, project_type, address, customer_name, contractor_name, contractor_email, project_value, project_notes, file_path")
      .eq("id", submissionId)
      .single();

    if (error || !sub) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    if (sub.status !== "draft" && sub.status !== "pending_payment") {
      return NextResponse.json({ error: "Not a draft" }, { status: 400 });
    }

    return NextResponse.json({
      submissionId: sub.id,
      email: sub.email ?? "",
      project_type: sub.project_type ?? "",
      address: sub.address ?? "",
      customer_name: sub.customer_name ?? "",
      contractor_name: sub.contractor_name ?? "",
      contractor_email: sub.contractor_email ?? "",
      project_value: sub.project_value ?? null,
      project_notes: sub.project_notes ?? "",
      hasFile: !!sub.file_path,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
