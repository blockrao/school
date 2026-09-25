import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FieldError } from "@/components/ui/field-error";
import { createSessionClient } from "@/lib/db/session";
import { formatIndianPhone } from "@/lib/phone";
import { signOut, updateName } from "./actions";

// design-pending — no design file for an account-settings page. Minimal functional
// version built from existing primitives. Logged in docs/design-gaps.md.

type Copy = {
  title: string;
  nameLabel: string;
  save: string;
  saved: string;
  signedInAs: string;
  signOutHeading: string;
  signOutCurrent: string;
  signOutAll: string;
  errorInvalidName: string;
  consentHeading: string;
  consentGranted: string;
  consentWithdrawn: string;
  noConsents: string;
  dataHeading: string;
  exportLink: string;
  deleteLink: string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "Account",
    nameLabel: "Your name",
    save: "Save",
    saved: "Saved.",
    signedInAs: "Signed in as",
    signOutHeading: "Sign out",
    signOutCurrent: "Sign out of this device",
    signOutAll: "Sign out of all devices",
    errorInvalidName: "Enter your name.",
    consentHeading: "Consent history",
    consentGranted: "Agreed",
    consentWithdrawn: "Withdrawn",
    noConsents: "No consent history yet.",
    dataHeading: "Your data",
    exportLink: "Download a copy of your data (JSON)",
    deleteLink: "Delete my account",
  },
  hi: {
    title: "खाता",
    nameLabel: "आपका नाम",
    save: "सेव करें",
    saved: "सेव हो गया।",
    signedInAs: "इस रूप में साइन इन:",
    signOutHeading: "साइन आउट",
    signOutCurrent: "इस डिवाइस से साइन आउट करें",
    signOutAll: "सभी डिवाइस से साइन आउट करें",
    errorInvalidName: "अपना नाम डालें।",
    consentHeading: "सहमति इतिहास",
    consentGranted: "सहमत",
    consentWithdrawn: "वापस ली गई",
    noConsents: "अभी तक कोई सहमति इतिहास नहीं है।",
    dataHeading: "आपका डेटा",
    exportLink: "अपने डेटा की एक प्रति डाउनलोड करें (JSON)",
    deleteLink: "मेरा खाता हटाएं",
  },
};

const PURPOSE_LABELS: Record<string, string> = {
  account: "Account terms & privacy",
  child_profile: "Child profile",
  whatsapp_alerts: "WhatsApp alerts",
  application_help: "Application Help",
  document_storage: "Document storage",
  marketing: "Marketing updates",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/my/account">): Promise<Metadata> {
  const { locale } = await params;
  const copy = COPY[locale] ?? COPY.en;
  return {
    title: `${copy.title} — SchoolOye`,
    robots: { index: false, follow: false },
  };
}

export default async function AccountPage({
  params,
  searchParams,
}: PageProps<"/[locale]/my/account">) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const copy = COPY[locale] ?? COPY.en;
  const isHi = locale === "hi";
  const errorCode = first(rawSearchParams.error);
  const saved = first(rawSearchParams.saved) === "1";

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/my/account`)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: consents } = await supabase
    .from("consents")
    .select("purpose, notice_version, granted_at, withdrawn_at")
    .eq("user_id", user.id)
    .order("granted_at", { ascending: false });

  const identity = user.phone ? formatIndianPhone(user.phone) : (user.email ?? "");

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d" lang={isHi ? "hi" : undefined}>
        {copy.title}
      </h1>
      <p className="mt-2 text-body text-muted-ink" lang={isHi ? "hi" : undefined}>
        {copy.signedInAs} {identity}
      </p>

      <form action={updateName} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <label className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-muted-ink" lang={isHi ? "hi" : undefined}>
            {copy.nameLabel}
          </span>
          <input
            type="text"
            name="fullName"
            autoComplete="name"
            required
            maxLength={200}
            defaultValue={profile?.full_name ?? ""}
            className="h-12 max-w-96 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
          />
          {errorCode === "invalid_name" && (
            <FieldError id="name-error">{copy.errorInvalidName}</FieldError>
          )}
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="flex h-11 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
            lang={isHi ? "hi" : undefined}
          >
            {copy.save}
          </button>
          {saved && (
            <span
              className="text-meta font-semibold text-board-green"
              lang={isHi ? "hi" : undefined}
            >
              {copy.saved}
            </span>
          )}
        </div>
      </form>

      <div className="mt-8 border-t border-rule pt-6">
        <h2 className="font-display text-card font-semibold" lang={isHi ? "hi" : undefined}>
          {copy.signOutHeading}
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="scope" value="local" />
            <button
              type="submit"
              className="flex h-11 items-center rounded-md border border-line-blue px-4 font-semibold text-ink"
              lang={isHi ? "hi" : undefined}
            >
              {copy.signOutCurrent}
            </button>
          </form>
          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="scope" value="global" />
            <button
              type="submit"
              className="flex h-11 items-center rounded-md border border-line-blue px-4 font-semibold text-ink"
              lang={isHi ? "hi" : undefined}
            >
              {copy.signOutAll}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8 border-t border-rule pt-6">
        <h2 className="font-display text-card font-semibold" lang={isHi ? "hi" : undefined}>
          {copy.consentHeading}
        </h2>
        {consents && consents.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {consents.map((c) => (
              <li
                key={`${c.purpose}-${c.granted_at}`}
                className="flex flex-col gap-0.5 rounded-md border border-rule p-3"
              >
                <span className="font-semibold">{PURPOSE_LABELS[c.purpose] ?? c.purpose}</span>
                <span className="text-meta text-muted-ink">
                  {c.withdrawn_at ? copy.consentWithdrawn : copy.consentGranted} ·{" "}
                  {new Date(c.withdrawn_at ?? c.granted_at).toLocaleDateString(
                    isHi ? "hi-IN" : "en-IN",
                    { year: "numeric", month: "short", day: "numeric" },
                  )}{" "}
                  · {c.notice_version}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-body text-muted-ink" lang={isHi ? "hi" : undefined}>
            {copy.noConsents}
          </p>
        )}
      </div>

      <div className="mt-8 border-t border-rule pt-6">
        <h2 className="font-display text-card font-semibold" lang={isHi ? "hi" : undefined}>
          {copy.dataHeading}
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          <a
            href={`/${locale}/my/account/export`}
            className="w-fit font-semibold text-ruled-blue"
            lang={isHi ? "hi" : undefined}
          >
            {copy.exportLink}
          </a>
          <Link
            href={`/${locale}/my/account/delete`}
            className="w-fit font-semibold text-ink underline"
            lang={isHi ? "hi" : undefined}
          >
            {copy.deleteLink}
          </Link>
        </div>
      </div>

      <p className="mt-8 text-meta text-muted-ink">
        <Link href={`/${locale}/my`} className="font-semibold text-ruled-blue">
          {isHi ? "अलर्ट प्रबंधित करें" : "Manage WhatsApp alerts"}
        </Link>
      </p>
    </div>
  );
}
