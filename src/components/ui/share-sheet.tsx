"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ShareSheet({
  schoolName,
  shareUrl,
  className,
}: {
  schoolName: string;
  shareUrl: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  // Real anchor with a real href — works with JS disabled, unlike a share-API button.
  // Tagged with UTM params so WhatsApp-originated traffic is attributable; the copy-link
  // and native-share paths below share the untagged canonical URL instead.
  const whatsappShareUrl = `${shareUrl}${shareUrl.includes("?") ? "&" : "?"}utm_source=whatsapp&utm_medium=share`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${schoolName} ${whatsappShareUrl}`)}`;

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareOrCopy() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: schoolName, url: shareUrl });
    } catch (err) {
      // AbortError = the user closed the native share sheet themselves; that's not a
      // failure, so do nothing. Any other error (no share target, permission denied,
      // etc.) falls back to clipboard.
      if (err instanceof Error && err.name === "AbortError") return;
      await copyLink();
    }
  }

  return (
    // NOTE: the mockup specs 12px top corners here, not 20px. --radius-sheet is
    // reserved for the 18–22px range (matches the mobile filter drawer mentioned in
    // the Components Sheet, not yet built) — using it here is a size mismatch, but
    // there's no existing token for 12px and Tailwind v4's radius scale is
    // theme-based, not dynamic-integer, so an arbitrary [12px] isn't an option
    // either without a token. Flagging rather than picking a value unilaterally —
    // see the design-token audit for the alternatives (rounded-md, or a new token).
    <div
      className={cn(
        "flex flex-col gap-2 rounded-t-sheet rounded-b-md border border-rule bg-copy-white p-3.5",
        className,
      )}
    >
      <span className="font-semibold text-body">Share {schoolName}</span>
      <Button asChild variant="primary" className="justify-center">
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
          Share on WhatsApp
        </a>
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" onClick={copyLink}>
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button variant="secondary" size="sm" onClick={shareOrCopy}>
          More options
        </Button>
      </div>
    </div>
  );
}
