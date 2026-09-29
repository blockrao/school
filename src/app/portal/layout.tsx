import Link from "next/link";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { signOutOfPortal } from "./actions";

/**
 * Shared chrome for everything under /portal. /portal sits outside
 * src/app/[locale]/ (see src/proxy.ts's NON_LOCALE_PREFIXES), so none of
 * these pages ever got SiteHeader/AuthStatusLink — which meant no sign-out
 * control anywhere in the school portal. Each /portal/**\/page.tsx already
 * enforces its own auth (getMySchoolId()/requireSchoolMember() redirect to
 * /for-schools when signed out), so this layout only adds the header/session
 * chrome on top of that; it doesn't re-gate access itself.
 *
 * Session lookup here is a second cookies() read on top of whatever the page
 * itself does (getMySchoolId()/requireSchoolMember() each read it too) — an
 * accepted duplicate: /portal is already fully dynamic (those calls opt it
 * out of static rendering regardless), so this adds no new caching cost,
 * only one more already-cheap local JWT-claims check per request.
 */
export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);

  return (
    <div className="min-h-full flex flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-rule bg-copy-white px-4 py-3 md:px-10">
        <Link href="/portal" className="font-display text-card font-semibold text-ink">
          SchoolOye <span className="text-muted-ink font-normal">— School portal</span>
        </Link>
        {user && (
          <div className="flex items-center gap-3">
            <span className="hidden text-meta text-muted-ink sm:inline">
              Signed in as {user.email ?? user.phone ?? "you"}
            </span>
            <form action={signOutOfPortal}>
              <input type="hidden" name="scope" value="local" />
              <button
                type="submit"
                className="flex h-9 items-center rounded-md border border-line-blue px-3 text-meta font-semibold text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
