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

  // Only extract rest digits if value starts with the correct country code
  // If it doesn't match, return empty restDigits (clean slate for country switch)
  const restDigits = digitsOnly.startsWith(codeDigits)
    ? digitsOnly.slice(codeDigits.length)
    : "";

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

/**
 * Validates that the phone number has exactly the required number of subscriber digits.
 * Returns true if valid, false if invalid.
 */
export function validatePhoneSubscriberDigits(
  value: string | undefined,
  country: Country | undefined,
  requiredDigits = 10,
): boolean {
  if (!value || !country) return false;
  const { restDigits } = splitDigitsAfterCallingCode(value, country);
  return restDigits.length === requiredDigits;
}

/**
 * Gets the current count of subscriber digits in the phone value.
 */
export function getSubscriberDigitCount(
  value: string | undefined,
  country: Country | undefined,
): number {
  if (!value || !country) return 0;
  const { restDigits } = splitDigitsAfterCallingCode(value, country);
  return restDigits.length;
}
