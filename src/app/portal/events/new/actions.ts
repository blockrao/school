"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getMySchoolId } from "@/lib/db/portal";
import { createSessionClient, getSessionUser } from "@/lib/db/session";

const EVENT_TYPES = [
  "ptm",
  "open_house",
  "admission_test",
  "sports_day",
  "cultural",
  "workshop",
  "result_day",
  "holiday",
  "fee_deadline",
  "other",
] as const;

const eventSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  startsAt: z.string().min(1),
  endsAt: z.string().optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  registrationUrl: z.string().url().optional().or(z.literal("")),
  sourceUrl: z.string().url().optional().or(z.literal("")),
});

export async function submitSchoolEvent(formData: FormData) {
  const notPath = "/portal/events/new";

  const parsed = eventSchema.safeParse({
    eventType: formData.get("eventType"),
    title: formData.get("title"),
    description: formData.get("description") || "",
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") || "",
    location: formData.get("location") || "",
    registrationUrl: formData.get("registrationUrl") || "",
    sourceUrl: formData.get("sourceUrl") || "",
  });
  if (!parsed.success) {
    redirect(`${notPath}?error=invalid`);
  }

  const startsAtDate = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAtDate.getTime())) {
    redirect(`${notPath}?error=invalid`);
  }
  let endsAtIso: string | null = null;
  if (parsed.data.endsAt) {
    const endsAtDate = new Date(parsed.data.endsAt);
    if (Number.isNaN(endsAtDate.getTime()) || endsAtDate < startsAtDate) {
      redirect(`${notPath}?error=invalid_dates`);
    }
    endsAtIso = endsAtDate.toISOString();
  }

  const schoolId = await getMySchoolId();
  if (!schoolId) redirect("/for-schools");

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);

  // Same immediate-own-page-visibility model as news (SEO/GEO follow-up,
  // 29 Sep 2026): no ops gate here at all, only for the /events listing
  // request. There's no `review` column on school_events — an event is
  // structured (dates/type/location) rather than freeform text, so the
  // editorial risk that justifies news' post-hoc moderation doesn't apply
  // the same way here.
  const { error } = await supabase.from("school_events").insert({
    school_id: schoolId,
    event_type: parsed.data.eventType,
    title: parsed.data.title,
    description: parsed.data.description || null,
    starts_at: startsAtDate.toISOString(),
    ends_at: endsAtIso,
    location: parsed.data.location || null,
    registration_url: parsed.data.registrationUrl || null,
    source_url: parsed.data.sourceUrl || null,
    created_by: user?.id,
  });

  if (error) {
    redirect(`${notPath}?error=submit_failed`);
  }

  redirect("/portal/events?event_created=1");
}
