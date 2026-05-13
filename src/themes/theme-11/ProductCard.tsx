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
      className="pc-dark group bg-card rounded-2xl shadow-card hover:shadow-card-hover transition-shadow duration-300 cursor-pointer flex items-center gap-3 p-3"
    >
      {/* Image — square with rounded corners on the left */}
      <div className="relative w-[88px] h-[88px] flex-shrink-0 overflow-hidden rounded-xl bg-muted">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {product.recommendation && (
          <div className="absolute top-1 left-1 z-10 flex items-center gap-0.5 px-1.5 py-0.5 bg-primary text-primary-foreground text-[9px] font-semibold rounded-full shadow-sm">
            <Star className="w-2 h-2 fill-current" />
            <span>{t("productCard.recommended")}</span>
          </div>
        )}
        {priceType === "campaign" && (
          <div className={cn(
            "absolute px-1.5 py-0.5 bg-campaign text-campaign-foreground text-[9px] font-semibold rounded-full shadow-sm z-10",
            product.recommendation ? "bottom-1 left-1" : "top-1 left-1"
          )}>
            {t("productCard.campaign")}
          </div>
        )}
        {priceType === "special" && (
          <div className={cn(
            "absolute px-1.5 py-0.5 bg-special text-special-foreground text-[9px] font-semibold rounded-full shadow-sm z-10",
            product.recommendation ? "bottom-1 left-1" : "top-1 left-1"
          )}>
            {specialPriceName}
          </div>
        )}
      </div>

      {/* Content right — yellow title on top, embossed price pill at bottom-right */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch gap-2">
        <h3 className="font-bold text-primary text-[18px] leading-tight line-clamp-2 break-words">
          {product.name}
        </h3>

        {/* Price pill — darker than card, embossed, yellow text, bottom-right */}
        <div className="inline-flex items-center self-end max-w-full bg-secondary rounded-[4px] px-3 py-1.5 shadow-inner">
          <div className="flex items-baseline gap-2 min-w-0">
            {originalPrice && (
              <span className="text-[11px] text-muted-foreground line-through whitespace-nowrap truncate max-w-full">
                {formatPrice(originalPrice)}
              </span>
            )}
            <span className="text-[16px] font-bold text-primary whitespace-nowrap truncate max-w-full">
              {formatPrice(displayPrice)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
