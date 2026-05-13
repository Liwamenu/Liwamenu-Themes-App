import { memo, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Leaf } from "lucide-react";
import { Product, Portion } from "@/types/restaurant";
import { useTranslation } from "react-i18next";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  isSpecialPriceActive: boolean;
  specialPriceName: string;
  formatPrice: (price: number) => string;
  /**
   * When `true`, the pen-writing animation fires immediately on mount
   * rather than waiting for the card to scroll into view. Set by the
   * accordion parent so that the moment a category expands, every
   * product in it starts writing at the same time — matching the user
   * intent "kategori açılınca hepsi birden yazılmaya başlasın".
   */
  writeImmediately?: boolean;
}

function getPriceDisplay(portion: Portion, isSpecialPriceActive: boolean, isCampaign: boolean) {
  const hasSpecial = isSpecialPriceActive && portion.specialPrice != null;
  const hasCampaign = isCampaign && portion.campaignPrice != null && portion.campaignPrice > 0 && portion.campaignPrice < portion.price;

  let displayPrice = portion.price;
  let originalPrice: number | null = null;
  let priceType: "normal" | "campaign" | "special" = "normal";

  if (hasSpecial) {
    displayPrice = portion.specialPrice!;
    originalPrice = portion.price;
    priceType = "special";
  } else if (hasCampaign) {
    displayPrice = portion.campaignPrice!;
    originalPrice = portion.price;
    priceType = "campaign";
  }

  return { displayPrice, originalPrice, priceType };
}

function getDietaryInfo(product: Product) {
  const p = product as unknown as { spicyLevel?: number; isVegetarian?: boolean };
  const level = typeof p.spicyLevel === "number" ? Math.max(0, Math.min(3, p.spicyLevel)) : 0;
  return { spicyLevel: level, isVegetarian: !!p.isVegetarian };
}

/**
 * Parchment menu-row card. Reference layout (from the supplied HTML):
 *
 *   <bold name>  . . . . . . . . . . . . . . . . . . . . . . <price>
 *   <small italic description in olive brown>
 *
 * No product photo, no rounded card surface — the row is rendered as
 * a single line of text on the parchment background, with a row of
 * dotted leaders bridging name to price. Description sits on the line
 * below in italic Cormorant Garamond. Optional campaign/special chip
 * + dietary glyphs trail the name inline.
 *
 * All styling lives in `theme.css` under `.theme-26 .menu-row *` —
 * this component just emits the right class names so the cascade
 * picks them up.
 */
export const ProductCard = memo(function ProductCard({
  product,
  onSelect,
  isSpecialPriceActive,
  specialPriceName,
  formatPrice,
  writeImmediately = false,
}: ProductCardProps) {
  const { t } = useTranslation();
  const firstPortion = product.portions?.[0];
  if (!firstPortion) return null;
  const { displayPrice, originalPrice, priceType } = getPriceDisplay(
    firstPortion,
    isSpecialPriceActive,
    !!product.isCampaign,
  );
  const { spicyLevel, isVegetarian } = getDietaryInfo(product);

  const handleClick = useCallback(() => {
    onSelect(product);
  }, [onSelect, product]);

  /* Pen-writing reveal — two firing modes:
   *
   *  1. `writeImmediately=true`  → fire on next animation frame.
   *     Used by the accordion in MenuPage: when a category opens, ALL
   *     of its products mount fresh with `writeImmediately`, so every
   *     product name kicks off its mask-wipe animation in the same
   *     frame. The user sees the whole category being penned at once.
   *
   *  2. `writeImmediately=false` → IntersectionObserver fallback.
   *     For places that don't manage their own visibility (search
   *     results, future flat lists) — each name reveals independently
   *     as it scrolls into view.
   *
   *  In both cases the animation runs once per mount; collapse+expand
   *  remounts the card (because the parent conditionally renders the
   *  expanded body), so the pen effect plays fresh on every reopen,
   *  which matches the user's "her tıkladığında yazılmaya başlasın"
   *  intent. */
  const nameRef = useRef<HTMLSpanElement | null>(null);
  const [hasWritten, setHasWritten] = useState(false);
  useEffect(() => {
    if (hasWritten) return;

    if (writeImmediately) {
      // requestAnimationFrame lets React paint the unwritten state
      // for exactly one frame before the class flips — without that
      // hop the CSS animation sometimes starts in its "to" state and
      // the wipe is missed entirely.
      const id = requestAnimationFrame(() => setHasWritten(true));
      return () => cancelAnimationFrame(id);
    }

    const el = nameRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setHasWritten(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHasWritten(true);
            observer.disconnect();
            return;
          }
        }
      },
      { threshold: 0.4, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasWritten, writeImmediately]);

  // Theme-26 prices are intentionally one tone (pure ink-black in
  // light mode, warm parchment in dark) — the campaign/special signal
  // is carried by the chip badge next to the name and the strikethrough
  // old-price beside the discounted figure, so coloring the price itself
  // would feel out of place against the printed-menu aesthetic.

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      exit={{ opacity: 0 }}
      whileTap={{ scale: 0.995 }}
      onClick={handleClick}
      className="menu-row"
      aria-label={product.name}
    >
      {/* Name . . . dots . . . price */}
      <div className="menu-row-line">
        <span
          ref={nameRef}
          className={`menu-row-name${hasWritten ? " is-written" : ""}`}
          // Once the pen-writing animation completes, clear the GPU
          // compositor layer hint. Without this, every product name
          // on a long menu keeps a will-change layer indefinitely,
          // which on mobile snowballs into noticeable memory pressure.
          onAnimationEnd={(e) => {
            if (e.animationName.startsWith("theme26-penWrite")) {
              (e.currentTarget as HTMLElement).style.willChange = "auto";
            }
          }}
        >
          {product.name}
          {(priceType !== "normal" || spicyLevel > 0 || isVegetarian) && (
            <span className="menu-row-chips">
              {priceType === "campaign" && (
                <span className="menu-row-chip is-campaign">
                  {t("productCard.campaign")}
                </span>
              )}
              {priceType === "special" && (
                <span className="menu-row-chip is-special">{specialPriceName}</span>
              )}
              {spicyLevel > 0 &&
                [0, 1, 2].map((i) => (
                  <Flame
                    key={i}
                    className="w-3 h-3 inline-block align-middle"
                    style={{
                      color:
                        i < spicyLevel
                          ? "hsl(var(--wax-red))"
                          : "hsl(var(--muted-foreground))",
                      fill: i < spicyLevel ? "hsl(var(--wax-red))" : "transparent",
                      opacity: i < spicyLevel ? 1 : 0.35,
                    }}
                  />
                ))}
              {isVegetarian && (
                <Leaf
                  className="w-3 h-3 inline-block align-middle"
                  style={{
                    color: "hsl(var(--forest))",
                    fill: "hsl(var(--forest))",
                  }}
                />
              )}
            </span>
          )}
        </span>
        <span className="menu-row-dots" aria-hidden="true" />
        <span className="menu-row-price">
          {formatPrice(displayPrice)}
          {originalPrice && (
            <span className="menu-row-old-price">{formatPrice(originalPrice)}</span>
          )}
        </span>
      </div>

      {/* Italic description in olive brown — only render when present so
          rows without descriptions don't leave a vertical gap. */}
      {product.description && product.description.trim() && (
        <small className="menu-row-desc">{product.description}</small>
      )}
    </motion.button>
  );
});
