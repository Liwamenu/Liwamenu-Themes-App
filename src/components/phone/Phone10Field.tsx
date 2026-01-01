import { useMemo, useState } from "react";
import type { Country } from "react-phone-number-input";
import { getCountries, getCountryCallingCode } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [open, setOpen] = useState(false);
  const countries = useMemo(() => getCountries(), []);
  const callingCode = useMemo(() => getCountryCallingCode(value.country), [value.country]);

  return (
    <div className={cn("grid grid-cols-[160px_1fr] gap-2", className)}>
      {/* Country selector with flag */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            className="h-12 rounded-[3px] border border-border bg-background px-3 flex items-center gap-2 hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CountryFlag country={value.country} />
            <span className="text-sm flex-1 text-left">
              {value.country} +{callingCode}
            </span>
            <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 z-[9999]" align="start">
          <div 
            className="h-[300px] overflow-y-auto overscroll-contain touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="p-1">
              {countries.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left",
                    c === value.country && "bg-accent"
                  )}
                  onClick={() => {
                    onChange({ country: c, subscriber: value.subscriber });
                    setOpen(false);
                  }}
                >
                  <CountryFlag country={c} />
                  <span>{c} +{getCountryCallingCode(c)}</span>
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Phone number input (10 digits) */}
      <div className="h-12 rounded-[3px] border border-border bg-background px-3 flex items-center">
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
