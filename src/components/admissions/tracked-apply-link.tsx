"use client";

/**
 * The one clickable place a parent leaves the site to apply on a school's
 * own admission form — wraps a plain <a> just to fire the
 * "admission_external_click" analytics event (P1.8) via sendBeacon before
 * the browser navigates. Deliberately a tiny client component rather than
 * making the whole Admissions section (entity-page.tsx, a server component)
 * client-rendered.
 */
export function TrackedApplyLink({
  href,
  cycleId,
  schoolId,
  className,
  children,
}: {
  href: string;
  cycleId: string;
  schoolId: string;
  className?: string;
  children: React.ReactNode;
}) {
  function handleClick() {
    try {
      navigator.sendBeacon(
        "/api/track",
        JSON.stringify({
          eventType: "admission_external_click",
          entityType: "admission_cycle",
          entityId: cycleId,
          schoolId,
        }),
      );
    } catch {
      // Analytics must never block the click-through itself.
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={handleClick}
      className={className}
    >
      {children}
    </a>
  );
}
