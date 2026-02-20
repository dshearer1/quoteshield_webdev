import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ReportView } from "@/components/ReportView";
import ReportPreviewPaywall from "@/components/ReportPreviewPaywall";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ReportPage({ params }: PageProps) {
  const { token } = await params;
  const sb = supabaseAdmin;

  const { data: sub, error } = await sb
    .from("submissions")
    .select("id, email, project_type, ai_result, ai_confidence, status, processed_at")
    .eq("token", token)
    .single();

  if (error || !sub) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-neutral-950 text-white">
        <div className="mx-auto max-w-[1100px] px-6 py-16 text-center">
          <h1 className="text-2xl font-semibold text-white">Report not found</h1>
          <p className="mt-2 text-white/60">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  // Unpaid but report already generated (preview run): show preview + paywall
  if (
    (sub.status === "pending_payment" || sub.status === "draft") &&
    sub.ai_result != null
  ) {
    return (
      <ReportPreviewPaywall
        submissionId={sub.id}
        report={sub.ai_result as Record<string, unknown>}
        token={token}
        variant="token"
      />
    );
  }

  // Processing or paid but report not ready yet
  if (sub.status !== "complete" || sub.ai_result == null) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-neutral-950 text-white">
        <div className="mx-auto max-w-[1100px] px-6 py-16 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <h1 className="mt-6 text-2xl font-semibold text-white">Processing your quote</h1>
          <p className="mt-2 text-white/70">
            We’re analyzing your quote. Refresh this page or check your email when it’s ready.
          </p>
        </div>
      </div>
    );
  }

  const data = sub.ai_result as Record<string, unknown>;
  const reportJson = JSON.stringify(sub.ai_result, null, 2);

  const { data: lineItems } = await sb
    .from("submission_line_items")
    .select("id, category, description_raw, quantity, unit_price, line_total, sort_order")
    .eq("submission_id", sub.id)
    .order("sort_order", { ascending: true });

  const { data: analysis } = await sb
    .from("submission_analysis")
    .select("scope_score, price_score, clarity_score, risk_level, flags, benchmark_snapshot")
    .eq("submission_id", sub.id)
    .single();

  const { data: chatMessages } = await sb
    .from("negotiation_chat_messages")
    .select("id, role, message_text, created_at")
    .eq("submission_id", sub.id)
    .order("created_at", { ascending: true });

  const initialMessages = (chatMessages ?? []).map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    message_text: m.message_text,
    created_at: m.created_at,
  }));

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-neutral-950 text-white">
      <div className="mx-auto max-w-[1100px] px-6 py-8 sm:py-10">
        <ReportView
          data={data}
          reportJson={reportJson}
          aiConfidence={sub.ai_confidence}
          submissionId={sub.id}
          initialChatMessages={initialMessages}
          lineItems={lineItems ?? []}
          analysis={analysis ?? null}
        />
      </div>
    </div>
  );
}
