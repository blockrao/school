import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublicCityById, listPublicSchoolsByIds } from "@/lib/db/public-adapter";
import { createSessionClient, getSessionUser } from "@/lib/db/session";
import { formatIndianPhone } from "@/lib/phone";
import { localePrefix } from "@/lib/urls";
import { unsubscribeAlert } from "./actions";

// design-pending: no matching file in design/ for an account hub — the closest is
// WhatsApp Alerts step 5e ("Manage / unsubscribe"), which this borrows the shape of
// (list + turn-off per row) without the delivery-timing toggles (no backing column,
// same reasoning as /alerts). Logged in docs/design-gaps.md.

type Copy = {
  title: string;
  sendingTo: string;
  alertsHeading: string;
  noAlerts: string;
  getAlerts: string;
  classesLabel: string;
  turnOff: string;
  shortlistLink: string;
  admissionsLink: string;
  messagesLink: string;
  accountLink: string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "Your account",
    sendingTo: "WhatsApp alerts go to",
    alertsHeading: "Active alerts",
    noAlerts: "You don't have any alerts on right now.",
    getAlerts: "Get alerts",
    classesLabel: "Classes",
    turnOff: "Turn off",
    shortlistLink: "Saved schools",
    admissionsLink: "My Admissions",
    messagesLink: "Messages",
    accountLink: "Account settings",
  },
  hi: {
    title: "आपका खाता",
    sendingTo: "व्हाट्सएप अलर्ट यहां भेजे जाते हैं",
    alertsHeading: "सक्रिय अलर्ट",
    noAlerts: "अभी आपके पास कोई अलर्ट चालू नहीं है।",
    getAlerts: "अलर्ट पाएं",
    classesLabel: "कक्षाएं",
    turnOff: "बंद करें",
    shortlistLink: "सेव किए स्कूल",
    admissionsLink: "मेरे प्रवेश",
    messagesLink: "संदेश",
    accountLink: "खाता सेटिंग्स",
  },
};

export async function generateMetadata({ params }: PageProps<"/[locale]/my">): Promise<Metadata> {
  const { locale } = await params;
  const copy = COPY[locale] ?? COPY.en;
  return {
    title: `${copy.title} — SchoolOye`,
    robots: { index: false, follow: false },
  };
}

export default async function MyAccountPage({ params }: PageProps<"/[locale]/my">) {
  const { locale } = await params;
  const copy = COPY[locale] ?? COPY.en;
  const isHi = locale === "hi";

  const supabase = await createSessionClient();
  const user = await getSessionUser(supabase);

  if (!user) {
    redirect(
      `${localePrefix(locale)}/sign-in?next=${encodeURIComponent(`${localePrefix(locale)}/my`)}`,
    );
  }

  const { data: subscriptions } = await supabase
    .from("alert_subscriptions")
    .select("id, city_id, class_codes, school_ids")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  const allSchoolIds = (subscriptions ?? []).flatMap((s) => s.school_ids);
  // Each subscription carries its own city_id (set when the user subscribed, possibly
  // in a different city than the one they're browsing now) — resolve each one's real
  // city rather than assuming the visitor's current city applies to every row.
  const distinctCityIds = [...new Set((subscriptions ?? []).map((s) => s.city_id))];
  const [schools, cityRows] = await Promise.all([
    allSchoolIds.length > 0 ? listPublicSchoolsByIds(allSchoolIds) : Promise.resolve([]),
    Promise.all(distinctCityIds.map((id) => getPublicCityById(id))),
  ]);
  const schoolNameById = new Map(schools.map((s) => [s.id, s.name_en ?? "Unnamed school"]));
  const cityNameById = new Map(
    cityRows.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c.id, c.name_en]),
  );

  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-8 md:px-10 md:py-12">
      <h1 className="font-display text-title-m md:text-title-d" lang={isHi ? "hi" : undefined}>
        {copy.title}
      </h1>
      <p className="mt-2 text-body text-muted-ink" lang={isHi ? "hi" : undefined}>
        {copy.sendingTo} {formatIndianPhone(user.phone ?? "")}
      </p>
      <Link
        href={`${localePrefix(locale)}/my/account`}
        className="mt-2 inline-block w-fit font-semibold text-ruled-blue"
        lang={isHi ? "hi" : undefined}
      >
        {copy.accountLink}
      </Link>

      <div className="mt-8">
        <h2 className="font-display text-card font-semibold" lang={isHi ? "hi" : undefined}>
          {copy.alertsHeading}
        </h2>

        {subscriptions && subscriptions.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {subscriptions.map((sub) => (
              <li
                key={sub.id}
                className="flex items-center justify-between gap-3 rounded-md border border-rule p-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">
                    {cityNameById.get(sub.city_id) ?? "Unknown city"} · {copy.classesLabel}{" "}
                    {sub.class_codes.map((c) => c.replace("c", "")).join(", ")}
                  </span>
                  {sub.school_ids.length > 0 && (
                    <span className="text-meta text-muted-ink">
                      {sub.school_ids.map((id) => schoolNameById.get(id) ?? id).join(", ")}
                    </span>
                  )}
                </div>
                <form action={unsubscribeAlert}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="subscriptionId" value={sub.id} />
                  <button
                    type="submit"
                    className="flex h-11 shrink-0 items-center rounded-md border border-line-blue px-4 font-semibold text-ruled-blue"
                    lang={isHi ? "hi" : undefined}
                  >
                    {copy.turnOff}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 flex flex-col gap-2 border-l-2 border-rule py-1 pl-3.5">
            <span className="text-body text-muted-ink" lang={isHi ? "hi" : undefined}>
              {copy.noAlerts}
            </span>
            <Link
              href={`${localePrefix(locale)}/alerts`}
              className="w-fit font-semibold text-ruled-blue"
              lang={isHi ? "hi" : undefined}
            >
              {copy.getAlerts}
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`${localePrefix(locale)}/my/shortlist`}
          className="inline-flex h-12 items-center rounded-md border border-ruled-blue px-5 font-semibold text-ruled-blue"
          lang={isHi ? "hi" : undefined}
        >
          {copy.shortlistLink}
        </Link>
        <Link
          href={`${localePrefix(locale)}/my/admissions`}
          className="inline-flex h-12 items-center rounded-md border border-ruled-blue px-5 font-semibold text-ruled-blue"
          lang={isHi ? "hi" : undefined}
        >
          {copy.admissionsLink}
        </Link>
        <Link
          href={`${localePrefix(locale)}/my/messages`}
          className="inline-flex h-12 items-center rounded-md border border-ruled-blue px-5 font-semibold text-ruled-blue"
          lang={isHi ? "hi" : undefined}
        >
          {copy.messagesLink}
        </Link>
      </div>
    </div>
  );
}
