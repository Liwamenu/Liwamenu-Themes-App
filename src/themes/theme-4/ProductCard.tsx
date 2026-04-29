import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
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
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      style={{ contentVisibility: "auto", containIntrinsicSize: "140px" } as React.CSSProperties}
      className="group relative bg-card rounded-lg shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden cursor-pointer flex flex-row h-[140px]"
    >
      {priceType !== "normal" && (
        <div
          className={cn(
            "absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-[10px] font-bold shadow",
            priceType === "campaign"
              ? "bg-campaign text-campaign-foreground"
              : "bg-special text-special-foreground"
          )}
        >
          {priceType === "special" ? specialPriceName : t("productCard.campaign")}
        </div>
      )}

      <div className="w-[140px] flex-shrink-0 overflow-hidden">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
          width={140}
          height={140}
        />
      </div>

      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
        <div>
          <h3 className="font-semibold text-card-foreground text-sm leading-tight line-clamp-1">
            {product.name}
          </h3>
          <p className="text-muted-foreground text-xs line-clamp-2 mt-1">
            {product.description}
          </p>
        </div>

        <div className="flex items-end justify-between mt-auto">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-card-foreground">{formatPrice(displayPrice)}</span>
            {originalPrice && (
              <span className="text-xs text-muted-foreground line-through">{formatPrice(originalPrice)}</span>
            )}
          </div>

          <button className="flex items-center justify-center w-9 h-9 bg-primary text-primary-foreground rounded-full transition-all hover:opacity-90" aria-label="Add to cart">
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});
