import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Star, Plus, Flame, Clock } from "lucide-react";
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
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      style={{ contentVisibility: "auto", containIntrinsicSize: "320px" } as React.CSSProperties}
      className="group relative bg-card rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden cursor-pointer"
    >
      {/* Recommendation Badge */}
      {product.recommendation && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium shadow-md">
          <Star className="w-3 h-3 fill-current" />
          <span>{t("productCard.recommended")}</span>
        </div>
      )}

      {/* Price Badge — drop to the bottom-right when the recommendation
          chip is also visible, so on narrow cards the two pills don't
          touch / overlap across the top edge. */}
      {priceType !== "normal" && (
        <div
          className={cn(
            "absolute right-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold shadow-md",
            product.recommendation ? "bottom-3" : "top-3",
            priceType === "campaign" ? "bg-campaign text-campaign-foreground" : "bg-special text-special-foreground",
          )}
        >
          {priceType === "special" ? specialPriceName : t("productCard.campaign")}
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          width={400}
          height={300}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground text-lg mb-1 line-clamp-2 break-words">{product.name}</h3>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{product.description}</p>

        {/* Calorie / prep-time badges — only render when the backend supplied
            a positive value (graceful: absent/null/0 → no badge). */}
        {(Number(product.calorie) > 0 || Number(product.preparationTime) > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {Number(product.calorie) > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 border border-orange-200 rounded-full text-[11px] font-medium">
                <Flame className="w-3 h-3" />
                {t("productCard.calorieBadge", { count: Number(product.calorie) })}
              </span>
            )}
            {Number(product.preparationTime) > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-sky-700 border border-sky-200 rounded-full text-[11px] font-medium">
                <Clock className="w-3 h-3" />
                {t("productCard.prepTimeBadge", { count: Number(product.preparationTime) })}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
            {originalPrice && (
              <span className="text-xs text-muted-foreground line-through whitespace-nowrap truncate max-w-full">{formatPrice(originalPrice)}</span>
            )}
            <span className="text-xl font-bold text-primary whitespace-nowrap truncate max-w-full">{formatPrice(displayPrice)}</span>
          </div>

        </div>
      </div>
    </motion.div>
  );
});
