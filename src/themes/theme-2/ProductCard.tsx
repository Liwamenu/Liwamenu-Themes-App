import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Star, ShoppingCart } from "lucide-react";
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

export const ProductCard = memo(function ProductCard({ 
  product, 
  onSelect, 
  isSpecialPriceActive, 
  specialPriceName,
  formatPrice 
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="group bg-card rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer overflow-hidden border border-border/50 flex flex-row"
    >
      {/* Image - Left side, square */}
      <div className="relative w-28 h-28 flex-shrink-0 overflow-hidden">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        
        {/* Badges on image */}
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

      {/* Content - Right side */}
      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
        <div>
          <h3 className="font-display font-semibold text-foreground text-sm leading-tight line-clamp-2 break-words mb-0.5">
            {product.name}
          </h3>
          <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
            {originalPrice && (
              <span className="text-[10px] text-muted-foreground line-through whitespace-nowrap truncate max-w-full">
                {formatPrice(originalPrice)}
              </span>
            )}
            <span className="text-base font-display font-bold text-foreground whitespace-nowrap truncate max-w-full">
              {formatPrice(displayPrice)}
            </span>
          </div>

        </div>
      </div>
    </motion.div>
  );
});
