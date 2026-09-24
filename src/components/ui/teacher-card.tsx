import type { ReactNode } from "react";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import { cn } from "@/lib/utils";

export function TeacherCard({
  name,
  subject,
  schoolName,
  tag,
  className,
}: {
  name: string;
  subject: string;
  schoolName: string;
  tag?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-3 rounded-md border border-rule bg-copy-white p-3", className)}>
      <PhotoPlaceholder className="h-19 w-16" />
      <div className="flex flex-col gap-0.5">
        <span className="font-display text-card font-semibold">{name}</span>
        <span className="text-body">{subject}</span>
        <span className="text-body text-muted-ink">{schoolName}</span>
        {tag && (
          <span className="mt-1 self-start border-l-2 border-ink bg-margin-paper px-2 text-meta font-semibold">
            {tag}
          </span>
        )}
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UnclaimedProfileCard({
  name,
  subject,
  claimHref,
  className,
}: {
  name: string;
  subject: string;
  claimHref: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-dashed border-line-blue-strong p-3",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rule-soft font-semibold text-muted-ink"
      >
        {initials(name)}
      </span>
      <span className="flex flex-col">
        <span className="font-semibold text-body">
          {name} · {subject}
        </span>
        <a href={claimHref} className="font-semibold text-body text-ruled-blue">
          Are you this teacher? Claim your profile
        </a>
      </span>
    </div>
  );
}
