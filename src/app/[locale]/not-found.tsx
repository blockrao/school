import Link from "next/link";

/**
 * Renders inside src/app/[locale]/layout.tsx (not-found.js is a page-level
 * convention — it's wrapped by the layout above it in the same segment,
 * exactly like a normal page), so the site header/footer stay in place. Before
 * this file existed, every notFound() call anywhere under [locale] (an
 * unlaunched or misspelled city, a school that isn't published, a bad
 * locality slug) fell through to Next's bare, unstyled default 404 — no
 * header, no footer, no branding, easy to mistake for a genuinely broken
 * page ("blank page") rather than a normal "that doesn't exist" result.
 */
export default function LocaleNotFound() {
  return (
    <div className="mx-auto max-w-(--container-read) px-4 py-16 md:px-10 md:py-24">
      <div className="flex flex-col gap-3 border-l-2 border-slate py-1 pl-3.5">
        <span className="font-display text-title-m font-semibold">Page not found</span>
        <p className="text-body text-muted-ink">
          That page doesn't exist, or the school or area you're looking for isn't published yet.
        </p>
        <Link href="/" className="w-fit font-semibold text-ruled-blue">
          Back to home
        </Link>
      </div>
    </div>
  );
}
