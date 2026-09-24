"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;

export function OtpInput({
  name,
  onComplete,
  error,
  className,
}: {
  name: string;
  onComplete?: (code: string) => void;
  error?: string;
  className?: string;
}) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function updateDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== "")) {
      onComplete?.(next.join(""));
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="grid max-w-85 grid-cols-6 gap-2">
        {digits.map((digit, index) => (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length OTP boxes, position is the identity
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(event) => updateDigit(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
            className="h-14 rounded-md border-2 border-ink text-center font-display font-semibold text-section"
          />
        ))}
      </div>
      <input type="hidden" name={name} value={digits.join("")} />
      {error && <span className="font-semibold text-body text-ink">{error}</span>}
    </div>
  );
}
