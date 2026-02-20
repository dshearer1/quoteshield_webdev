/**
 * Server-side only. Get Supabase user id from Authorization: Bearer <access_token>.
 * Does not verify signature; use only when the token is from a trusted client (e.g. our own frontend).
 * For strict verification, use Supabase auth.getUser(access_token) with the anon key.
 */
export function getUserIdFromAuthHeader(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;
    const payload = JSON.parse(
      Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()
    );
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
