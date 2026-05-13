import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
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

/* Organic blob shape — asymmetric corner radii give a leaf/petal feel. */
const BLOB_RADIUS = "30% 70% 70% 30% / 30% 50% 50% 70%";

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
      className="group bg-card rounded-3xl shadow-card hover:shadow-card-hover transition-shadow duration-300 cursor-pointer flex items-stretch gap-4 py-[3px] px-3"
    >
      {/* Image — organic blob shape */}
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
          <div className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-primary text-primary-foreground text-[9px] font-semibold rounded-full shadow-sm">
            <Star className="w-2 h-2 fill-current" />
            <span>{t("productCard.recommended")}</span>
          </div>
        )}

        {priceType === "campaign" && (
          <div className={cn(
            "absolute px-1.5 py-0.5 bg-campaign text-campaign-foreground text-[9px] font-semibold rounded-full shadow-sm",
            product.recommendation ? "bottom-2 left-2" : "top-2 left-2"
          )}>
            {t("productCard.campaign")}
          </div>
        )}

        {priceType === "special" && (
          <div className={cn(
            "absolute px-1.5 py-0.5 bg-special text-special-foreground text-[9px] font-semibold rounded-full shadow-sm",
            product.recommendation ? "bottom-2 left-2" : "top-2 left-2"
          )}>
            {specialPriceName}
          </div>
        )}
      </div>

      {/* Content — title at top, price at bottom (3px from card edges via outer py-[3px]) */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="min-w-0">
          <h3 className="font-bold text-black dark:text-white text-[20px] leading-tight line-clamp-2">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-muted-foreground text-[14px] leading-snug line-clamp-2 mt-1">
              {product.description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5 min-w-0 max-w-full">
          {originalPrice && (
            <span className="text-[12px] text-muted-foreground line-through whitespace-nowrap truncate max-w-full">
              {formatPrice(originalPrice)}
            </span>
          )}
          <span className="font-bold text-primary text-[22px] whitespace-nowrap truncate max-w-full">
            {formatPrice(displayPrice)}
          </span>
        </div>
      </div>
    </motion.div>
  );
});
