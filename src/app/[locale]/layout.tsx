import { notFound } from "next/navigation";
import { HtmlLangSync } from "@/components/shell/html-lang-sync";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { getDictionary } from "@/i18n/dictionary";
import { listLaunchedCityOptions } from "@/lib/db/public-adapter";

const LOCALES = ["en", "hi"] as const;
type Locale = (typeof LOCALES)[number];

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();

  const [areas, dict] = await Promise.all([listLaunchedCityOptions(locale), getDictionary(locale)]);

  // isSignedIn used to be computed here via createSessionClient() (cookies()),
  // which forced every single page under this layout to render dynamically —
  // a dynamic API call anywhere in a layout opts the whole subtree out of
  // static rendering/ISR in Next's stable (non-experimental) model. It's now
  // resolved client-side by AuthStatusLink (see SiteHeader), so this layout
  // itself has no dynamic API calls and pages below it can be statically
  // rendered/cached again.
  return (
    <>
      {/* Root layout (src/app/layout.tsx) hardcodes <html lang="en"> and sits
          above this segment, so it can't see `locale` without a dynamic API
          call that would break static rendering/ISR sitewide — see
          HtmlLangSync's own comment for the full tradeoff and the real,
          static-safe fix (splitting into multiple root layouts) this stands
          in for. Client-side only: fixes the DOM for real visitors and any
          JS-executing crawler, not the raw server-rendered HTML. */}
      <HtmlLangSync locale={locale} />
      <SiteHeader locale={locale} areas={areas} dict={dict} />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale} dict={dict} />
      <MobileBottomNav locale={locale} areas={areas} dict={dict} />
    </>
  );
}
