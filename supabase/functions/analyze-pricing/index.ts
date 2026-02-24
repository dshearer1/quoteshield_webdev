import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runPricingEngine } from "../_shared/pricing-engine/core/engine.ts";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method Not Allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const submission_id = body?.submission_id ?? body?.submissionId;
    if (!submission_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing submission_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: submission, error: subErr } = await supabase
      .from("submissions")
      .select("id, project_type, region_key, report_json, ai_result, project_value")
      .eq("id", submission_id)
      .single();

    if (subErr || !submission) {
      console.error("[analyze-pricing] submission fetch error:", subErr?.message);
      return new Response(
        JSON.stringify({ ok: false, error: "Submission not found", details: subErr?.message }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: analysisRow, error: analysisErr } = await supabase
      .from("submission_analysis")
      .select("trade, subtrade, region_key, unit_basis, normalized_quantity, unit_price_estimated")
      .eq("submission_id", submission_id)
      .maybeSingle();

    if (analysisErr) {
      console.error("[analyze-pricing] submission_analysis fetch error:", analysisErr.message);
    }
    const submission_analysis = analysisRow ?? null;

    const { data: lineItems, error: liErr } = await supabase
      .from("submission_line_items")
      .select("description_raw, description_normalized, quantity, line_total, unit, category")
      .eq("submission_id", submission_id)
      .order("sort_order", { ascending: true });

    if (liErr) {
      console.error("[analyze-pricing] line items fetch error:", liErr.message);
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to fetch line items", details: liErr.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const rows = (lineItems ?? []) as Array<{
      description_raw?: string | null;
      description_normalized?: string | null;
      quantity?: number | null;
      line_total?: number | null;
      unit?: string | null;
      category?: string | null;
    }>;

    const output = await runPricingEngine({
      supabase,
      submission: {
        project_type: submission.project_type ?? null,
        region_key: submission.region_key ?? null,
        report_json: submission.report_json ?? null,
        ai_result: submission.ai_result ?? null,
        project_value: submission.project_value != null ? Number(submission.project_value) : null,
      },
      submission_analysis: submission_analysis ? {
        trade: submission_analysis.trade ?? null,
        subtrade: submission_analysis.subtrade ?? null,
        region_key: submission_analysis.region_key ?? null,
        unit_basis: submission_analysis.unit_basis ?? null,
        normalized_quantity: submission_analysis.normalized_quantity != null ? Number(submission_analysis.normalized_quantity) : null,
        unit_price_estimated: submission_analysis.unit_price_estimated != null ? Number(submission_analysis.unit_price_estimated) : null,
      } : null,
      lineItems: rows,
    });

    const { error: upsertErr } = await supabase
      .from("submission_analysis")
      .upsert(
        {
          submission_id,
          pricing_position: output.pricing_position,
          job_units: output.job_units,
          job_unit_name: output.job_unit_name,
          effective_unit_price: output.effective_unit_price,
          pricing_confidence: output.pricing_confidence,
          benchmark_snapshot: output.benchmark_snapshot,
          pricing_engine_result: output.pricing_engine_result,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "submission_id" }
      );

    if (upsertErr) {
      console.error("[analyze-pricing] upsert error:", upsertErr.message);
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to write analysis", details: upsertErr.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        submission_id,
        pricing_position: output.pricing_position,
        job_units: output.job_units,
        effective_unit_price: output.effective_unit_price,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[analyze-pricing] error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: "Unhandled exception", details: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
