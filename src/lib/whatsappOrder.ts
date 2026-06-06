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
  const { restaurant, items, customer, total, orderNote, t, moneySign = "₺" } = input;
  const lines: string[] = [];

  lines.push(`🍽️ *${restaurant.name}*`);
  lines.push(t("order.whatsappMsgGreeting"));
  lines.push("");

  // Customer block ----------------------------------------------------
  lines.push(`👤 *${t("order.whatsappMsgCustomer")}*`);
  lines.push(`• ${t("order.whatsappMsgName")}: ${customer.name}`);
  lines.push(`• ${t("order.whatsappMsgPhone")}: ${customer.phone}`);
  if (customer.address && customer.address.trim()) {
    lines.push(`• ${t("order.whatsappMsgAddress")}: ${customer.address.trim()}`);
  }
  lines.push("");

  // Order items block -------------------------------------------------
  lines.push(`🛒 *${t("order.whatsappMsgOrder")}*`);
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

  // Total -------------------------------------------------------------
  lines.push(`💰 *${t("order.whatsappMsgTotal")}: ${fmtPrice(total, moneySign)}*`);

  // Optional customer note --------------------------------------------
  if (orderNote && orderNote.trim()) {
    lines.push("");
    lines.push(`📝 *${t("order.whatsappMsgNote")}:* ${orderNote.trim()}`);
  }

  return lines.join("\n");
}

/**
 * Build the `https://wa.me/<phone>?text=<encoded>` URL. Returns null when no
 * phone is configured — callers should disable the button instead of opening
 * a malformed URL.
 */
export function buildWhatsappOrderUrl(input: WhatsappOrderInput): string | null {
  const phone = digitsOnly(input.restaurant.whatsappOrderPhone);
  if (!phone) return null;
  const text = buildWhatsappOrderMessage(input);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
