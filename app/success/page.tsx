import { getStripe } from "@/lib/stripe";
import { ClaimAccountForm } from "@/components/ClaimAccountForm";

interface PageProps {
  searchParams: Promise<{ sid?: string }>;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default async function SuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sid = params?.sid;

  if (!sid) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Invalid or missing session</h1>
          <p className="mt-2 text-gray-600">Use the link from your payment confirmation.</p>
        </div>
      </div>
    );
  }

  let customer_email: string | null = null;
  let submissionId: string | null = null;
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sid, { expand: [] });
    customer_email = session.customer_email ?? session.customer_details?.email ?? null;
    submissionId = session.metadata?.submissionId ?? null;
  } catch {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Session not found</h1>
          <p className="mt-2 text-gray-600">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto mt-12 max-w-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900">
            <CheckIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-gray-900">
            Payment received
          </h1>
          <p className="mt-2 text-gray-600">
            Create an account to claim this quote and view your report in the dashboard.
          </p>

          <div className="mt-10 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <ClaimAccountForm
              prefilledEmail={customer_email ?? ""}
              readOnlyEmail={!!customer_email}
              submissionId={submissionId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
