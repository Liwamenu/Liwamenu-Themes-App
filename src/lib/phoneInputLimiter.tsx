import React from "react";
import type { Country } from "react-phone-number-input";
import { splitDigitsAfterCallingCode } from "@/lib/phoneValidation";

function countDigitsAfterCallingCode(value: string, country: Country, maxDigitsAfterCode: number) {
  const { codeDigits, restDigits } = splitDigitsAfterCallingCode(value, country);
  return {
    codeDigits,
    restLen: restDigits.length,
    remaining: Math.max(0, maxDigitsAfterCode - restDigits.length),
  };
}

/**
 * Creates a DOM <input/> component for react-phone-number-input that HARD-BLOCKS
 * entering more than `maxDigitsAfterCode` digits after the selected country calling code.
 */
export function createLimitedPhoneInput(country: Country, maxDigitsAfterCode = 10) {
  return React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    function LimitedPhoneInput({ onBeforeInput, onPaste, value, ...rest }, ref) {
      const currentValue = String(value ?? "");

      return (
        <input
          {...rest}
          ref={ref}
          value={currentValue}
          onBeforeInput={(e) => {
            onBeforeInput?.(e);
            if (e.defaultPrevented) return;

            // `data` can be null for deletions, composition, etc.
            const data = (e as unknown as InputEvent).data;
            if (!data) return;

            const incomingDigits = String(data).replace(/\D/g, "");
            if (!incomingDigits) return;

            const { remaining } = countDigitsAfterCallingCode(currentValue, country, maxDigitsAfterCode);
            if (incomingDigits.length > remaining) {
              e.preventDefault();
            }
          }}
          onPaste={(e) => {
            onPaste?.(e);
            if (e.defaultPrevented) return;

            const pasted = e.clipboardData?.getData("text") ?? "";
            const incomingDigits = pasted.replace(/\D/g, "");
            if (!incomingDigits) return;

            const { remaining } = countDigitsAfterCallingCode(currentValue, country, maxDigitsAfterCode);
            if (incomingDigits.length > remaining) {
              e.preventDefault();
            }
          }}
        />
      );
    },
  );
}
