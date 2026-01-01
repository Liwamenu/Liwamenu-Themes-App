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
  let restDigits = "";
  
  if (digitsOnly.startsWith(callingCodeDigits)) {
    restDigits = digitsOnly.slice(callingCodeDigits.length);
  } else {
    // Check if the value might be from a different country code - if so, don't include those digits
    // Only include digits that don't look like a country code (typically > 3 digits remaining after potential code)
    const potentialRest = digitsOnly;
    // If the number is just a country code (1-4 digits), don't add it as rest digits
    if (potentialRest.length > 4) {
      restDigits = potentialRest;
    }
    // Otherwise restDigits stays empty - just return the prefix
  }

  return `+${callingCodeDigits}${restDigits.slice(0, maxDigitsAfterCode)}`;
}
