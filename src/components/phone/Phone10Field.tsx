import { useMemo } from "react";
import type { Country } from "react-phone-number-input";
import { getCountries, getCountryCallingCode } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { getMaxSubscriberDigits } from "@/lib/phoneValidation";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export type Phone10FieldValue = {
  country: Country;
  subscriber: string; // digits only, max per country
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
    <span className="inline-flex w-5 h-4 overflow-hidden rounded-[3px] shrink-0">
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
  const maxDigits = useMemo(() => getMaxSubscriberDigits(value.country), [value.country]);

  return (
    <div className={cn("grid grid-cols-[160px_1fr] gap-2", className)}>
      {/* Country selector with flag */}
      <Select
        value={value.country}
        onValueChange={(next) => {
          onChange({ country: next as Country, subscriber: value.subscriber });
        }}
        disabled={disabled}
      >
        <SelectTrigger className="h-12 rounded-[3px] border border-border bg-background px-3 flex items-center gap-2 hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <CountryFlag country={value.country} />
          <span className="text-sm flex-1 text-left">
            {value.country} +{callingCode}
          </span>
        </SelectTrigger>
        <SelectContent className="max-h-[300px] z-[9999]">
          {countries.map((c) => (
            <SelectItem key={c} value={c} className="cursor-pointer">
              <div className="flex items-center gap-2">
                <CountryFlag country={c} />
                <span>
                  {c} +{getCountryCallingCode(c)}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Phone number input */}
      <div className="h-12 rounded-[3px] border border-border bg-background px-3 flex items-center">
        <Input
          value={value.subscriber}
          onChange={(e) => {
            const digits = onlyDigits(e.target.value);
            onChange({ country: value.country, subscriber: digits.slice(0, maxDigits) });
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            const digits = onlyDigits(pasted);
            const subscriber = digits.length > maxDigits ? digits.slice(-maxDigits) : digits.slice(0, maxDigits);
            e.preventDefault();
            onChange({ country: value.country, subscriber });
          }}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder={subscriberPlaceholder || "X".repeat(maxDigits)}
          className="h-10 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 leading-normal text-base"
          maxLength={maxDigits}
          style={{ fontSize: "16px", lineHeight: "1.5" }}
        />
      </div>
    </div>
  );
}
