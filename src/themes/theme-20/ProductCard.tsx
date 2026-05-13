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
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      /* Fixed width for horizontal scroller — 150px (15% smaller than 176px) */
      className="shrink-0 w-[150px] cursor-pointer flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-secondary">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover"
        />

        {product.recommendation && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--gold))] text-[hsl(var(--primary-foreground))] text-[9px] font-bold rounded-full shadow">
            <Star className="w-2.5 h-2.5 fill-current" />
            <span className="uppercase tracking-wide">{t("productCard.recommended")}</span>
          </div>
        )}

        {priceType === "campaign" && (
          <div className={cn(
            "absolute px-2 py-0.5 bg-campaign text-campaign-foreground text-[9px] font-bold uppercase tracking-wide rounded-full shadow",
            product.recommendation ? "bottom-1.5 left-1.5" : "top-1.5 left-1.5"
          )}>
            {t("productCard.campaign")}
          </div>
        )}

        {priceType === "special" && (
          <div className={cn(
            "absolute px-2 py-0.5 bg-special text-special-foreground text-[9px] font-bold uppercase tracking-wide rounded-full shadow",
            product.recommendation ? "bottom-1.5 left-1.5" : "top-1.5 left-1.5"
          )}>
            {specialPriceName}
          </div>
        )}
      </div>

      {/* Title — gold, bold, NOT uppercase (case preserved as written) */}
      <h3 className="product-title mt-2 text-[15px] leading-tight line-clamp-2 break-words min-h-[2.4em]">
        {product.name}
      </h3>

      {/* Description */}
      {product.description && (
        <p className="text-muted-foreground text-[11px] leading-snug line-clamp-2 mt-1 min-h-[28px]">
          {product.description}
        </p>
      )}

      {/* Price */}
      <div className="mt-2 flex flex-col">
        {originalPrice && (
          <span className="text-[10px] text-muted-foreground line-through whitespace-nowrap leading-none">
            {formatPrice(originalPrice)}
          </span>
        )}
        <span className={cn(
          "font-display font-bold text-foreground whitespace-nowrap truncate text-lg leading-none",
          priceType === "campaign" && "text-campaign",
          priceType === "special" && "text-special"
        )}>
          {formatPrice(displayPrice)}
        </span>
      </div>
    </motion.div>
  );
});
