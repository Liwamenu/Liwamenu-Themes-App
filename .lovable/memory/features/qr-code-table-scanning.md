---
name: qr-code-table-scanning
description: QR scanner for table changes via html5-qrcode; tableNumber persisted to localStorage with 2h TTL per tenant
type: feature
---
QR code scanning for table changes implemented using html5-qrcode library. Allows users to scan table QR codes during checkout to update table number. QR code format: https://${config.tenant}.liwamenu.com?restaurantId=${config.restaurantId}&tableNumber=${i}. Scanner opens device camera with error handling for permissions. Integrates with useRestaurantStore to update table number dynamically.

Persistence: `tableNumber` is persisted to `localStorage` under key `restaurant-table-<tenant>` with a 2-hour TTL (matching cart/order session). Priority on init: URL `?tableNumber=` param > persisted localStorage > backend default. `setTableNumber` writes-through to localStorage; empty value removes the key. A periodic eviction timer clears the key + in-memory store after 2h.
