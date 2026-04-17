
## Issue

The Order Status progress block in `src/components/menu/OrderReceipt.tsx` (line 260) is gated by `order.orderType === "online"`. Your test order is `inPerson` (per the network log), so the entire status section + zigzag tracker is skipped.

## Fix

**File:** `src/components/menu/OrderReceipt.tsx` (line 260)

Remove the `order.orderType === "online"` condition wrapping the Order Status block so the status tracker renders for both in-person and online orders.

Before:
```tsx
{order.orderType === "online" && (
  <div className="p-6 border-b border-dashed border-border">
    <h3>{t("orderReceipt.orderStatus")}</h3>
    {isCancelled ? (...) : <StatusZigzag ... />}
  </div>
)}
```

After:
```tsx
<div className="p-6 border-b border-dashed border-border">
  <h3>{t("orderReceipt.orderStatus")}</h3>
  {isCancelled ? (...) : <StatusZigzag ... />}
</div>
```

The "Customer Info (delivery details)" block on line 276 stays gated to online — that one is correct, since in-person orders don't have customer info.

## Out of scope
- No changes to status enum, FCM mapping, or theme files (they all import this same `OrderReceipt`).
- The `forwardRef` console warning is unrelated and pre-existing; not touching unless it reappears.

## Files modified
1. `src/components/menu/OrderReceipt.tsx` — unwrap status block.
