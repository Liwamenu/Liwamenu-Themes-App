import { Country, getCountryCallingCode } from "react-phone-number-input";
import { toE164WithSubscriberLimit } from "@/lib/phoneValidation";

export function getE164Prefix(country?: Country) {
  if (!country) return "";
  return `+${getCountryCallingCode(country)}`;
}

/**
 * Limits the digits AFTER the country calling code.
 * Requirement: allow max (and UI-enforce) 10 subscriber digits regardless of calling code length.
 */
export function limitPhoneAfterCallingCode(
  value: string | undefined,
  country: Country | undefined,
  maxDigitsAfterCode = 10,
) {
  return toE164WithSubscriberLimit(value, country, maxDigitsAfterCode);
}
