

## Problem
Several hardcoded (untranslated) strings exist across the app, causing language inconsistency when the user switches languages.

## Found Issues

1. **Order status labels in `OrderReceipt.tsx` (lines 37-44)** -- "Pending", "Accepted", "Preparing", "On The Way", "Delivered", "Cancelled" are hardcoded in English. Translation keys (`status.pending`, `status.confirmed`, etc.) already exist in all locale files but are not being used.

2. **"Order not found" in `OrderReceipt.tsx` (line 71)** -- Hardcoded English fallback text.

3. **"Kapat" in `SurveyModal.tsx` (line 251)** -- Hardcoded Turkish word for "Close" in the screen-reader label instead of using `t("common.close")`.

4. **"metre" fallback in `CheckoutModal.tsx` (line 161)** -- Uses `defaultValue: "metre"` but the `common.meters` key is missing from all locale files.

## Fix

### 1. `src/components/menu/OrderReceipt.tsx`
- Remove the static `STATUS_LABELS` object
- Make `getStatusConfig` accept a `t` function and use `t("status.pending")`, `t("status.confirmed")`, `t("status.preparing")`, `t("status.ready")`, `t("status.delivered")`, `t("status.cancelled")` for labels
- Replace `"Order not found"` with `t("errors.loadFailed")` or a new key

### 2. `src/components/menu/SurveyModal.tsx`
- Line 251: Replace `"Kapat"` with `{t("common.close")}`

### 3. `src/components/menu/CheckoutModal.tsx`
- Line 161: Remove the `defaultValue` and add the `common.meters` key to all 11 locale files

### 4. Add missing translation keys to all 11 locale files
- Add `"meters"` key under `common` section in all locale files (tr, en, de, fr, it, es, ar, az, ru, el, zh)

### Files to modify
- `src/components/menu/OrderReceipt.tsx`
- `src/components/menu/SurveyModal.tsx`
- `src/components/menu/CheckoutModal.tsx`
- All 11 `src/locales/*/translation.json` files (add `common.meters`)

