import { NextResponse } from "next/server";
import { needsOnboarding, postSignInPath } from "@/lib/db/onboarding";
import { createSessionClient } from "@/lib/db/session";

/** Not locale-prefixed — this is the stable URL baked into every signup-confirmation and password-reset email. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/en";
  const locale = next.split("/")[1] || "en";

  if (code) {
    const supabase = await createSessionClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Same as phone sign-in: ensure a profile row exists from first sign-in.
      await supabase
        .from("profiles")
        .upsert({ user_id: data.user.id }, { onConflict: "user_id", ignoreDuplicates: true });
      const pending = await needsOnboarding(supabase, data.user.id);
      return NextResponse.redirect(new URL(postSignInPath(pending, locale, next), url.origin));
    }
  }

  return NextResponse.redirect(new URL("/en/sign-in?error=invalid_code", url.origin));
}
