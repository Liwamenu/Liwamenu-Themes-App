import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Star, Flame, Leaf } from "lucide-react";
import { Product, Portion } from "@/types/restaurant";
import { cn } from "@/lib/utils";
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
  const hasCampaign = isCampaign && portion.campaignPrice != null;

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

/**
 * Reads optional `spicyLevel` (0–3) and `isVegetarian` from the product.
 * Backend may not provide them; the UI degrades gracefully (no icons).
 */
function getDietaryInfo(product: Product) {
  const p = product as unknown as { spicyLevel?: number; isVegetarian?: boolean };
  const level = typeof p.spicyLevel === "number" ? Math.max(0, Math.min(3, p.spicyLevel)) : 0;
  return { spicyLevel: level, isVegetarian: !!p.isVegetarian };
}

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
  const { displayPrice, originalPrice, priceType } = getPriceDisplay(firstPortion, isSpecialPriceActive, !!product.isCampaign);
  const { spicyLevel, isVegetarian } = getDietaryInfo(product);

  const handleClick = useCallback(() => {
    onSelect(product);
  }, [onSelect, product]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -36, rotate: -8 }}
      whileInView={{
        opacity: 1,
        y: 0,
        rotate: [-8, 6, -3, 2, -1, 0],
        transition: {
          duration: 1.1,
          ease: "easeOut",
          rotate: {
            duration: 1.1,
            ease: "easeOut",
            times: [0, 0.35, 0.55, 0.75, 0.9, 1],
          },
          y: { duration: 0.55, ease: "easeOut" },
          opacity: { duration: 0.3 },
        },
      }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -40px 0px" }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      style={{ transformOrigin: "top center" }}
      className="menu-row cursor-pointer hover:bg-card/40 rounded-lg transition-colors px-2 -mx-2"
    >
      {/* Left: round image */}
      <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden bg-secondary shrink-0">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        {product.recommendation && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[hsl(var(--gold))] text-[hsl(var(--background))] flex items-center justify-center shadow-md">
            <Star className="w-2.5 h-2.5 fill-current" />
          </div>
        )}
      </div>

      {/* Middle: title + description */}
      <div className="min-w-0">
        <h3 className="product-name font-bold text-[hsl(var(--gold))] text-[15px] leading-tight line-clamp-1 break-words">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-muted-foreground text-[12px] leading-snug line-clamp-2 mt-1">
            {product.description}
          </p>
        )}
        {priceType === "campaign" && (
          <span className="inline-block mt-1 px-1.5 py-0.5 bg-campaign text-campaign-foreground text-[9px] font-bold uppercase tracking-wide rounded">
            {t("productCard.campaign")}
          </span>
        )}
        {priceType === "special" && (
          <span className="inline-block mt-1 px-1.5 py-0.5 bg-special text-special-foreground text-[9px] font-bold uppercase tracking-wide rounded">
            {specialPriceName}
          </span>
        )}
      </div>

      {/* Right: dietary indicators + price */}
      <div className="flex flex-col items-end gap-1 shrink-0 min-w-0">
        {(spicyLevel > 0 || isVegetarian) && (
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <Flame
                key={i}
                className="w-3.5 h-3.5"
                style={{
                  color: i < spicyLevel ? "hsl(var(--spice))" : "hsl(var(--spice-off))",
                  fill: i < spicyLevel ? "hsl(var(--spice))" : "transparent",
                }}
              />
            ))}
            {isVegetarian && (
              <Leaf className="w-3.5 h-3.5 ml-0.5" style={{ color: "hsl(var(--veg))", fill: "hsl(var(--veg))" }} />
            )}
          </div>
        )}

        <div className="flex flex-col items-end leading-none">
          {originalPrice && (
            <span className="text-[10px] text-muted-foreground line-through whitespace-nowrap">
              {formatPrice(originalPrice)}
            </span>
          )}
          <span
            className={cn(
              "product-price text-[20px] font-bold whitespace-nowrap",
              priceType === "campaign" ? "text-campaign" : priceType === "special" ? "text-special" : "text-foreground"
            )}
          >
            {formatPrice(displayPrice)}
          </span>
        </div>
      </div>
    </motion.div>
  );
});
