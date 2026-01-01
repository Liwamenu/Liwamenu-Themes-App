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
  const prefix = getE164Prefix(country);
  if (!prefix) return value;

  // Normalize: keep only digits and '+' (single leading plus)
  const normalized = (value ?? "").replace(/(?!^)\+/g, "").replace(/[^\d+]/g, "");
  const digitsOnly = normalized.replace(/\D/g, "");

  const callingCodeDigits = prefix.replace(/\D/g, "");

  // If user typed/pasted with calling code, remove it; otherwise treat all digits as national part.
  const restDigits = digitsOnly.startsWith(callingCodeDigits)
    ? digitsOnly.slice(callingCodeDigits.length)
    : digitsOnly;

  return `+${callingCodeDigits}${restDigits.slice(0, maxDigitsAfterCode)}`;
}
