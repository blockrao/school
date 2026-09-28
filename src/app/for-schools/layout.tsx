import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { listLaunchedCityOptions } from "@/lib/db/public-adapter";

/**
 * /for-schools/* is deliberately locale-less (src/proxy.ts's NON_LOCALE_PREFIXES —
 * same category as /ops, /portal, /api), so it sits outside src/app/[locale]/layout.tsx
 * and never got that layout's SiteHeader/SiteFooter/MobileBottomNav. Unlike /ops and
 * /portal (staff-only tools, correctly chromeless), this is a public marketing + claim
 * flow that parents and school admins land on directly from search and ads — it needs
 * the same header/footer as every other public page, not a bare page.
 *
 * Fixed to the "en" default locale (matches DEFAULT_LOCALE in src/proxy.ts and the
 * hardcoded /en/... links already used inside this tree, e.g.
 * for-schools/claim/page.tsx's "Browse all schools" fallback) — there's no locale
 * segment here to read one from, and nav links only ever need to point into the
 * locale-prefixed site, not resolve the current page's own locale.
 */
export default async function ForSchoolsLayout({ children }: LayoutProps<"/for-schools">) {
  const locale = "en";
  const areas = await listLaunchedCityOptions(locale);

  return (
    <>
      <SiteHeader locale={locale} areas={areas} />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale} />
      <MobileBottomNav locale={locale} areas={areas} />
    </>
  );
}
