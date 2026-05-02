import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
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
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3, boxShadow: "var(--shadow-lg)" }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="group relative bg-card rounded-2xl overflow-hidden shadow-card cursor-pointer flex items-stretch"
    >
      {/* Badge */}
      {priceType !== "normal" && (
        <div
          className={cn(
            "absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md",
            priceType === "campaign"
              ? "bg-campaign text-campaign-foreground"
              : "bg-special text-special-foreground"
          )}
        >
          {priceType === "special" ? specialPriceName : t("productCard.campaign")}
        </div>
      )}

      {/* Tall portrait image */}
      <div className="w-[110px] flex-shrink-0 relative overflow-hidden">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          decoding="async"
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between p-3 min-w-0 min-h-[130px]">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground leading-tight line-clamp-1">
            {product.name}
          </h3>
          <p className="text-muted-foreground text-xs line-clamp-2 mt-1 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price row */}
        <div className="flex items-end justify-between mt-2">
          <div>
            <span className="text-lg font-bold text-foreground font-display">
              {formatPrice(displayPrice)}
            </span>
            {originalPrice && (
              <span className="ml-2 text-xs text-muted-foreground line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
          <button
            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:shadow-glow transition-all active:scale-90"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});
