import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-body font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-ruled-blue text-copy-white hover:bg-ink focus-visible:outline-pencil-yellow",
        secondary:
          "border border-line-blue bg-copy-white text-ruled-blue hover:bg-margin-paper focus-visible:outline-ruled-blue",
        // V2 visual foundation (Increment 9) — additive variants for the
        // migrated shared chrome only (SiteHeader's AuthStatusLink,
        // MobileMenu's AuthStatusLink). Existing primary/secondary are
        // unchanged and still used by every unmigrated page.
        soPrimary:
          "bg-so-accent text-so-accent-ink font-so-sans hover:opacity-90 focus-visible:outline-so-accent",
        soSecondary:
          "border border-so-line2 bg-so-surface text-so-ink font-so-sans hover:bg-so-sunk focus-visible:outline-so-accent",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-11 px-4",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export function TextLink({ className, ...props }: React.ComponentProps<"a">) {
  return (
    <a
      className={cn("font-semibold text-ruled-blue underline-offset-3 hover:text-ink", className)}
      {...props}
    />
  );
}
