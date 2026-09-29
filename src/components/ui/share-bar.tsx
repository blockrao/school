"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface ShareBarProps {
  title: string;
  /** entity_type/entity_id/school_id recorded on the "share" analytics event. */
  entityType: "news" | "event" | "job";
  entityId: string;
  schoolId: string;
  className?: string;
}

/**
 * Sharing mechanics for News/Events/Jobs canonical pages (P1.7, Activity &
 * Admissions Consolidation) — copy link, WhatsApp, and native share where
 * supported, each logging a "share" analytics event. This is a sibling of
 * the existing <ShareButton> (school entity page only, no analytics, no
 * WhatsApp) rather than an edit to it: that component's single-button
 * "share whatever the OS offers, else copy" shape doesn't fit a page that
 * needs an always-visible WhatsApp link (the dominant parent-to-parent
 * sharing channel in this market) alongside copy/native share, and
 * threading analytics + explicit URL/title props through it would change
 * its existing call site's behavior for no benefit to that page.
 */
export function ShareBar({ title, entityType, entityId, schoolId, className }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  // Both depend on browser globals unavailable during SSR — computed after
  // mount rather than at render time so the server- and client-rendered
  // markup match on first paint (no hydration mismatch).
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setPageUrl(window.location.href);
    setCanNativeShare(typeof navigator.share === "function");
  }, []);

  function track(method: "whatsapp" | "copy_link" | "native") {
    try {
      const payload = JSON.stringify({
        eventType: "share",
        entityType,
        entityId,
        schoolId,
        metadata: { method },
      });
      navigator.sendBeacon("/api/track", payload);
    } catch {
      // Analytics must never block sharing itself.
    }
  }

  async function handleNativeShare() {
    if (!pageUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title, url: pageUrl });
        track("native");
      } catch {
        // User cancelled the share sheet — not an error worth reporting.
      }
      return;
    }
    await handleCopyLink();
  }

  async function handleCopyLink() {
    if (!pageUrl) return;
    await navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    track("copy_link");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleWhatsApp() {
    track("whatsapp");
  }

  const whatsappHref = pageUrl
    ? `https://wa.me/?text=${encodeURIComponent(`${title} ${pageUrl}`)}`
    : "#";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleWhatsApp}
        className="inline-flex h-9 items-center rounded-md border border-line-blue px-3 text-meta font-semibold text-ink"
      >
        WhatsApp
      </a>
      <Button variant="secondary" size="sm" type="button" onClick={handleCopyLink}>
        {copied ? "Link copied" : "Copy link"}
      </Button>
      {canNativeShare && (
        <Button variant="secondary" size="sm" type="button" onClick={handleNativeShare}>
          Share
        </Button>
      )}
    </div>
  );
}
