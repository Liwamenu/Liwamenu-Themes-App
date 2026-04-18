
## Root Cause

**Blank fields:** `ReservationModal.navigateToReceipt` writes data to `sessionStorage["reservationReceipt"]` then opens `/reservation-receipt` in a new tab with no query params. But `ReservationReceipt.tsx` reads everything from `searchParams.get(...)` — those are all empty, so every field renders blank.

Also: `sessionStorage` is per-tab, so even if the receipt page tried to read it, the new tab would have its own empty `sessionStorage` and wouldn't see what was written in the original tab.

**Unnecessary Back button:** Receipt opens in a new tab; `navigate(-1)` does nothing useful there. Closing the tab is the natural way back.

## Fix

### File: `src/components/menu/ReservationModal.tsx`
Change `navigateToReceipt` to pass data as URL query params (which survive the new-tab open), instead of sessionStorage:
```tsx
const params = new URLSearchParams({
  restaurantName: restaurant.name ?? "",
  restaurantAddress: restaurant.address ?? "",
  restaurantPhone: restaurant.phoneNumber ?? "",
  fullName: formData.fullName,
  phone: formData.phone,
  date: formData.date ? format(formData.date, "yyyy-MM-dd") : "",
  time: formData.time,
  guests: formData.guests.toString(),
  notes: formData.notes,
  confirmationCode: code,
  createdAt: new Date().toLocaleString(i18n.language === "en" ? "en-US" : "tr-TR"),
  lang: i18n.language,
});
window.open(`/reservation-receipt?${params.toString()}`, "_blank");
```
Remove the `sessionStorage.setItem(...)` line.

### File: `src/pages/ReservationReceipt.tsx`
- Remove the "Back" (`Geri Dön`) button and its `ArrowLeft` import / `useNavigate` import.
- Make the Print button full width (replace the two-button flex row with a single button container).

## Out of scope
- No theme changes (no theme overrides this page).
- No backend / i18n / sanitizer changes.
- TTL/expiry untouched.

## Files modified
1. `src/components/menu/ReservationModal.tsx` — switch to URL params, drop sessionStorage.
2. `src/pages/ReservationReceipt.tsx` — remove Back button, full-width Print.
