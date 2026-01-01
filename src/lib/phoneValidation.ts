import type { Country } from "react-phone-number-input";
import { getCountryCallingCode } from "react-phone-number-input";

/**
 * Normalizes a phone string to "digits only" (keeps a single leading '+', then digits).
 */
export function normalizePhoneRaw(value: string | undefined) {
  return (value ?? "").replace(/(?!^)\+/g, "").replace(/[^\d+]/g, "");
}

export function getCallingCodeDigits(country?: Country) {
  if (!country) return "";
  return String(getCountryCallingCode(country));
}

/**
 * Splits an input value into { codeDigits, restDigits }.
 *
 * - If the value already includes the selected calling code, it is removed from the front.
 * - Otherwise, all digits are treated as subscriber digits.
 */
export function splitDigitsAfterCallingCode(value: string | undefined, country?: Country) {
  const codeDigits = getCallingCodeDigits(country);
  const normalized = normalizePhoneRaw(value);
  const digitsOnly = normalized.replace(/\D/g, "");

  if (!codeDigits) {
    return { codeDigits: "", restDigits: digitsOnly };
  }

  const restDigits = digitsOnly.startsWith(codeDigits)
    ? digitsOnly.slice(codeDigits.length)
    : digitsOnly;

  return { codeDigits, restDigits };
}

/**
 * Returns E.164-like value: +{codeDigits}{subscriberDigitsLimited}
 */
export function toE164WithSubscriberLimit(
  value: string | undefined,
  country: Country | undefined,
  maxSubscriberDigits = 10,
) {
  const { codeDigits, restDigits } = splitDigitsAfterCallingCode(value, country);
  if (!codeDigits) return value;
  return `+${codeDigits}${restDigits.slice(0, maxSubscriberDigits)}`;
}
