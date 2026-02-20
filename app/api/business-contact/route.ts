import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const INQUIRY_TYPES = [
  "Contractor inquiry",
  "Insurance / claims",
  "Real estate / property management",
  "Media / press",
  "Partnership discussion",
  "Other business inquiry",
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const company = typeof body.company === "string" ? body.company.trim() || null : null;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const inquiryType = typeof body.inquiryType === "string" ? body.inquiryType.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Full name is required (at least 2 characters)" }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!inquiryType || !INQUIRY_TYPES.includes(inquiryType)) {
      return NextResponse.json({ error: "Please select an inquiry type" }, { status: 400 });
    }
    if (!message || message.length < 10) {
      return NextResponse.json({ error: "Message must be at least 10 characters" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("business_inquiries").insert({
      name,
      company,
      email,
      inquiry_type: inquiryType,
      message,
      status: "new",
    });

    if (error) {
      console.error("[api/business-contact] insert error:", error);
      return NextResponse.json(
        { error: "Failed to send message. Please try again or email business@quoteshield.com." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/business-contact] error:", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again or email business@quoteshield.com." },
      { status: 500 }
    );
  }
}
