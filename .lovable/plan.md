## Answer

The survey gate in `src/components/menu/SurveyModal.tsx` (line 165) is:

```ts
const hasCompletedOrder = orders.some(order => order.status === 'delivered');
```

It is **not** checking "verified" or "paid" — it only checks that at least one order in the local Zustand `useOrder` store has `status === 'delivered'`. So:

- Placing an order is not enough.
- The restaurant (backend) must mark it delivered, AND the FCM `order_status_changed` event must reach this browser to update the local order's status to `delivered`.
- Local order history also expires after 2h (TTL), so older delivered orders disappear.

## Why your feedback is still blocked

One of these is true:

1. Your order is still in an earlier status (`pending` / `preparing` / `ready` / `onTheWay`) — not yet `delivered`.
2. The status update FCM never arrived (Lovable preview iframe blocks FCM token retrieval per `mem://constraints/lovable-preview-limitations`, and notification permission may be denied).
3. The order was placed >2h ago and the TTL evicted it from `localStorage`.

## Options to fix

Pick one (I'll implement after you choose):

**A. Keep current rule (delivered only) — no code change.** Just wait for the restaurant to mark the order delivered on a non-preview URL where FCM works.

**B. Relax the rule — allow feedback if any order exists in local history (any status).** One-line change on line 165:

```ts
const hasCompletedOrder = orders.length > 0;
```

**C. Relax to "order placed and not cancelled".** Allow any status except `cancelled`:

```ts
const hasCompletedOrder = orders.some(o => o.status !== 'cancelled');
```

**D. Add a manual fallback — if FCM didn't arrive but the order is older than X minutes, treat as delivered for survey purposes.** More code; bypasses the FCM-in-preview problem.

## Files that would change (for B/C/D)

- `src/components/menu/SurveyModal.tsx` — line 165 condition.
- `src/themes/theme-5/SurveyModal.tsx` — if it has its own copy (theme-3 and theme-4 just re-export the main one, so they're covered automatically).

## Out of scope

- No backend / FCM / type changes.
- No UI changes to the modal itself.  
  
Go with plan B!