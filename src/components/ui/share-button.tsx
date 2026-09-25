"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Native share sheet where available, clipboard-copy fallback otherwise. No client state beyond the button's own "Copied" flash. */
export function ShareButton({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled the share sheet — not an error
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" size="sm" className={className} onClick={handleShare} type="button">
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}
