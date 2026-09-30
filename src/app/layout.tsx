import type { Metadata } from "next";
import {
  Anek_Devanagari,
  Anek_Latin,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  IBM_Plex_Sans_Devanagari,
  Mukta,
} from "next/font/google";
import { siteUrl } from "@/lib/env.server";
import "./globals.css";

const anekLatin = Anek_Latin({
  variable: "--font-anek-latin",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const anekDevanagari = Anek_Devanagari({
  variable: "--font-anek-devanagari",
  subsets: ["devanagari"],
  weight: ["500", "600", "700"],
});

const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

// V2 visual foundation (Increment 9) — additive, alongside the Anek/Mukta
// fonts above, not a replacement: only the migrated shared chrome
// (SiteHeader/SiteFooter/nav/mobile nav) opts into these via the
// `font-so-sans`/`font-so-mono` utilities (globals.css). Weights match the
// design reference's own Google Fonts import exactly (400/500/600 for Sans
// and Sans Devanagari, 400/500 for Mono) rather than pulling every weight.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexSansDevanagari = IBM_Plex_Sans_Devanagari({
  variable: "--font-plex-sans-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "SchoolOye",
  description: "Find and compare schools in Delhi, Gurugram and Haryana.",
  // The app has one deliberate light theme (globals.css), no dark variant. Without
  // this, a browser/device set to dark mode auto-"force-dark"s the page — guessing
  // at backgrounds vs. text vs. borders and washing out the brand palette into a
  // flat black-and-white look. This just opts the page out of that guesswork.
  other: { "color-scheme": "light" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${anekLatin.variable} ${anekDevanagari.variable} ${mukta.variable} ${plexSans.variable} ${plexSansDevanagari.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-copy-white text-ink font-body">{children}</body>
    </html>
  );
}
