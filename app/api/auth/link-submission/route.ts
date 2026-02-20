import { NextResponse } from "next/server";
import { getUserIdFromAuthHeader } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = getUserIdFromAuthHeader(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const _submissionId = body?.submissionId ?? body?.quote_id;
  // Do not store user account data in submissions table; auth is separate.
  // Profile and user identity live in public.profiles only.
  return NextResponse.json({ ok: true });
}
