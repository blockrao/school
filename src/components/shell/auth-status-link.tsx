"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/db/browser";

/**
 * Renders the sign-in/account link, resolving signed-in state client-side
 * instead of the server reading cookies() for it. The old approach — the
 * root [locale]/layout.tsx calling createSessionClient() (cookies()) just to
 * compute isSignedIn — forced every single public page in the app to render
 * dynamically on every request, since a dynamic API call anywhere in a
 * layout opts the whole subtree out of static rendering/ISR in Next's
 * stable (non-experimental) model. Moving this one cosmetic UI toggle to
 * the client unlocks real caching for every page below it that doesn't
 * itself need a dynamic API.
 *
 * This is UI-only: it decides which link/label to show, nothing more. Every
 * actual authorization check (requireSchoolMember(), requireStaff(), RLS)
 * still happens entirely server-side and is unaffected by this component.
 *
 * getSession() reads the already-persisted session from cookies/storage
 * without a network round trip in the common case (unlike getUser()), so
 * this doesn't add a fetch to every page load.
 */
export function AuthStatusLink({
  locale,
  className,
  variant,
  onNavigate,
}: {
  locale: string;
  className?: string;
  variant?: "primary" | "secondary";
  onNavigate?: () => void;
}) {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createBrowserSupabaseClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled) setIsSignedIn(!!data.session);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Button asChild variant={variant} className={className}>
      <Link href={isSignedIn ? `/${locale}/my` : `/${locale}/sign-in`} onClick={onNavigate}>
        {isSignedIn ? "My account" : "Sign in"}
      </Link>
    </Button>
  );
}
