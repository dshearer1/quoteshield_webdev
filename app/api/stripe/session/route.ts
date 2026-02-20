import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sid = searchParams.get("session_id") ?? searchParams.get("sid");
  if (!sid) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sid, { expand: [] });
    const customer_email = session.customer_email ?? session.customer_details?.email ?? null;
    const submissionId =
      session.metadata?.submission_id ?? session.metadata?.submissionId ?? null;
    return NextResponse.json({ customer_email, submissionId });
  } catch (e) {
    console.error("[stripe/session]", e);
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
}
