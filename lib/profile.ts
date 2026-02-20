/**
 * Profile type and get-or-create helper for the public.profiles table.
 * Use with the browser Supabase client (RLS applies).
 */

export type Profile = {
  id: string;
  full_name: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_session_id: string | null;
  email_report_ready: boolean;
  email_product_updates: boolean;
  phone_number: string | null;
  text_notifications: boolean;
  created_at: string;
  updated_at: string;
};

type ProfileInsert = {
  id: string;
  full_name?: string | null;
  stripe_customer_id?: string | null;
  email_report_ready?: boolean;
  email_product_updates?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

/**
 * Fetch profile by user id. If missing, create a row and return it.
 * Use after confirming the user is authenticated.
 */
export async function getOrCreateProfile(
  supabase: SupabaseClient,
  userId: string,
  defaults?: { full_name?: string | null }
): Promise<Profile | null> {
  const { data: existing, error: fetchErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (fetchErr) {
    const isNotFound =
      (fetchErr as { code?: string })?.code === "PGRST116" ||
      (fetchErr as { message?: string })?.message?.includes("0 rows");
    if (!isNotFound) return null;
  } else if (existing) {
    return existing as Profile;
  }

  const { data: created, error: insertErr } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      full_name: defaults?.full_name ?? null,
      email_report_ready: true,
      email_product_updates: false,
    })
    .select()
    .single();

  if (insertErr || !created) return null;
  return created as Profile;
}
