import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Product, Portion } from "@/types/restaurant";
import { resolveActiveBasePrice } from "@/lib/priceList";
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
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="group relative bg-card border border-[hsl(var(--gold)/0.4)] hover:border-[hsl(var(--gold-light)/0.7)] p-4 flex flex-col cursor-pointer transition-colors duration-300"
    >
      {/* Corner accents */}
      <span className="gold-corner top-2 left-2 border-t border-l" />
      <span className="gold-corner top-2 right-2 border-t border-r" />
      <span className="gold-corner bottom-2 left-2 border-b border-l" />
      <span className="gold-corner bottom-2 right-2 border-b border-r" />

      {/* Image with thin gold-bordered frame */}
      <div className="p-1.5 border border-[hsl(var(--gold)/0.6)] relative">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          loading="lazy"
          className="w-full aspect-square object-cover"
        />

        {product.recommendation && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--gold))] text-[hsl(var(--background))] text-[10px] font-semibold tracking-wide">
            <Star className="w-2.5 h-2.5 fill-current" />
            <span className="uppercase">{t("productCard.recommended")}</span>
          </div>
        )}

        {priceType === "campaign" && (
          <div className={cn(
            "absolute px-2 py-0.5 bg-campaign text-campaign-foreground text-[10px] font-bold uppercase tracking-wide",
            product.recommendation ? "bottom-2 left-2" : "top-2 left-2"
          )}>
            {t("productCard.campaign")}
          </div>
        )}

        {priceType === "special" && (
          <div className={cn(
            "absolute px-2 py-0.5 bg-special text-special-foreground text-[10px] font-bold uppercase tracking-wide",
            product.recommendation ? "bottom-2 left-2" : "top-2 left-2"
          )}>
            {specialPriceName}
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="font-display mt-5 text-[hsl(var(--gold-light))] italic text-xl text-center leading-tight line-clamp-2">
        {product.name}
      </h3>

      {/* Description */}
      {product.description && (
        <p className="mt-2 text-[hsl(var(--gold-dust))] text-xs text-center leading-relaxed line-clamp-2 min-h-[32px]">
          {product.description}
        </p>
      )}

      {/* Price between two gold lines */}
      <div className="mt-4 flex items-center gap-3">
        <span className="gold-line" />
        <div className="flex flex-col items-center gap-0">
          {originalPrice && (
            <span className="text-[10px] text-[hsl(var(--gold-dust)/0.7)] line-through whitespace-nowrap leading-none">
              {formatPrice(originalPrice)}
            </span>
          )}
          <span className={cn(
            "font-display whitespace-nowrap leading-none text-lg italic",
            priceType === "campaign" ? "text-campaign" : priceType === "special" ? "text-special" : "text-[hsl(var(--gold-light))]"
          )}>
            {formatPrice(displayPrice)}
          </span>
        </div>
        <span className="gold-line" />
      </div>

    </motion.article>
  );
});
