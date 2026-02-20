import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeFreeScore } from "../_shared/scoring.ts";
import { aiResultToScoreInputs } from "../_shared/aiResultToScoreInputs.ts";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const submissionId = body?.submissionId;
    if (!submissionId) {
      console.error("[analyze-and-score] Missing submissionId");
      return new Response(
        JSON.stringify({ ok: false, error: "Missing submissionId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    console.log("[analyze-and-score] submissionId:", submissionId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[analyze-and-score] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: submission, error: fetchErr } = await supabase
      .from("submissions")
      .select("id, status, ai_result")
      .eq("id", submissionId)
      .single();

    if (fetchErr || !submission) {
      console.error("[analyze-and-score] fetch error:", fetchErr?.message);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Submission not found",
          details: fetchErr?.message,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (submission.ai_result == null || typeof submission.ai_result !== "object") {
      console.error("[analyze-and-score] No ai_result to re-score");
      return new Response(
        JSON.stringify({ ok: false, error: "No ai_result on submission; run full analysis first." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const inputs = aiResultToScoreInputs(submission.ai_result as Record<string, unknown>);
    const scoreObj = computeFreeScore(inputs);
    console.log("[analyze-and-score] overall_score:", scoreObj.overall_score);

    const { error: updErr } = await supabase
      .from("submissions")
      .update({
        report_json: scoreObj,
        status: "complete",
      })
      .eq("id", submissionId);

    if (updErr) {
      console.error("[analyze-and-score] update failure:", updErr.message);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to update submission",
          details: updErr.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    console.log("[analyze-and-score] update success for", submissionId);

    return new Response(
      JSON.stringify({
        ok: true,
        submissionId,
        overall_score: scoreObj.overall_score,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[analyze-and-score] error:", e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Unhandled exception",
        details: String(e),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
