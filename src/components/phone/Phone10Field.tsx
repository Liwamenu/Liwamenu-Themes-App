import { useMemo } from "react";
import type { Country } from "react-phone-number-input";
import { getCountries, getCountryCallingCode } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

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

// Flag component using react-phone-number-input flags
function CountryFlag({ country }: { country: Country }) {
  const FlagComponent = flags[country];
  if (!FlagComponent) return null;
  return (
    <span className="inline-flex w-5 h-4 overflow-hidden rounded-sm">
      <FlagComponent title={country} />
    </span>
  );
}

/**
 * Two-part phone field:
 * 1) Country selector with flag (calling code)
 * 2) Subscriber number input (EXACTLY 10 digits required by validation)
 */
export function Phone10Field({ value, onChange, className, disabled, subscriberPlaceholder }: Props) {
  const countries = useMemo(() => getCountries(), []);
  const callingCode = useMemo(() => getCountryCallingCode(value.country), [value.country]);

  return (
    <div className={cn("grid grid-cols-[160px_1fr] gap-2", className)}>
      {/* Country selector with flag */}
      <div className="h-12 rounded-xl border border-border bg-background px-3 flex items-center gap-2">
        <CountryFlag country={value.country} />
        <select
          className="flex-1 bg-transparent text-sm outline-none cursor-pointer appearance-none"
          value={value.country}
          disabled={disabled}
          onChange={(e) => {
            const nextCountry = e.target.value as Country;
            onChange({ country: nextCountry, subscriber: value.subscriber });
          }}
          style={{ backgroundImage: 'none' }}
        >
          {countries.map((c) => (
            <option 
              key={c} 
              value={c}
              className="bg-background text-foreground"
            >
              {c} +{getCountryCallingCode(c)}
            </option>
          ))}
        </select>
        <svg className="w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Phone number input (10 digits) */}
      <div className="h-12 rounded-xl border border-border bg-background px-3 flex items-center">
        <Input
          value={value.subscriber}
          onChange={(e) => {
            const digits = onlyDigits(e.target.value).slice(0, 10);
            onChange({ country: value.country, subscriber: digits });
          }}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="tel"
          placeholder={subscriberPlaceholder || "XXXXXXXXXX"}
          className="h-10 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 leading-normal"
          maxLength={10}
        />
      </div>
    </div>
  );
}
