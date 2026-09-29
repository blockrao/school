"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cancelEvent, getMySchoolId, requestEventListing } from "@/lib/db/portal";

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
