"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { localePrefix } from "@/lib/urls";

const startSchema = z.object({
  teacherId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

/** From a teacher's profile: reuses the existing thread with that teacher, or starts one. */
export async function startConversation(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const parsed = startSchema.safeParse({
    teacherId: formData.get("teacherId"),
    body: formData.get("body"),
  });

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect(`${localePrefix(locale)}/sign-in`);

  if (!parsed.success) {
    redirect(
      `${localePrefix(locale)}/teacher/${formData.get("teacherIdSlug") ?? ""}?error=invalid_message`,
    );
  }

  const allowed = await checkRateLimit("start_conversation", user.id, 10, 3600);
  if (!allowed) {
    redirect(
      `${localePrefix(locale)}/teacher/${formData.get("teacherIdSlug") ?? ""}?error=rate_limited`,
    );
  }

  let { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("teacher_id", parsed.data.teacherId)
    .eq("initiator_id", user.id)
    .maybeSingle();

  if (!conversation) {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ teacher_id: parsed.data.teacherId, initiator_id: user.id })
      .select("id")
      .single();
    if (error || !created) {
      redirect(
        `${localePrefix(locale)}/teacher/${formData.get("teacherIdSlug") ?? ""}?error=message_failed`,
      );
    }
    conversation = created;
  }

  await supabase.from("messages").insert({
    conversation_id: conversation?.id,
    sender_id: user.id,
    body: parsed.data.body,
  });

  redirect(`${localePrefix(locale)}/my/messages/${conversation?.id}`);
}

const replySchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export async function sendReply(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const parsed = replySchema.safeParse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body"),
  });

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect(`${localePrefix(locale)}/sign-in`);
  if (!parsed.success) return;

  const allowed = await checkRateLimit("send_message", user.id, 30, 3600);
  if (!allowed) {
    redirect(
      `${localePrefix(locale)}/my/messages/${parsed.data.conversationId}?error=rate_limited`,
    );
  }

  await supabase.from("messages").insert({
    conversation_id: parsed.data.conversationId,
    sender_id: user.id,
    body: parsed.data.body,
  });

  redirect(`${localePrefix(locale)}/my/messages/${parsed.data.conversationId}`);
}
