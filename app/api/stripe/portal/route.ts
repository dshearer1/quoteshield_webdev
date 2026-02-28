import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromAuthHeader } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = getUserIdFromAuthHeader(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const origin = req.headers.get("origin") ?? process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const returnUrl = origin ? `${origin}/dashboard/billing` : `${process.env.APP_URL}/dashboard/billing`;

  const sb = getSupabaseAdmin();
  const { data: profile, error: profileErr } = await sb
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (profileErr || !profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer found. Complete a purchase first." },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });
    return NextResponse.json({ url: portalSession.url ?? null });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Portal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
