import { memo, useCallback, useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Star, Plus } from "lucide-react";
import { Product, Portion } from "@/types/restaurant";
import { resolveActiveBasePrice } from "@/lib/priceList";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { getProductImageSrc, handleProductImageError } from "@/lib/productImage";
import { ProductBadges } from "@/components/menu/ProductBadges";

/**
 * Reduces a heading's font-size until the full text fits within `maxLines` lines.
 * Avoids the ellipsis-truncation problem for long product names in narrow cards.
 */
function useFitToLines(maxLines: number, dep: unknown) {
  const ref = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.fontSize = "";
    let size = parseFloat(getComputedStyle(el).fontSize);
    let i = 0;
    while (el.scrollHeight > el.clientHeight + 1 && size > 9 && i < 24) {
      size -= 0.5;
      el.style.fontSize = `${size}px`;
      i++;
    }
  }, [dep]);
  return ref;
}

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
  const titleRef = useFitToLines(2, product.name);

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

      {/* Price Badge */}
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
        <h3
          ref={titleRef as React.RefObject<HTMLHeadingElement>}
          className="font-semibold text-foreground mb-1 break-words leading-tight overflow-hidden text-lg"
          style={{ maxHeight: "2.5em" }}
        >
          {product.name}
        </h3>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{product.description}</p>

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
            {originalPrice && (
              <span className="text-[10px] text-muted-foreground line-through leading-none whitespace-nowrap truncate max-w-full">
                {formatPrice(originalPrice)}
              </span>
            )}
            <span className="text-base sm:text-lg font-bold text-primary leading-none whitespace-nowrap truncate max-w-full">
              {formatPrice(displayPrice)}
            </span>
          </div>
          <ProductBadges product={product} className="justify-end min-w-0" />
        </div>
      </div>
    </motion.div>
  );
});
