import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Star, Clock } from "lucide-react";
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="group prem-card rounded-2xl p-3 cursor-pointer transition-all duration-300 flex flex-col"
    >
      {/* Square image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-secondary">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Badges */}
        {product.recommendation && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full shadow-md">
            <Star className="w-2.5 h-2.5 fill-current" />
            <span>{t("productCard.recommended")}</span>
          </div>
        )}

        {priceType === "campaign" && (
          <div className={cn(
            "absolute px-2 py-0.5 bg-campaign text-campaign-foreground text-[10px] font-semibold rounded-full shadow-md",
            product.recommendation ? "bottom-1.5 left-1.5" : "top-1.5 left-1.5"
          )}>
            {t("productCard.campaign")}
          </div>
        )}

        {priceType === "special" && (
          <div className={cn(
            "absolute px-2 py-0.5 bg-special text-special-foreground text-[10px] font-semibold rounded-full shadow-md",
            product.recommendation ? "bottom-1.5 left-1.5" : "top-1.5 left-1.5"
          )}>
            {specialPriceName}
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-2.5 font-display font-semibold text-card-foreground text-sm leading-tight line-clamp-2 break-words">
        {product.name}
      </h3>

      {/* Description */}
      {product.description && (
        <p className="mt-1 text-muted-foreground text-[11px] leading-snug line-clamp-2 min-h-[28px]">
          {product.description}
        </p>
      )}

      {/* Price */}
      <div className="mt-1.5 flex items-end justify-between gap-1.5 min-w-0">
        <div className="flex flex-col items-start gap-0 min-w-0 flex-1">
          {originalPrice && (
            <span className="text-[10px] text-muted-foreground line-through whitespace-nowrap truncate max-w-full">
              {formatPrice(originalPrice)}
            </span>
          )}
          <span className="text-[15px] font-display font-bold text-primary whitespace-nowrap truncate max-w-full leading-none">
            {formatPrice(displayPrice)}
          </span>
        </div>
      </div>
    </motion.div>
  );
});
