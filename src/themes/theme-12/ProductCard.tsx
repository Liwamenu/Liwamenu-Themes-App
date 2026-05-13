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
    <div className="relative pt-[40px]">
      {/* Circular image — extends above card top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-[80px] h-[80px] rounded-full overflow-hidden bg-muted shadow-md ring-4 ring-card">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>

      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        className="group relative bg-card rounded-3xl shadow-[0_6px_18px_-2px_rgba(60,30,15,0.18),_0_2px_6px_-1px_rgba(60,30,15,0.10)] hover:shadow-[0_10px_28px_-4px_rgba(60,30,15,0.25),_0_4px_10px_-2px_rgba(60,30,15,0.15)] transition-shadow duration-300 cursor-pointer flex flex-col items-center text-center pt-[50px] pb-0 px-4 overflow-hidden"
      >
        {product.recommendation && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium shadow-md">
            <Star className="w-2.5 h-2.5 fill-current" />
            <span>{t("productCard.recommended")}</span>
          </div>
        )}

        {priceType !== "normal" && (
          <div
            className={cn(
              "absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md",
              priceType === "campaign" ? "bg-campaign text-campaign-foreground" : "bg-special text-special-foreground",
            )}
          >
            {priceType === "special" ? specialPriceName : t("productCard.campaign")}
          </div>
        )}

        {/* Title — handwritten Caveat, brown, centered */}
        <h3 className="font-display font-bold text-primary text-[26px] leading-tight line-clamp-2 px-1 mb-1">
          {product.name}
        </h3>

        {/* Description — gray, centered */}
        {product.description && (
          <p className="text-muted-foreground text-[13px] leading-snug line-clamp-2 px-1 mb-4">
            {product.description}
          </p>
        )}

        {/* Price pill — light bg, brown text */}
        <div className="inline-flex items-center justify-center gap-2 bg-background rounded-full px-5 py-2 mb-4 shadow-sm min-w-0 max-w-full">
          {originalPrice && (
            <span className="text-[11px] text-muted-foreground line-through whitespace-nowrap truncate">
              {formatPrice(originalPrice)}
            </span>
          )}
          <span className="text-[15px] font-bold text-primary whitespace-nowrap truncate">
            {formatPrice(displayPrice)}
          </span>
        </div>

        {/* Green decorative bottom stripe */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[40%] h-1 bg-secondary rounded-t-full" />
      </motion.div>
    </div>
  );
});
