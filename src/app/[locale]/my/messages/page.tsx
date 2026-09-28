import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/state-message";
import { listMyConversations } from "@/lib/db/messages";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { localePrefix } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Messages — SchoolOye",
  robots: { index: false, follow: false },
};

export default async function MessagesInboxPage({ params }: PageProps<"/[locale]/my/messages">) {
  const { locale } = await params;
  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);
  if (!user)
    redirect(
      `${localePrefix(locale)}/sign-in?next=${encodeURIComponent(`${localePrefix(locale)}/my/messages`)}`,
    );

  const conversations = await listMyConversations();

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d">Messages</h1>

      {conversations.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No messages yet"
            description="Conversations with teachers you've contacted, or parents who've contacted you, show up here."
            nextStepLabel="Browse teachers"
            nextStepHref={`${localePrefix(locale)}/teachers`}
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`${localePrefix(locale)}/my/messages/${c.id}`}
              className="flex items-center justify-between gap-3 rounded-md border border-rule bg-copy-white p-4 hover:border-ruled-blue"
            >
              <div>
                <span className="font-display text-card font-semibold">{c.otherPartyLabel}</span>
                {c.isMine ? (
                  <p className="text-meta text-muted-ink">Re: your teacher profile</p>
                ) : (
                  <p className="text-meta text-muted-ink">{c.teacherName}</p>
                )}
              </div>
              <span className="shrink-0 text-meta text-muted-ink">
                {new Date(c.lastMessageAt).toLocaleDateString("en-IN")}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
