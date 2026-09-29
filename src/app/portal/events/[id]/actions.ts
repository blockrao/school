"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cancelEvent, getMySchoolId, requestEventListing, updateEvent } from "@/lib/db/portal";

const updateEventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  startsAt: z.string().min(1),
  endsAt: z.string().optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  registrationUrl: z.string().url().optional().or(z.literal("")),
  sourceUrl: z.string().url().optional().or(z.literal("")),
});

/** P1.4: restore edit capability — see updateSchoolPost's comment (same edit-lock rule, this table's trigger). */
export async function updateEventAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const schoolId = await getMySchoolId();
  if (!schoolId || !eventId) redirect("/portal/events");

  const parsed = updateEventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") || "",
    location: formData.get("location") || "",
    registrationUrl: formData.get("registrationUrl") || "",
    sourceUrl: formData.get("sourceUrl") || "",
  });
  if (!parsed.success) {
    redirect(`/portal/events/${eventId}?error=invalid`);
  }

  const startsAtIso = new Date(parsed.data.startsAt).toISOString();
  const endsAtIso = parsed.data.endsAt ? new Date(parsed.data.endsAt).toISOString() : null;

  const ok = await updateEvent(eventId, schoolId, {
    title: parsed.data.title,
    description: parsed.data.description || null,
    startsAt: startsAtIso,
    endsAt: endsAtIso,
    location: parsed.data.location || null,
    registrationUrl: parsed.data.registrationUrl || null,
    sourceUrl: parsed.data.sourceUrl || null,
  });
  if (!ok) {
    redirect(`/portal/events/${eventId}?error=locked`);
  }

  revalidatePath("/portal/events");
  redirect("/portal/events?event_updated=1");
}

export async function requestEventListingAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const schoolId = await getMySchoolId();
  if (!schoolId || !eventId) redirect("/portal/events");

  await requestEventListing(eventId, schoolId);
  revalidatePath("/portal/events");
  redirect("/portal/events?listing_requested=1");
}

export async function cancelEventAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const schoolId = await getMySchoolId();
  if (!schoolId || !eventId) redirect("/portal/events");

  await cancelEvent(eventId, schoolId);
  revalidatePath("/portal/events");
  redirect("/portal/events?event_cancelled=1");
}
