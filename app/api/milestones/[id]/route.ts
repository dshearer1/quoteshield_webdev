import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromAuthHeader } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * PATCH /api/milestones/[id]
 * Body: { title?, description?, due_date?, status?, sort_order? }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromAuthHeader(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sb: SupabaseClient = supabaseAdmin;
  const { data: existing, error: fetchErr } = await sb
    .from("project_milestones")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.user_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const update: Record<string, unknown> = {};
  if (typeof body?.title === "string") update.title = body.title.trim();
  if (body?.description !== undefined) update.description = body.description === "" ? null : body.description;
  if (body?.due_date !== undefined) update.due_date = body.due_date === "" || body.due_date == null ? null : body.due_date;
  if (["pending", "in_progress", "done", "blocked"].includes(String(body?.status))) update.status = body.status;
  if (typeof body?.sort_order === "number") update.sort_order = body.sort_order;

  if (Object.keys(update).length === 0) {
    const { data: current } = await sb.from("project_milestones").select("*").eq("id", id).single();
    return NextResponse.json(current);
  }

  const { data, error } = await sb
    .from("project_milestones")
    .update(update)
    .eq("id", id)
    .select("id, project_id, parent_id, title, description, due_date, status, sort_order, created_at, updated_at")
    .single();

  if (error) {
    console.error("[milestones] PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

/**
 * DELETE /api/milestones/[id]
 * Deletes a milestone (and its sub-milestones via FK cascade).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromAuthHeader(_req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sb: SupabaseClient = supabaseAdmin;
  const { data: existing, error: fetchErr } = await sb
    .from("project_milestones")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.user_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await sb.from("project_milestones").delete().eq("id", id);
  if (error) {
    console.error("[milestones] DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
