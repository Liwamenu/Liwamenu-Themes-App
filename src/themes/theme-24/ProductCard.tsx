import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Star, Flame, Leaf } from "lucide-react";
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
  const hasCampaign = isCampaign && portion.campaignPrice != null && portion.campaignPrice > 0 && portion.campaignPrice < portion.price;

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
 * Reference-design grid card:
 *   round green-tinted product photo (top)
 *   bold black product name (2-line clamp)
 *   gray description (3-line clamp)
 *   thin divider
 *   green price (bottom-left, large)
 *
 * The 2-column grid is set up by MenuPage; this component only renders a
 * single tile and stays compact enough to live in either column.
 */
export const ProductCard = memo(function ProductCard({
  product,
  onSelect,
  isSpecialPriceActive,
  specialPriceName,
  formatPrice,
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
      {/* Top: round green-tinted product image */}
      <div className="product-image-wrap">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          loading="lazy"
        />
        {product.recommendation && (
          <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[hsl(var(--brand-green))] text-white flex items-center justify-center shadow-md">
            <Star className="w-3 h-3 fill-current" />
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="product-name">{product.name}</h3>

      {/* Description — only rendered when actually present, so cards with
          no description don't leave a vertical gap. */}
      {product.description && product.description.trim() && (
        <p className="product-desc">{product.description}</p>
      )}

      {/* Campaign / special badge + dietary indicators */}
      {(priceType !== "normal" || spicyLevel > 0 || isVegetarian) && (
        <div className="flex items-center gap-1.5 flex-wrap mt-2 justify-center">
          {priceType === "campaign" && (
            <span className="inline-block px-2 py-0.5 bg-campaign text-campaign-foreground text-[10px] font-bold uppercase tracking-wide rounded-full">
              {t("productCard.campaign")}
            </span>
          )}
          {priceType === "special" && (
            <span className="inline-block px-2 py-0.5 bg-special text-special-foreground text-[10px] font-bold uppercase tracking-wide rounded-full">
              {specialPriceName}
            </span>
          )}
          {spicyLevel > 0 &&
            [0, 1, 2].map((i) => (
              <Flame
                key={i}
                className="w-3.5 h-3.5"
                style={{
                  color:
                    i < spicyLevel
                      ? "hsl(var(--destructive))"
                      : "hsl(var(--muted-foreground))",
                  fill: i < spicyLevel ? "hsl(var(--destructive))" : "transparent",
                  opacity: i < spicyLevel ? 1 : 0.35,
                }}
              />
            ))}
          {isVegetarian && (
            <Leaf
              className="w-3.5 h-3.5"
              style={{ color: "hsl(var(--brand-green))", fill: "hsl(var(--brand-green))" }}
            />
          )}
        </div>
      )}

      {/* Divider */}
      <div className="product-divider" />

      {/* Price — centered, indigo */}
      <div className="flex flex-col items-center gap-0.5">
        <span
          className={cn(
            "product-price",
            priceType === "campaign" && "!text-[hsl(var(--campaign))]",
            priceType === "special" && "!text-[hsl(var(--special))]",
          )}
        >
          {formatPrice(displayPrice)}
        </span>
        {originalPrice && (
          <span className="text-xs text-muted-foreground line-through">
            {formatPrice(originalPrice)}
          </span>
        )}
        <ProductBadges product={product} className="justify-center" />
      </div>
    </motion.div>
  );
});
