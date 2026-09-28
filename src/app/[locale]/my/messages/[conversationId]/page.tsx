import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import { getConversation, listMessages } from "@/lib/db/messages";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { localePrefix } from "@/lib/urls";
import { sendReply } from "../actions";

export const metadata: Metadata = {
  title: "Messages — SchoolOye",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ConversationThreadPage({
  params,
  searchParams,
}: PageProps<"/[locale]/my/messages/[conversationId]">) {
  const { locale, conversationId } = await params;
  const rawSearchParams = await searchParams;
  const errorCode = first(rawSearchParams.error);

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect(
      `${localePrefix(locale)}/sign-in?next=${encodeURIComponent(`${localePrefix(locale)}/my/messages/${conversationId}`)}`,
    );
  }

  const conversation = await getConversation(conversationId, user.id);
  if (!conversation) notFound();

  const { otherPartyLabel } = conversation;
  const messages = await listMessages(conversationId);

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <Link
        href={`${localePrefix(locale)}/my/messages`}
        className="text-meta font-semibold text-ruled-blue"
      >
        ← Messages
      </Link>
      <h1 className="mt-1 font-display text-title-m md:text-title-d">{otherPartyLabel}</h1>

      <div className="mt-6 flex flex-col gap-3">
        {messages.map((m) => {
          const mine = m.senderId === user.id;
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-md border p-3 ${
                mine
                  ? "self-end border-ruled-blue bg-ruled-blue text-copy-white"
                  : "self-start border-rule bg-copy-white"
              }`}
            >
              <p className="whitespace-pre-wrap text-body">{m.body}</p>
              <p className={`mt-1 text-meta ${mine ? "text-copy-white/70" : "text-muted-ink"}`}>
                {new Date(m.createdAt).toLocaleString("en-IN")}
              </p>
            </div>
          );
        })}
      </div>

      <form action={sendReply} className="mt-6 flex flex-col gap-2">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="conversationId" value={conversationId} />
        <textarea
          name="body"
          required
          rows={3}
          maxLength={4000}
          placeholder="Write a message…"
          className="rounded-md border border-line-blue-strong bg-copy-white p-3 text-body outline-none"
        />
        {errorCode === "rate_limited" ? (
          <FieldError id="reply-error">
            Too many messages sent — please wait a bit and try again.
          </FieldError>
        ) : null}
        <button
          type="submit"
          className="flex h-11 w-fit items-center rounded-md bg-ruled-blue px-4 font-semibold text-copy-white"
        >
          Send
        </button>
      </form>
    </div>
  );
}
