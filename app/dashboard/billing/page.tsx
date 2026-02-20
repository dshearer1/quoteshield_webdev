"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabaseBrowser";

export default function DashboardBillingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleManageBilling() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please sign in to manage billing.");
        return;
      }
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Could not open billing portal.");
        return;
      }
      if (data?.url) window.location.href = data.url;
      else setError("No portal URL returned.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50">
      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-600">View and manage your billing.</p>

        <div className="mt-10 space-y-8">
          {/* Plan / status placeholder */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Plan &amp; status</h2>
            <p className="mt-2 text-sm text-gray-500">Pay per review. No subscription required.</p>
            <p className="mt-1 text-sm text-gray-600">Status: Active</p>
          </div>

          {/* Manage billing */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Manage billing</h2>
            <p className="mt-2 text-sm text-gray-500">
              Update payment method, view invoices, and manage your billing in Stripe.
            </p>
            {error && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleManageBilling}
              disabled={loading}
              className="mt-4 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-60 w-full sm:w-auto"
            >
              {loading ? "Opening…" : "Manage billing"}
            </button>
          </div>

          {/* Invoices empty state */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Invoices</h2>
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/50 py-8 text-center">
              <p className="text-sm text-gray-500">No invoices yet.</p>
              <p className="mt-1 text-xs text-gray-400">
                Invoices will appear here after you complete a purchase.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
