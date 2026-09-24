import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env.server";

/**
 * Hit by a Supabase DB webhook when a school/city record changes. Secret-checked —
 * anyone who knows REVALIDATE_SECRET can force a revalidation, nothing more.
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
