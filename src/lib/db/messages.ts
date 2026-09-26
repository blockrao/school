import "server-only";
import { createSessionClient } from "@/lib/db/session";

export type ConversationSummary = {
  id: string;
  teacherId: string;
  teacherName: string;
  otherPartyLabel: string;
  isMine: boolean; // true if the signed-in user is the teacher being messaged
  lastMessageAt: string;
  createdAt: string;
};

/**
 * Every conversation the signed-in user is a participant in — as the parent
 * who reached out, or as the teacher who owns the listing being messaged.
 * RLS (conversations_participant_select) is the actual gate; this just
 * shapes the result for the inbox. No FK embed (this codebase's convention
 * is a second lookup by id, same as listPublicSchoolsByIds elsewhere).
 */
export async function listMyConversations(): Promise<ConversationSummary[]> {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("conversations")
    .select("id, teacher_id, initiator_id, created_at, last_message_at")
    .order("last_message_at", { ascending: false });

  const teacherIds = [...new Set((rows ?? []).map((r) => r.teacher_id))];
  const teachers =
    teacherIds.length > 0
      ? (await supabase.from("teachers").select("id, full_name, claimed_by").in("id", teacherIds))
          .data
      : [];
  const teacherById = new Map((teachers ?? []).map((t) => [t.id, t]));

  return (rows ?? []).map((row) => {
    const teacher = teacherById.get(row.teacher_id);
    const isMine = teacher?.claimed_by === user.id;
    return {
      id: row.id,
      teacherId: row.teacher_id,
      teacherName: teacher?.full_name ?? "Teacher",
      otherPartyLabel: isMine ? "A parent" : (teacher?.full_name ?? "Teacher"),
      isMine,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
    };
  });
}

export type ConversationDetail = {
  id: string;
  teacherId: string;
  teacherName: string;
  isMine: boolean;
  otherPartyLabel: string;
};

export async function getConversation(
  conversationId: string,
  currentUserId: string,
): Promise<ConversationDetail | null> {
  const supabase = await createSessionClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, teacher_id, initiator_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return null;

  const { data: teacher } = await supabase
    .from("teachers")
    .select("full_name, claimed_by")
    .eq("id", conversation.teacher_id)
    .maybeSingle();

  const isMine = teacher?.claimed_by === currentUserId;
  return {
    id: conversation.id,
    teacherId: conversation.teacher_id,
    teacherName: teacher?.full_name ?? "Teacher",
    isMine,
    otherPartyLabel: isMine ? "A parent" : (teacher?.full_name ?? "Teacher"),
  };
}

/** The signed-in user's conversation with a teacher, if one already exists. */
export async function findConversation(teacherId: string) {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("conversations")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("initiator_id", user.id)
    .maybeSingle();
  return data;
}

export type MessageRow = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    body: m.body,
    createdAt: m.created_at,
  }));
}
