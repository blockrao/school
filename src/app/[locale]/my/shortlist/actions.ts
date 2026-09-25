"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/db/session";

/** Same-origin path+query from the Referer header, so Save/Remove can redirect back to
 * whichever list page the button was clicked from without threading a `next` field
 * through every call site. Falls back to the locale home if Referer is missing or
 * cross-origin. */
async function refererPath(locale: string): Promise<string> {
  const h = await headers();
  const referer = h.get("referer");
  const host = h.get("host");
  if (!referer || !host) return `/${locale}`;
  try {
    const url = new URL(referer);
    return url.host === host ? `${url.pathname}${url.search}` : `/${locale}`;
  } catch {
    return `/${locale}`;
  }
}

export async function toggleShortlist(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const schoolId = String(formData.get("schoolId") ?? "");
  const wasSaved = formData.get("saved") === "1";
  const back = await refererPath(locale);

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(back)}`);
  }

  if (wasSaved) {
    await supabase.from("shortlists").delete().eq("user_id", user.id).eq("school_id", schoolId);
  } else {
    await supabase
      .from("shortlists")
      .upsert(
        { user_id: user.id, school_id: schoolId },
        { onConflict: "user_id,school_id", ignoreDuplicates: true },
      );
  }

  redirect(back);
}
