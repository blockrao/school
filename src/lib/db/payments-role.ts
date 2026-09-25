import "server-only";
import pg from "pg";
import { serverEnv } from "@/lib/env.server";

/**
 * The only place in the app that connects as payments_service (DATABASE_URL_PAYMENTS)
 * instead of going through the normal Supabase session client. That role can EXECUTE
 * exactly one function — mark_order_paid — and nothing else, so this is a narrow,
 * deliberate exception to "the app only talks to Supabase via the publishable key,"
 * not a general-purpose DB escape hatch. Every caller (mock provider, manual-provider
 * staff action) must verify the caller is authorized (session owner for mock, is_staff()
 * for manual) BEFORE calling this — this function itself does no authorization.
 */
export async function markOrderPaid(orderId: string, paymentRef: string): Promise<void> {
  if (!serverEnv.DATABASE_URL_PAYMENTS) {
    throw new Error("DATABASE_URL_PAYMENTS is not set — payment confirmation is unavailable.");
  }

  const client = new pg.Client({ connectionString: serverEnv.DATABASE_URL_PAYMENTS });
  await client.connect();
  try {
    await client.query("select mark_order_paid($1, $2)", [orderId, paymentRef]);
  } finally {
    await client.end();
  }
}
