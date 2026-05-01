import { Country, getCountryCallingCode } from "react-phone-number-input";
import { toE164WithSubscriberLimit, getMaxSubscriberDigits } from "@/lib/phoneValidation";

export function getE164Prefix(country?: Country) {
  if (!country) return "";
  return `+${getCountryCallingCode(country)}`;
}

export function limitPhoneAfterCallingCode(
  value: string | undefined,
  country: Country | undefined,
  maxDigitsAfterCode?: number,
) {
  return toE164WithSubscriberLimit(value, country, maxDigitsAfterCode ?? getMaxSubscriberDigits(country ?? undefined));
}
