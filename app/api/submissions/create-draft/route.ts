import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromAuthHeader } from "@/lib/auth";
import { buildRegionKey } from "@/lib/addressUtils";

export const runtime = "nodejs";

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * POST /api/submissions/create-draft
 * Body: { project_type, address, customer_name?, email, project_id?, quote_type? }
 * Creates a draft submission. Returns submissionId, publicId (token), and projectId.
 * If project_id is omitted, a new project_id is generated for this submission.
 */
export async function POST(req: Request) {
  try {
    const userId = getUserIdFromAuthHeader(req.headers.get("authorization"));
    const body = await req.json().catch(() => ({}));
    const projectType = String(body?.project_type ?? "").trim();
    const address = String(body?.address ?? "").trim();
    const customerName = body?.customer_name != null ? String(body.customer_name).trim() : null;
    const email = String(body?.email ?? "").trim().toLowerCase();
    const projectIdInput = body?.project_id ?? null;
    const quoteType = ["original", "revised", "comparison"].includes(body?.quote_type)
      ? body.quote_type
      : null;

    if (!projectType) return NextResponse.json({ error: "Project type required" }, { status: 400 });
    if (!address) return NextResponse.json({ error: "Address (city, state, zip) required" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const token = makeToken();
    const projectId = projectIdInput && typeof projectIdInput === "string" ? projectIdInput : crypto.randomUUID();
    const region_key = buildRegionKey(address) ?? null;
    const insertPayload: Record<string, unknown> = {
      email,
      project_type: projectType,
      address: address || null,
      region_key: region_key ?? undefined,
      customer_name: customerName || null,
      status: "draft",
      token,
      project_id: projectId,
      quote_type: quoteType ?? "original",
    };
    if (userId) insertPayload.user_id = userId;

    const { data: created, error: insErr } = await supabaseAdmin
      .from("submissions")
      .insert(insertPayload)
      .select("id, token")
      .single();

    if (insErr || !created) {
      return NextResponse.json(
        { error: insErr?.message ?? "Failed to create draft" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      submissionId: created.id,
      id: created.id,
      publicId: created.token,
      public_id: created.token,
      projectId,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
