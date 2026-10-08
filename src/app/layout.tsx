import type { Metadata } from "next";
import { siteUrl } from "@/lib/env.server";
import "./globals.css";

// TODO: Restore Google Fonts (Anek_Latin, Anek_Devanagari, Mukta, IBM_Plex_*)
// once Turbopack module resolution is fixed in Next.js.
// For now, using system fonts to unblock Vercel deployment.

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "SchoolOye",
  description: "Find and compare schools in Delhi, Gurugram and Haryana.",
  // Most page content still only has light-mode colors (globals.css); the V2
  // so-* chrome tokens (SiteHeader/SiteFooter/nav) are the one real dark theme
  // so far, via @media (prefers-color-scheme: dark) — unaffected by this. Without
  // declaring color-scheme, a browser/device in dark mode auto-"force-dark"s
  // everything that HASN'T opted into real dark styling — guessing at backgrounds
  // vs. text vs. borders and washing the unmigrated page content out to flat
  // black-and-white. Revisit to "light dark" once page content gets real dark
  // values too, so form controls/scrollbars match whichever theme is active.
  other: { "color-scheme": "light" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-copy-white text-ink font-body">{children}</body>
    </html>
  );
}
