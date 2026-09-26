import "server-only";
import { headers } from "next/headers";
import { createSessionClient } from "@/lib/db/session";

/**
 * Throttles an auth-flow action (OTP send/verify, magic-link send) by
 * identifier (phone/email) AND by IP, whichever is stricter, so neither an
 * attacker rotating numbers nor one behind a single shared IP (an office, a
 * school) can bypass the other dimension. Backed by the `check_rate_limit`
 * Postgres function (rate_limits table) — atomic and shared across every
 * serverless instance, unlike an in-memory counter.
 *
 * Fails OPEN on a database error (returns true — request allowed): a bug in
 * the limiter itself should not be able to lock every user out of signing in.
 * The real backstop against abuse either way is Supabase Auth's own
 * project-level SMS/email rate limits (configured in the dashboard, not
 * here — see docs/access-control-design.md).
 */
export async function checkRateLimit(
  bucket: string,
  identifier: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";

  const supabase = await createSessionClient();

  const [byIdentifier, byIp] = await Promise.all([
    supabase.rpc("check_rate_limit", {
      p_key: `${bucket}:id:${identifier}`,
      p_max_attempts: maxAttempts,
      p_window_seconds: windowSeconds,
    }),
    supabase.rpc("check_rate_limit", {
      p_key: `${bucket}:ip:${ip}`,
      // The IP bucket is deliberately looser than the identifier bucket —
      // it exists to catch spraying across many identifiers, not to punish
      // a shared IP for ordinary traffic.
      p_max_attempts: maxAttempts * 5,
      p_window_seconds: windowSeconds,
    }),
  ]);

  if (byIdentifier.error || byIp.error) return true;
  return byIdentifier.data === true && byIp.data === true;
}
