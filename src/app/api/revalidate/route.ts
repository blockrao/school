import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env.server";

/**
 * On-demand cache invalidation endpoint. Secret-checked — anyone who knows
 * REVALIDATE_SECRET can force a revalidation, nothing more.
 *
 * STATUS (verified 4 Oct 2026): currently inert. Nothing calls it — there is
 * no Supabase webhook or trigger pointing here (checked information_schema
 * .triggers and supabase/), and no data fetch in src/lib/db/ attaches a cache
 * tag, so `revalidateTag` below has nothing to match. The earlier header said
 * "hit by a Supabase DB webhook when a school/city record changes"; that
 * described an intention, never an implementation. Today the only refresh
 * mechanism for public pages is the per-route `export const revalidate` TTL
 * (900 s on school/exam/news pages) — see src/lib/sitemap.ts's cache note.
 *
 * To make this real: tag the reads in public-adapter.ts (e.g. `school:{id}`,
 * `city:{slug}`) with `cacheTag`/`unstable_cache`, then add a Postgres
 * trigger (via a migration) on schools / school_affiliations /
 * admission_cycles that POSTs here with the matching tag. Until then, keep
 * this file honest rather than aspirational.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");
  if (secret !== serverEnv.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const tag = body?.tag;
  if (typeof tag !== "string" || tag.length === 0) {
    return NextResponse.json({ error: "missing tag" }, { status: 400 });
  }

  revalidateTag(tag, { expire: 0 });

  return NextResponse.json({ revalidated: true, tag });
}
