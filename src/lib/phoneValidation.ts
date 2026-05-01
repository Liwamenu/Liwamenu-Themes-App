import type { Country } from "react-phone-number-input";
import { getCountryCallingCode } from "react-phone-number-input";
import { isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Per-country maximum subscriber digit lengths.
 * Falls back to 15 (ITU max) for unknown countries.
 */
const SUBSCRIBER_MAX_DIGITS: Partial<Record<string, number>> = {
  US: 10, CA: 10, GB: 10, AU: 9, DE: 11, FR: 9, IT: 10,
  ES: 9, PT: 9, NL: 9, BE: 9, AT: 10, CH: 9, SE: 9,
  NO: 8, DK: 8, FI: 9, PL: 9, CZ: 9, RO: 9, HU: 9,
  GR: 10, IE: 9, TR: 10, RU: 10, UA: 9, IN: 10, PK: 10,
  BD: 10, CN: 11, JP: 10, KR: 10, TW: 9, HK: 8, SG: 8,
  MY: 10, TH: 9, VN: 9, PH: 10, ID: 12, BR: 11, MX: 10,
  AR: 10, CO: 10, CL: 9, PE: 9, VE: 10, ZA: 9, NG: 10,
  KE: 9, EG: 10, MA: 9, TN: 8, DZ: 9, SA: 9, AE: 9,
  QA: 8, KW: 8, BH: 8, OM: 8, JO: 9, LB: 8, IQ: 10,
  IL: 9, NZ: 9, IS: 7, LU: 9, MT: 8, CY: 8, LV: 8,
  LT: 8, EE: 8, HR: 9, SI: 8, SK: 9, BG: 9, RS: 9,
};

/**
 * Returns the maximum number of subscriber digits (after country code) for a given country.
 */
export function getMaxSubscriberDigits(country?: Country): number {
  if (!country) return 15;
  return SUBSCRIBER_MAX_DIGITS[country] ?? 15;
}

/**
 * Validates a phone number using libphonenumber-js for the given country.
 */
export function validatePhoneForCountry(
  e164: string | undefined,
  country: Country | undefined,
): boolean {
  if (!e164 || !country) return false;
  try {
    return isValidPhoneNumber(e164, country);
  } catch {
    return false;
  }
}

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

export function sanitizeSubscriberDigits(value: string | undefined, maxDigits = 15) {
  return (value ?? "").replace(/\D/g, "").slice(0, maxDigits);
}

export function buildE164Phone(country: Country | undefined, subscriberDigits: string | undefined) {
  const codeDigits = getCallingCodeDigits(country);
  if (!codeDigits) return "";
  const maxDigits = getMaxSubscriberDigits(country as Country);
  const subscriber = sanitizeSubscriberDigits(subscriberDigits, maxDigits);
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
  maxSubscriberDigits?: number,
) {
  const max = maxSubscriberDigits ?? getMaxSubscriberDigits(country ?? undefined);
  const { codeDigits, restDigits } = splitDigitsAfterCallingCode(value, country);
  if (!codeDigits) return value;
  return `+${codeDigits}${restDigits.slice(0, max)}`;
}

/**
 * @deprecated Use validatePhoneForCountry instead.
 */
export function validatePhoneSubscriberDigits(
  value: string | undefined,
  country: Country | undefined,
  requiredDigits?: number,
): boolean {
  if (!value || !country) return false;
  return validatePhoneForCountry(value, country);
}

