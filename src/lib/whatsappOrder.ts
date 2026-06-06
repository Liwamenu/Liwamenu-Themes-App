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
  /** Cart subtotal BEFORE discount/delivery. When omitted the message
   *  only shows the final total — fine for restaurants that don't apply
   *  paket discounts. */
  subtotal?: number;
  /** Discount applied (positive amount). When > 0 we render an itemised
   *  "Ara Toplam → İndirim → Toplam" breakdown so the restaurant sees
   *  why the final total is below subtotal. */
  discountAmount?: number;
  /** Discount percentage, shown next to the amount for clarity. */
  discountRate?: number;
  /** Delivery fee added on top, displayed as a separate line. */
  deliveryFee?: number;
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
  const {
    restaurant,
    items,
    customer,
    location,
    subtotal,
    discountAmount,
    discountRate,
    deliveryFee,
    total,
    orderNote,
    t,
    moneySign = "₺",
  } = input;
  const lines: string[] = [];

  // Section bullet — used everywhere a header would otherwise carry a
  // category emoji. The blue square (🟦) renders consistently across the
  // WhatsApp clients restaurants use; the previous mix (🍽️ 👤 🛒 💰 📝)
  // fell back to "◆" / square-with-hole on Android WhatsApp Business.
  const HEADER = "🟦";

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

  // Order items block -------------------------------------------------
  lines.push(`${HEADER} *${t("order.whatsappMsgOrder")}*`);
  for (const item of items) {
    const portionName = item.portion?.name;
    const productLabel = portionName ? `${item.product.name} (${portionName})` : item.product.name;
    lines.push(`• ${productLabel}`);

    // Selected tag items, each on its own indented line.
    for (const tag of item.selectedTags || []) {
      const priceFragment =
        typeof tag.price === "number" && tag.price !== 0
          ? ` (${tag.price > 0 ? "+" : ""}${fmtPrice(Math.abs(tag.price) * tag.quantity, moneySign)})`
          : "";
      const qtyFragment = tag.quantity > 1 ? ` × ${tag.quantity}` : "";
      lines.push(`    ◦ ${tag.itemName}${qtyFragment}${priceFragment}`);
    }

    const unitWithTags = item.portion.price +
      (item.selectedTags || []).reduce((s, tg) => s + tg.price * tg.quantity, 0);
    const lineTotal = unitWithTags * item.quantity;
    lines.push(
      `    ${t("order.whatsappMsgQuantity")}: ${item.quantity} × ${fmtPrice(unitWithTags, moneySign)} = ${fmtPrice(lineTotal, moneySign)}`,
    );
  }
  lines.push("");

  // Total — itemised when there's a discount or delivery fee so the
  // restaurant can audit the price; bare line otherwise.
  const hasBreakdown =
    (typeof subtotal === "number" && Math.abs(subtotal - total) > 0.001) ||
    (typeof discountAmount === "number" && discountAmount > 0) ||
    (typeof deliveryFee === "number" && deliveryFee > 0);
  if (hasBreakdown && typeof subtotal === "number") {
    lines.push(`${HEADER} *${t("order.subtotal")}: ${fmtPrice(subtotal, moneySign)}*`);
    if (typeof discountAmount === "number" && discountAmount > 0) {
      const ratePart = typeof discountRate === "number" && discountRate > 0
        ? ` (%${discountRate})`
        : "";
      lines.push(`${HEADER} *${t("order.onlineDiscount")}${ratePart}: -${fmtPrice(discountAmount, moneySign)}*`);
    }
    if (typeof deliveryFee === "number" && deliveryFee > 0) {
      lines.push(`${HEADER} *${t("order.deliveryFee")}: ${fmtPrice(deliveryFee, moneySign)}*`);
    }
  }
  lines.push(`${HEADER} *${t("order.whatsappMsgTotal")}: ${fmtPrice(total, moneySign)}*`);

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
