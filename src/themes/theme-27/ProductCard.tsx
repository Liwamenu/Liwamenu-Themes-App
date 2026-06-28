import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Flame, Leaf } from "lucide-react";
import { Product, Portion } from "@/types/restaurant";
import { resolveActiveBasePrice } from "@/lib/priceList";
import { cn } from "@/lib/utils";
import { ProductBadges } from "@/components/menu/ProductBadges";
import { useTranslation } from "react-i18next";
import { getProductImageSrc, handleProductImageError } from "@/lib/productImage";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  isSpecialPriceActive: boolean;
  specialPriceName: string;
  formatPrice: (price: number) => string;
}

function getPriceDisplay(portion: Portion, isSpecialPriceActive: boolean, isCampaign: boolean) {
  const hasSpecial = isSpecialPriceActive && portion.specialPrice != null;
  const hasCampaign =
    isCampaign &&
    portion.campaignPrice != null &&
    portion.campaignPrice > 0 &&
    portion.campaignPrice < portion.price;

  let displayPrice = resolveActiveBasePrice(portion);
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
 * Warung-style horizontal row:
 *   ┌────────────────────────────────────────────┐
 *   │  lime "Tag/Category" line                  │
 *   │  Bold white product name (2-line clamp)    │   [SQUARE IMG]
 *   │  Short description (1-line clamp)          │
 *   │  ₺ price (lime, large)                     │
 *   └────────────────────────────────────────────┘
 *
 * Single-column full-width rows on a dark slate body. Stars and prep
 * time are intentionally omitted per design — campaign / special /
 * dietary indicators float as compact badges on the image corner so
 * the text column stays clean.
 */
export const ProductCard = memo(function ProductCard({
  product,
  onSelect,
  isSpecialPriceActive,
  specialPriceName,
  formatPrice,
}: ProductCardProps) {
  const { t } = useTranslation();
  const handleClick = useCallback(() => {
    onSelect(product);
  }, [onSelect, product]);

  const firstPortion = product.portions?.[0];
  if (!firstPortion) return null;
  const { displayPrice, originalPrice, priceType } = getPriceDisplay(
    firstPortion,
    isSpecialPriceActive,
    !!product.isCampaign,
  );
  const { spicyLevel, isVegetarian } = getDietaryInfo(product);

  // Top-left tag line above the product name. We prefer campaign /
  // special call-outs (those win on visibility); otherwise we fall back
  // to the product's subcategory name when present.
  const tagLine =
    priceType === "campaign"
      ? t("productCard.campaign")
      : priceType === "special"
        ? specialPriceName
        : product.subCategoryName || "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="menu-row"
    >
      {/* Text column — left side */}
      <div className="menu-row-text">
        {tagLine && <div className="menu-row-tag">{tagLine}</div>}
        <h3 className="product-name">{product.name}</h3>
        {product.description && product.description.trim() && (
          <p className="product-desc">{product.description}</p>
        )}

        <div className="menu-row-meta">
          <span
            className={cn(
              "product-price",
              priceType === "campaign" && "is-campaign",
              priceType === "special" && "is-special",
            )}
          >
            {formatPrice(displayPrice)}
          </span>
          {originalPrice && (
            <span className="product-price-old">{formatPrice(originalPrice)}</span>
          )}

          {/* Inline dietary indicators — kept subtle so the meta row reads
              as "price + a couple of dots", not a wall of badges. */}
          {spicyLevel > 0 &&
            [0, 1, 2].map((i) => (
              <Flame
                key={i}
                className="w-3 h-3"
                style={{
                  color:
                    i < spicyLevel
                      ? "hsl(var(--destructive))"
                      : "hsl(0 0% 50%)",
                  fill: i < spicyLevel ? "hsl(var(--destructive))" : "transparent",
                  opacity: i < spicyLevel ? 1 : 0.35,
                }}
              />
            ))}
          {isVegetarian && (
            <Leaf
              className="w-3 h-3"
              style={{
                color: "hsl(var(--brand-green))",
                fill: "hsl(var(--brand-green))",
              }}
            />
          )}

          <ProductBadges product={product} className="ml-auto justify-end min-w-0" />
        </div>
      </div>

      {/* Image — right side */}
      <div className="product-image-wrap">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          loading="lazy"
        />
      </div>
    </motion.div>
  );
});
