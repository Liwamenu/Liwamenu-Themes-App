# Fix phone validation per country

## Problem
The phone number `+968 97360742` (Oman) is correct — Omani mobile numbers are 8 digits. But the app currently requires **exactly 10 digits after the country code for every country**, hardcoded in:
- `src/components/phone/Phone10Field.tsx` (input `maxLength={10}`, slices to 10)
- `src/lib/phoneValidation.ts` (`requiredDigits = 10` default)
- `src/components/menu/CheckoutModal.tsx`, `ReservationModal.tsx`, `SurveyModal.tsx` (`sanitizeSubscriberDigits(..., 10)`)
- Error message "Please enter exactly 10 digits after the country code" (all 11 locales)

Subscriber length actually varies a lot (UK 10, Oman 8, UAE 9, France 9, US 10, Germany variable, etc.). A single hardcoded number can never be right globally.

## Solution
Use `libphonenumber-js` (already a dependency via `react-phone-number-input`) to validate per-country. It knows each country's valid mobile/landline length(s) and patterns.

### 1. New per-country helpers in `src/lib/phoneValidation.ts`
- `getMaxSubscriberDigits(country)` — returns the maximum national number length for that country (using `getExampleNumber` + metadata, fallback 15). Used to cap input length while typing.
- `validatePhoneForCountry(e164, country)` — uses `isValidPhoneNumber(e164, country)` from `libphonenumber-js`. Returns boolean.
- Keep old helpers but make them per-country-aware (no fixed 10).

### 2. Update `src/components/phone/Phone10Field.tsx`
- Rename internally is optional, keep filename for minimal diff.
- Replace hardcoded `10` with dynamic `maxDigits = getMaxSubscriberDigits(value.country)`.
- `maxLength` and slice operations both use `maxDigits`.
- Recompute when country changes; if current `subscriber` exceeds new max, trim it.

### 3. Update call sites
In `CheckoutModal.tsx`, `ReservationModal.tsx`, `SurveyModal.tsx`:
- Replace `sanitizeSubscriberDigits(next.subscriber, 10)` with the country-aware max.
- Replace the validation check (currently uses 10) with `validatePhoneForCountry(buildE164Phone(country, subscriber), country)`.
- On invalid, show the new error key `common.phoneError` with updated message (see below).

### 4. Update error message in all 11 locales
Change `common.phoneError` from "Please enter exactly 10 digits after the country code" to a country-agnostic message like:
- en: "Please enter a valid phone number for the selected country"
- and equivalent translations for ar, az, de, el, es, fr, it, ru, tr, zh.

## Files to modify
- `src/lib/phoneValidation.ts`
- `src/lib/phone.ts` (drop hardcoded 10 default)
- `src/components/phone/Phone10Field.tsx`
- `src/components/menu/CheckoutModal.tsx`
- `src/components/menu/ReservationModal.tsx`
- `src/components/menu/SurveyModal.tsx`
- `src/locales/{en,ar,az,de,el,es,fr,it,ru,tr,zh}/translation.json`

## Result
- Oman `+968 97360742` (8 digits) → valid.
- UAE `+971 5XXXXXXXX` (9 digits) → valid.
- US `+1 XXXXXXXXXX` (10 digits) → valid.
- Validation, input cap, and error messaging all driven per-country by `libphonenumber-js` — no hardcoded length anywhere.
