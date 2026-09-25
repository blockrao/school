import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/db/session";

/**
 * DPDP data-portability export — everything the app holds that's scoped to
 * this user, as a single JSON download. Document *files* aren't embedded
 * (impractical as JSON) — only their metadata; the files themselves are
 * downloadable individually from the Documents section they were uploaded in.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.pathname.split("/")[1] || "en";
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL(`/${locale}/sign-in?next=${encodeURIComponent(url.pathname)}`, url.origin),
    );
  }

  const [
    { data: profile },
    { data: children },
    { data: orders },
    { data: alerts },
    { data: shortlists },
    { data: enquiries },
    { data: consents },
    { data: schoolClaims },
    { data: teacher },
    { data: teacherClaims },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("children").select("*").eq("parent_id", user.id),
    supabase.from("application_orders").select("*").eq("user_id", user.id),
    supabase.from("alert_subscriptions").select("*").eq("user_id", user.id),
    supabase.from("shortlists").select("*").eq("user_id", user.id),
    supabase.from("enquiries").select("*").eq("user_id", user.id),
    supabase.from("consents").select("*").eq("user_id", user.id),
    supabase.from("school_claims").select("*").eq("user_id", user.id),
    supabase.from("teachers").select("*").eq("claimed_by", user.id).maybeSingle(),
    supabase.from("teacher_claims").select("*").eq("user_id", user.id),
  ]);

  const childIds = (children ?? []).map((c) => c.id);
  const { data: documents } =
    childIds.length > 0
      ? await supabase
          .from("documents")
          .select("id, child_id, kind, uploaded_at, retain_until, deleted_at")
          .in("child_id", childIds)
      : { data: [] };

  const orderIds = (orders ?? []).map((o) => o.id);
  const { data: applications } =
    orderIds.length > 0
      ? await supabase.from("applications").select("*").in("order_id", orderIds)
      : { data: [] };

  const teacherId = teacher?.id;
  const [{ data: teacherExperience }, { data: teacherQualifications }] = teacherId
    ? await Promise.all([
        supabase.from("teacher_experience").select("*").eq("teacher_id", teacherId),
        supabase.from("teacher_qualifications").select("*").eq("teacher_id", teacherId),
      ])
    : [{ data: [] }, { data: [] }];

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    account: { userId: user.id, phone: user.phone ?? null, email: user.email ?? null },
    profile: profile ?? null,
    children: children ?? [],
    documents: documents ?? [],
    applicationOrders: orders ?? [],
    applications: applications ?? [],
    alertSubscriptions: alerts ?? [],
    shortlists: shortlists ?? [],
    enquiries: enquiries ?? [],
    consents: consents ?? [],
    schoolClaims: schoolClaims ?? [],
    teacherProfile: teacher ?? null,
    teacherExperience: teacherExperience ?? [],
    teacherQualifications: teacherQualifications ?? [],
    teacherClaims: teacherClaims ?? [],
  };

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="schooloye-data-${user.id}.json"`,
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
