import { NextResponse } from "next/server";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { getShortlistedSchoolIds } from "@/lib/db/shortlist";

// Per-visitor state for statically cached pages. Never cacheable.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const schoolId = params.get("school");
  const many = (params.get("schools") ?? "").split(",").filter(Boolean).slice(0, 100);
  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) return NextResponse.json({ signedIn: false, saved: false }, { headers: NO_STORE });
  if (many.length > 0) {
    const savedIds = [...(await getShortlistedSchoolIds(many))];
    return NextResponse.json({ signedIn: true, savedIds }, { headers: NO_STORE });
  }
  const saved = schoolId ? (await getShortlistedSchoolIds([schoolId])).has(schoolId) : false;
  return NextResponse.json({ signedIn: true, saved }, { headers: NO_STORE });
}
