import { useMemo } from "react";
import type { Country } from "react-phone-number-input";
import { getCountries, getCountryCallingCode } from "react-phone-number-input";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export type Phone10FieldValue = {
  country: Country;
  subscriber: string; // digits only, max 10
};

type Props = {
  value: Phone10FieldValue;
  onChange: (next: Phone10FieldValue) => void;
  className?: string;
  disabled?: boolean;
  subscriberPlaceholder?: string;
};

/**
 * Two-part phone field:
 * 1) Country selector (calling code)
 * 2) Subscriber number input (EXACTLY 10 digits required by validation)
 */
export function Phone10Field({ value, onChange, className, disabled, subscriberPlaceholder }: Props) {
  const countries = useMemo(() => getCountries(), []);
  const callingCode = useMemo(() => getCountryCallingCode(value.country), [value.country]);

  return (
    <div className={cn("grid grid-cols-[140px_1fr] gap-2", className)}>
      <div className="h-12 rounded-xl border border-border bg-background px-3 flex items-center">
        <select
          className="w-full bg-transparent text-sm outline-none"
          value={value.country}
          disabled={disabled}
          onChange={(e) => {
            const nextCountry = e.target.value as Country;
            // Clean slate: keep subscriber digits, but country code will change.
            onChange({ country: nextCountry, subscriber: value.subscriber });
          }}
        >
          {countries.map((c) => (
            <option key={c} value={c}>
              {c} (+{getCountryCallingCode(c)})
            </option>
          ))}
        </select>
      </div>

      <div className="h-12 rounded-xl border border-border bg-background px-3 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">+{callingCode}</span>
        <Input
          value={value.subscriber}
          onChange={(e) => {
            const digits = onlyDigits(e.target.value).slice(0, 10);
            onChange({ country: value.country, subscriber: digits });
          }}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="tel"
          placeholder={subscriberPlaceholder}
          className="h-10 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 leading-normal"
          maxLength={10}
        />
      </div>
    </div>
  );
}
