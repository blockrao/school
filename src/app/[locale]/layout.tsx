import { notFound } from "next/navigation";
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
      <SiteHeader locale={locale} areas={areas} dict={dict} />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale} dict={dict} />
      <MobileBottomNav locale={locale} areas={areas} dict={dict} />
    </>
  );
}
