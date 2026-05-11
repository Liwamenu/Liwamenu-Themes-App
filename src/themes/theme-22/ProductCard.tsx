import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Star, Flame, Leaf } from "lucide-react";
import { Product, Portion } from "@/types/restaurant";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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

function getDietaryInfo(product: Product) {
  const p = product as unknown as { spicyLevel?: number; isVegetarian?: boolean };
  const level = typeof p.spicyLevel === "number" ? Math.max(0, Math.min(3, p.spicyLevel)) : 0;
  return { spicyLevel: level, isVegetarian: !!p.isVegetarian };
}

/**
 * Sushi-menu row: round photo (left, optional) + script red name + amber
 * price on the same baseline + Nunito description below. Bottom border
 * is a dashed ink line so successive rows feel like calligraphy entries.
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
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      className="menu-row"
    >
      {/* Left: thin red marker bar — recommendations get an amber star */}
      <div className="relative shrink-0">
        <div className="w-1 h-12 rounded-full bg-[hsl(var(--sushi-red))]/40" />
        {product.recommendation && (
          <div className="absolute -top-1.5 -left-2 w-5 h-5 rounded-full bg-[hsl(var(--sushi-amber))] text-black flex items-center justify-center shadow-sm">
            <Star className="w-2.5 h-2.5 fill-current" />
          </div>
        )}
      </div>

      {/* Right: name + price + description */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="product-name flex-1 truncate">{product.name}</h3>
          <span
            className={cn(
              "product-price",
              priceType === "campaign" && "!text-[hsl(var(--sushi-red))]",
              priceType === "special" && "!text-[hsl(var(--sushi-red))]",
            )}
          >
            {formatPrice(displayPrice)}
          </span>
        </div>

        {originalPrice && (
          <div className="flex justify-end -mt-1">
            <span className="text-[11px] text-muted-foreground line-through">
              {formatPrice(originalPrice)}
            </span>
          </div>
        )}

        {product.description && (
          <p className="product-desc line-clamp-2">{product.description}</p>
        )}

        {/* Tag chips: campaign / special / dietary */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
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
          {(spicyLevel > 0 || isVegetarian) && (
            <div className="flex items-center gap-1">
              {spicyLevel > 0 &&
                [0, 1, 2].map((i) => (
                  <Flame
                    key={i}
                    className="w-3.5 h-3.5"
                    style={{
                      color: i < spicyLevel ? "hsl(var(--sushi-red))" : "hsl(var(--muted-foreground))",
                      fill: i < spicyLevel ? "hsl(var(--sushi-red))" : "transparent",
                      opacity: i < spicyLevel ? 1 : 0.35,
                    }}
                  />
                ))}
              {isVegetarian && (
                <Leaf
                  className="w-3.5 h-3.5"
                  style={{ color: "hsl(var(--success))", fill: "hsl(var(--success))" }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
