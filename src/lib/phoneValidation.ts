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

export function sanitizeSubscriberDigits(value: string | undefined, maxDigits = 10) {
  return (value ?? "").replace(/\D/g, "").slice(0, maxDigits);
}

export function buildE164Phone(country: Country | undefined, subscriberDigits: string | undefined) {
  const codeDigits = getCallingCodeDigits(country);
  if (!codeDigits) return "";
  const subscriber = sanitizeSubscriberDigits(subscriberDigits, 10);
  return `+${codeDigits}${subscriber}`;
}

/**
 * Splits an input value into { codeDigits, restDigits }.
 *
 * - If the value already includes the selected calling code, it is removed from the front.
 * - Otherwise, returns empty restDigits (to avoid carrying over digits across country switches).
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

