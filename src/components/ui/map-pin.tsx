import { cn } from "@/lib/utils";

type MapPinVariant = "closing-soon" | "open" | "upcoming" | "not-announced";

const variantClasses: Record<MapPinVariant, { pin: string; dot: string }> = {
  "closing-soon": { pin: "border-2 border-margin-red text-pill-soon-fg", dot: "bg-margin-red" },
  open: { pin: "border border-board-green text-board-green", dot: "bg-board-green" },
  upcoming: {
    pin: "border border-pencil-yellow-deep text-ink",
    dot: "border border-pencil-yellow-deep bg-pencil-yellow",
  },
  "not-announced": {
    pin: "border border-slate/50 text-muted-ink",
    dot: "border-2 border-slate bg-copy-white",
  },
};

export function MapPin({
  variant,
  children,
  className,
}: {
  variant: MapPinVariant;
  children: string;
  className?: string;
}) {
  const { pin, dot } = variantClasses[variant];
  return (
    <span
      className={cn(
        "inline-flex h-7.5 items-center gap-1.5 rounded-full bg-copy-white py-0 pr-2.5 pl-1.5 text-meta font-semibold shadow-card",
        pin,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", dot)} />
      {children}
    </span>
  );
}
