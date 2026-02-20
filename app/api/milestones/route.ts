import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromAuthHeader } from "@/lib/auth";

export const runtime = "nodejs";

async function ensureProjectAccess(sb: ReturnType<typeof supabaseAdmin>, userId: string, projectId: string) {
  const { data } = await sb
    .from("submissions")
    .select("id")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/**
 * GET /api/milestones?project_id=xxx
 * Returns all milestones for the project (top-level and sub-milestones).
 */
export async function GET(req: Request) {
  const userId = getUserIdFromAuthHeader(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "Missing project_id" }, { status: 400 });

  const sb = supabaseAdmin;
  const allowed = await ensureProjectAccess(sb, userId, projectId);
  if (!allowed) return NextResponse.json({ error: "Project not found or access denied" }, { status: 403 });

  const { data, error } = await sb
    .from("project_milestones")
    .select("id, project_id, parent_id, title, description, due_date, status, sort_order, created_at, updated_at")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[milestones] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ milestones: data ?? [] });
}

/**
 * POST /api/milestones
 * Body: { project_id, title, description?, due_date?, status?, parent_id? }
 * Creates a milestone or sub-milestone.
 */
export async function POST(req: Request) {
  const userId = getUserIdFromAuthHeader(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const projectId = typeof body?.project_id === "string" ? body.project_id.trim() : null;
  const title = typeof body?.title === "string" ? body.title.trim() : null;
  if (!projectId || !title) {
    return NextResponse.json({ error: "project_id and title are required" }, { status: 400 });
  }

  const sb = supabaseAdmin;
  const allowed = await ensureProjectAccess(sb, userId, projectId);
  if (!allowed) return NextResponse.json({ error: "Project not found or access denied" }, { status: 403 });

  const status = ["pending", "in_progress", "done", "blocked"].includes(String(body?.status))
    ? body.status
    : "pending";
  const description = typeof body?.description === "string" ? body.description.trim() || null : null;
  const dueDate = typeof body?.due_date === "string" && body.due_date ? body.due_date : null;
  const parentId = typeof body?.parent_id === "string" && body.parent_id ? body.parent_id : null;
  const sortOrder = typeof body?.sort_order === "number" ? body.sort_order : 0;

  const insert: Record<string, unknown> = {
    project_id: projectId,
    user_id: userId,
    title,
    description,
    due_date: dueDate,
    status,
    sort_order: sortOrder,
  };
  if (parentId) insert.parent_id = parentId;

  const { data, error } = await sb
    .from("project_milestones")
    .insert(insert)
    .select("id, project_id, parent_id, title, description, due_date, status, sort_order, created_at, updated_at")
    .single();

  if (error) {
    console.error("[milestones] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
