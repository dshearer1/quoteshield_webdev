import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromAuthHeader } from "@/lib/auth";

const CATEGORIES = [
  "Upload issue",
  "Report issue",
  "Payment issue",
  "Account/login",
  "Business inquiry",
  "Other",
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const submissionPublicId =
      typeof body.submissionPublicId === "string" ? body.submissionPublicId.trim() || null : null;
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!category || !CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Valid category is required" }, { status: 400 });
    }
    if (!message || message.length < 10) {
      return NextResponse.json({ error: "Message must be at least 10 characters" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    const userId = getUserIdFromAuthHeader(authHeader);

    const { error } = await getSupabaseAdmin().from("support_tickets").insert({
      user_id: userId,
      email,
      category,
      submission_public_id: submissionPublicId,
      message,
      status: "open",
    });

    if (error) {
      console.error("[api/support] insert error:", error);
      return NextResponse.json(
        { error: "Failed to submit. Please try again or email support@quoteshield.com." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/support] error:", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again or email support@quoteshield.com." },
      { status: 500 }
    );
  }
}
