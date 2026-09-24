"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ShareSheet({
  schoolName,
  whatsappHref,
  shareUrl,
  onMoreOptions,
  className,
}: {
  schoolName: string;
  whatsappHref: string;
  shareUrl: string;
  onMoreOptions?: () => void;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <Button variant="secondary" size="sm" onClick={handleCopyLink}>
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button variant="secondary" size="sm" onClick={onMoreOptions}>
          More options
        </Button>
      </div>
    </div>
  );
}
