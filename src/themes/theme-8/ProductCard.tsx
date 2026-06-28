import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Product, Portion } from "@/types/restaurant";
import { resolveActiveBasePrice } from "@/lib/priceList";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { getProductImageSrc, handleProductImageError } from "@/lib/productImage";
import { ProductBadges } from "@/components/menu/ProductBadges";

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

/* Mirror of theme-7's blob — flipped horizontally because the image is on the right. */
const BLOB_RADIUS = "70% 30% 30% 70% / 50% 30% 70% 50%";

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

  const handleClick = useCallback(() => {
    onSelect(product);
  }, [onSelect, product]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      className="group bg-card rounded-[5px] shadow-card hover:shadow-card-hover transition-shadow duration-300 cursor-pointer flex items-stretch gap-4 py-[3px] px-3"
    >
      {/* Content — title at top, price at bottom (image is on the right) */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="min-w-0">
          <h3 className="text-black dark:text-white text-[16px] leading-tight line-clamp-2">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-muted-foreground text-[14px] leading-snug line-clamp-2 mt-1">
              {product.description}
            </p>
          )}
        </div>
        {/* Price (left) + calorie/prep badges pinned to the opposite (right)
            side of the same band. Badges render only when the backend supplied
            a positive value (graceful). */}
        <div className="flex items-end justify-between gap-2 min-w-0">
          <div className="flex flex-col items-start gap-0.5 min-w-0 max-w-full">
            {originalPrice && (
              <span className="text-[12px] text-muted-foreground line-through whitespace-nowrap truncate max-w-full">
                {formatPrice(originalPrice)}
              </span>
            )}
            <span className="font-bold text-black text-[17px] whitespace-nowrap truncate max-w-full">
              {formatPrice(displayPrice)}
            </span>
          </div>
          <ProductBadges product={product} className="justify-end min-w-0" />
        </div>
      </div>

      {/* Image — organic blob shape, RIGHT side */}
      <div
        className="relative w-[120px] h-[120px] flex-shrink-0 overflow-hidden bg-muted"
        style={{ borderRadius: BLOB_RADIUS }}
      >
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {product.recommendation && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-primary text-primary-foreground text-[9px] font-semibold rounded-full shadow-sm">
            <Star className="w-2 h-2 fill-current" />
            <span>{t("productCard.recommended")}</span>
          </div>
        )}

        {priceType === "campaign" && (
          <div className={cn(
            "absolute px-1.5 py-0.5 bg-campaign text-campaign-foreground text-[9px] font-semibold rounded-full shadow-sm",
            product.recommendation ? "bottom-2 right-2" : "top-2 right-2"
          )}>
            {t("productCard.campaign")}
          </div>
        )}

        {priceType === "special" && (
          <div className={cn(
            "absolute px-1.5 py-0.5 bg-special text-special-foreground text-[9px] font-semibold rounded-full shadow-sm",
            product.recommendation ? "bottom-2 right-2" : "top-2 right-2"
          )}>
            {specialPriceName}
          </div>
        )}
      </div>
    </motion.div>
  );
});
