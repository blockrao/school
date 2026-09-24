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
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${schoolName} ${shareUrl}`)}`;

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareOrCopy() {
    if (navigator.share) {
      try {
        await navigator.share({ title: schoolName, url: shareUrl });
        return;
      } catch {
        // user cancelled the native share sheet — fall through to clipboard
      }
    }
    await copyLink();
  }

  return (
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
