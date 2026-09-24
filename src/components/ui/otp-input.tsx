"use client";

import { type ChangeEvent, type ComponentProps, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;

function stripToDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

/**
 * A single real `<input>` (so Android SMS autofill, iOS one-time-code suggestions,
 * and paste all work) with a decorative six-box overlay drawn on top of it. The
 * input is stretched over the full box area, so tapping any box focuses it directly
 * — no click-forwarding JS needed.
 */
export function OtpInput({
  name = "otp",
  autoSubmit = false,
  className,
  ...ariaProps
}: {
  name?: string;
  autoSubmit?: boolean;
  className?: string;
} & Pick<ComponentProps<"input">, "aria-invalid" | "aria-describedby">) {
  const [digits, setDigits] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setDigits(stripToDigits(event.target.value));
  }

  useEffect(() => {
    if (!autoSubmit || digits.length !== OTP_LENGTH) return;
    formRef.current?.requestSubmit();
  }, [autoSubmit, digits]);

  return (
    <div className={cn("relative grid max-w-85 grid-cols-6 gap-2", className)}>
      {Array.from({ length: OTP_LENGTH }, (_, index) => {
        const isCaret = focused && index === digits.length;
        return (
          <div
            key={
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length OTP boxes, position is the identity
              index
            }
            aria-hidden="true"
            className="flex h-14 items-center justify-center rounded-md border-2 border-ink font-display font-semibold text-section"
          >
            {digits[index] ??
              (isCaret ? <span className="h-6 w-0.5 animate-pulse bg-ink" /> : null)}
          </div>
        );
      })}
      <input
        ref={(el) => {
          inputRef.current = el;
          formRef.current = el?.form ?? null;
        }}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={OTP_LENGTH}
        name={name}
        value={digits}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="6-digit code"
        className="absolute inset-0 h-full w-full cursor-text border-0 bg-transparent text-transparent caret-transparent"
        {...ariaProps}
      />
    </div>
  );
}
