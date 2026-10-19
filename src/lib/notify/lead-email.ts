import { createApiSchemaClient } from "@/lib/db/public";
import { serverEnv, siteUrl } from "@/lib/env.server";
import { buildLeadEmail, type LeadKind, usableEmails } from "./lead-email-content";

export type { LeadKind } from "./lead-email-content";

/**
 * Best-effort: never throws, never blocks the parent's submission. A no-op
 * until RESEND_API_KEY is configured, so merging this is safe before the
 * email account exists.
 */
export async function notifySchoolOfLead(schoolId: string, kind: LeadKind): Promise<void> {
  try {
    const apiKey = serverEnv.RESEND_API_KEY;
    if (!apiKey) return;
    const api = createApiSchemaClient();
    const { data } = await api
      .from("schools")
      .select("name_en, email")
      .eq("id", schoolId)
      .maybeSingle();
    if (!data) return;
    const to = usableEmails(data.email as (string | null)[] | null);
    if (to.length === 0) return;
    const { subject, text } = buildLeadEmail({
      schoolName: String(data.name_en),
      kind,
      origin: siteUrl,
    });
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: serverEnv.NOTIFY_FROM_EMAIL, to, subject, text }),
    });
  } catch {
    // Notification is a courtesy; the lead is already saved.
  }
}
