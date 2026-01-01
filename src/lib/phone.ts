import { Country, getCountryCallingCode } from "react-phone-number-input";

export function getE164Prefix(country?: Country) {
  if (!country) return "";
  return `+${getCountryCallingCode(country)}`;
}

/**
 * Limits the digits AFTER the country calling code.
 * Example (TR): +90 5xx xxx xx xx -> keeps +90 and max 10 digits after it.
 */
export function limitPhoneAfterCallingCode(
  value: string | undefined,
  country: Country | undefined,
  maxDigitsAfterCode = 10,
) {
  if (!value) return value;

  const prefix = getE164Prefix(country);

  // Remove spaces / dashes, keep only + and digits.
  const normalized = value.replace(/(?!^)\+/g, "").replace(/[^\d+]/g, "");

  if (!prefix || !normalized.startsWith(prefix)) return normalized;

  const rest = normalized.slice(prefix.length).replace(/\D/g, "");
  return prefix + rest.slice(0, maxDigitsAfterCode);
}
