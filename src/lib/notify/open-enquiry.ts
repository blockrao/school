import { createApiSchemaClient } from "@/lib/db/public";
import { serverEnv, siteUrl } from "@/lib/env.server";
import { usableEmails } from "./lead-email-content";
import {
  buildOpenEnquiryEmail,
  buildParentConfirmationEmail,
  type OpenEnquiry,
} from "./open-enquiry-content";

async function send(
  apiKey: string,
  body: { to: string[]; subject: string; text: string; reply_to?: string },
) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: serverEnv.NOTIFY_FROM_EMAIL, ...body }),
  });
}

/**
 * Best-effort, never throws: the enquiry is already saved. Emails the school
 * the question and the parent's consented contact details, and confirms to the
 * parent if they gave an email. A no-op until RESEND_API_KEY is configured.
 */
export async function notifyOpenEnquiry(
  schoolId: string,
  schoolSlug: string | null,
  e: Omit<OpenEnquiry, "schoolName" | "origin">,
): Promise<void> {
  try {
    const apiKey = serverEnv.RESEND_API_KEY;
    if (!apiKey) return;
    const api = createApiSchemaClient();
    const { data } = await api
      .from("schools")
      .select("name_en, email, slug")
      .eq("id", schoolId)
      .maybeSingle();
    if (!data) return;
    const schoolName = String(data.name_en);
    const origin = `${siteUrl}/school/${schoolSlug ?? String(data.slug)}`;
    const to = usableEmails(data.email as (string | null)[] | null);
    if (to.length > 0) {
      const m = buildOpenEnquiryEmail({ ...e, schoolName, origin });
      await send(apiKey, { to, subject: m.subject, text: m.text, reply_to: e.email ?? undefined });
    }
    if (e.email) {
      const c = buildParentConfirmationEmail({ schoolName, parentName: e.parentName });
      await send(apiKey, { to: [e.email], subject: c.subject, text: c.text });
    }
  } catch {
    // Courtesy notification; the enquiry is saved.
  }
}
