import type { TFunction } from "i18next";
import type { CartItem, RestaurantData } from "@/types/restaurant";

/**
 * Build a human-readable WhatsApp order message and the corresponding
 * `https://wa.me/<digits>?text=<encoded>` deep link. Backend WhatsApp-order
 * feature flag (`restaurant.whatsappOrder`) gates this entirely; this helper
 * only formats — the caller decides when to invoke it.
 *
 * Layout (all in the user's selected language via `t`):
 *
 *   🍽️ {restaurant.name}
 *   Greeting line.
 *
 *   👤 Müşteri:
 *   • Ad: {name}
 *   • Telefon: {phone}
 *   • Adres: {address}                ← only when provided
 *
 *   🛒 Sipariş:
 *   • {productName} ({portionName})
 *       ◦ {tagItemName} (+₺X)         ← repeated per selected tag
 *       Adet: {qty} × ₺{unit} = ₺{lineTotal}
 *
 *   💰 Toplam: ₺{total}
 *
 *   📝 Not: {orderNote}               ← only when provided
 *
 * No newlines are double-escaped — WhatsApp shows them as line breaks.
 */
export interface WhatsappOrderInput {
  restaurant: RestaurantData;
  items: CartItem[];
  customer: {
    name: string;
    phone: string;
    address?: string;
  };
  /**
   * Captured GPS for the courier — when present we add a Google Maps
   * "directions" link to the message so the courier can tap it from
   * WhatsApp and open turn-by-turn directions to the exact spot. The
   * customer's typed address still appears separately; the pin is a
   * complement, not a replacement.
   */
  location?: {
    latitude: number;
    longitude: number;
  };
  /** Localised name of the payment method the customer selected (e.g.
   *  "Nakit", "Kart", "Online Ödeme"). Shown on its own line so the
   *  courier knows whether to bring a card terminal. */
  paymentMethodName?: string;
  /** Final amount the customer agreed to pay — already accounts for paket
   *  discount, delivery fee, etc. computed by the checkout. The message
   *  intentionally hides the breakdown (restaurant request: only show the
   *  total). */
  total: number;
  orderNote?: string;
  /** i18n function bound to the active locale. */
  t: TFunction;
  /** Currency sign helper (defaults to ₺). */
  moneySign?: string;
}

function fmtPrice(value: number, sign: string): string {
  // Match the rest of the app's "₺ 132.00" style: 2 fraction digits.
  return `${sign} ${value.toFixed(2)}`;
}

function digitsOnly(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

/**
 * Returns the formatted message text. Separated from URL building so that
 * the caller can show a preview if they want, or unit-test the layout.
 */
export function buildWhatsappOrderMessage(input: WhatsappOrderInput): string {
  const { restaurant, items, customer, location, paymentMethodName, total, orderNote, t, moneySign = "₺" } = input;
  const lines: string[] = [];

  // Section bullet. We've cycled through a few options here:
  //   • emoji mix (🍽️ 👤 🛒 💰 📝) → fell back to "◆" on some clients
  //   • 🟦 large blue square (Unicode 12.0) → not in older WA Business fonts
  // The small blue diamond 🔹 is Unicode 6.0 (2010) and is present in
  // every WhatsApp Business build we've seen since. Keeps the same visual
  // weight as the previous square without the font-fallback risk.
  const HEADER = "🔹";

  lines.push(`${HEADER} *${restaurant.name}*`);
  lines.push(t("order.whatsappMsgGreeting"));
  lines.push("");

  // Customer block ----------------------------------------------------
  lines.push(`${HEADER} *${t("order.whatsappMsgCustomer")}*`);
  lines.push(`• ${t("order.whatsappMsgName")}: ${customer.name}`);
  lines.push(`• ${t("order.whatsappMsgPhone")}: ${customer.phone}`);
  if (customer.address && customer.address.trim()) {
    lines.push(`• ${t("order.whatsappMsgAddress")}: ${customer.address.trim()}`);
  }
  if (location) {
    // Google Maps "directions" deep link — opens the app on a phone with
    // turn-by-turn directions from the courier's current position to the
    // customer pin. `q=lat,lng` is the universally-supported fallback.
    const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    lines.push(`• ${t("order.whatsappMsgLocation")}: ${mapsUrl}`);
  }
  lines.push("");

  // Order items block. Compact, price-free layout (restaurant request):
  //   2x Kuzu Kuşbaşı
  //      3x Extra Ekmek
  //   1x Çoban Kavurma (Yarım Porsiyon)
  //      Bol acılı
  //
  // Per-line and per-tag prices are intentionally omitted — only the final
  // total is shown. The total already reflects any discount / delivery fee
  // computed by the checkout, so the restaurant sees the same number the
  // customer agreed to pay without needing a line-by-line breakdown.
  lines.push(`${HEADER} *${t("order.whatsappMsgOrder")}*`);
  for (const item of items) {
    const portionName = item.portion?.name;
    const productLabel = portionName ? `${item.product.name} (${portionName})` : item.product.name;
    lines.push(`${item.quantity}x ${productLabel}`);

    for (const tag of item.selectedTags || []) {
      const qtyPrefix = tag.quantity > 1 ? `${tag.quantity}x ` : "";
      lines.push(`   ${qtyPrefix}${tag.itemName}`);
    }
  }
  lines.push("");
  lines.push(`${HEADER} *${t("order.whatsappMsgTotal")}: ${fmtPrice(total, moneySign)}*`);

  // Payment method — courier needs to know cash vs card before heading out.
  if (paymentMethodName && paymentMethodName.trim()) {
    lines.push(`${HEADER} *${t("order.whatsappMsgPayment")}:* ${paymentMethodName.trim()}`);
  }

  // Optional customer note --------------------------------------------
  if (orderNote && orderNote.trim()) {
    lines.push("");
    lines.push(`${HEADER} *${t("order.whatsappMsgNote")}:* ${orderNote.trim()}`);
  }

  return lines.join("\n");
}

/**
 * Resolve the phone number to send the order to. Prefers the dedicated
 * `whatsappOrderPhone` field, but falls back to the public WhatsApp URL
 * (`socialLinks.whatsappUrl`, e.g. `https://wa.me/905339695761`) and then
 * to the restaurant's main `phoneNumber` so the button works today even
 * before the backend ships the dedicated order-intake field
 * (see WhatsApp_Order_Backend_Brief.md). When the backend lands, the first
 * branch always wins for restaurants that configured it.
 */
function resolveWhatsappPhone(r: RestaurantData): string {
  const direct = digitsOnly(r.whatsappOrderPhone);
  if (direct) return direct;
  const socialDigits = digitsOnly(r.socialLinks?.whatsappUrl ?? "");
  if (socialDigits) return socialDigits;
  return digitsOnly(r.phoneNumber);
}

/**
 * Build the `https://wa.me/<phone>?text=<encoded>` URL. Returns null when no
 * phone is configured anywhere on the restaurant — callers should hide the
 * button instead of opening a malformed URL.
 */
export function buildWhatsappOrderUrl(input: WhatsappOrderInput): string | null {
  const phone = resolveWhatsappPhone(input.restaurant);
  if (!phone) return null;
  const text = buildWhatsappOrderMessage(input);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
