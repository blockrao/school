import "server-only";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/db/session";

/** Redirects home if not signed in or not staff. Returns the authenticated Supabase client for reuse. */
export async function requireStaff(locale = "en") {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/sign-in?next=%2Fops`);

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect(`/${locale}`);

  return supabase;
}
