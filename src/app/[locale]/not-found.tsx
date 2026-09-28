import Link from "next/link";
import { getDictionary } from "@/i18n/dictionary";
import { t } from "@/i18n/t";

/**
 * Renders inside src/app/[locale]/layout.tsx (not-found.js is a page-level
 * convention — it's wrapped by the layout above it in the same segment,
 * exactly like a normal page), so the site header/footer stay in place. Before
 * this file existed, every notFound() call anywhere under [locale] (an
 * unlaunched or misspelled city, a school that isn't published, a bad
 * locality slug) fell through to Next's bare, unstyled default 404 — no
 * header, no footer, no branding, easy to mistake for a genuinely broken
 * page ("blank page") rather than a normal "that doesn't exist" result.
 *
 * not-found.js doesn't receive the route's `params` in this Next version, so
 * there's no `locale` to read here — hardcoded to "en" (the only registered
 * dictionary right now; see src/i18n/dictionary.ts's header comment).
 */
export default async function LocaleNotFound() {
  const dict = await getDictionary("en");
  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-16 md:px-10 md:py-24">
      <div className="flex flex-col gap-3 border-l-2 border-slate py-1 pl-3.5">
        <span className="font-display text-title-m font-semibold">
          {t(dict, "errors.not_found_title")}
        </span>
        <p className="text-body text-muted-ink">{t(dict, "errors.not_found_description")}</p>
        <Link href="/" className="w-fit font-semibold text-ruled-blue">
          {t(dict, "common.back_to_home")}
        </Link>
      </div>
    </div>
  );
}
