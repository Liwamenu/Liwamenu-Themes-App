import { memo, useCallback, useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Product, Portion } from "@/types/restaurant";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { getProductImageSrc, handleProductImageError } from "@/lib/productImage";

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
  const titleRef = useFitToLines(2, product.name);

  const handleClick = useCallback(() => {
    onSelect(product);
  }, [onSelect, product]);

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      style={{ contentVisibility: "auto", containIntrinsicSize: "380px" } as React.CSSProperties}
      className="group relative bg-card rounded-t-[90px] rounded-b-[15px] shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer flex flex-col items-center text-center pt-5 pb-6 px-4"
    >
      {/* Circular image — w-[103%] (~15% bigger than 90%), badges overlaid on image */}
      <div className="relative w-[103%] aspect-square mb-5 shadow-md rounded-full">
        <div className="w-full h-full overflow-hidden rounded-full bg-muted">
          <img
            src={getProductImageSrc(product.imageURL)}
            onError={handleProductImageError}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* Badges overlaid on image — stay within visible rounded card area */}
        {product.recommendation && (
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium shadow-md">
            <Star className="w-2.5 h-2.5 fill-current" />
            <span>{t("productCard.recommended")}</span>
          </div>
        )}

        {priceType !== "normal" && (
          <div
            className={cn(
              "absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md",
              priceType === "campaign" ? "bg-campaign text-campaign-foreground" : "bg-special text-special-foreground",
            )}
          >
            {priceType === "special" ? specialPriceName : t("productCard.campaign")}
          </div>
        )}
      </div>

      {/* Title — serif, dark navy, bold */}
      <h3
        ref={titleRef as React.RefObject<HTMLHeadingElement>}
        className="font-display font-bold text-foreground break-words leading-tight overflow-hidden text-[22px] mb-3 px-1"
        style={{ maxHeight: "2.5em" }}
      >
        {product.name}
      </h3>

      {/* Description — muted */}
      {product.description && (
        <p className="text-muted-foreground text-[14px] leading-snug line-clamp-2 mb-5 px-1">
          {product.description}
        </p>
      )}

      {/* Price — coral, bold serif */}
      <div className="flex flex-col items-center gap-0.5 mt-auto min-w-0 max-w-full">
        {originalPrice && (
          <span className="text-[12px] text-muted-foreground line-through whitespace-nowrap truncate max-w-full">
            {formatPrice(originalPrice)}
          </span>
        )}
        <span className="text-[22px] font-bold text-primary whitespace-nowrap truncate max-w-full font-display">
          {formatPrice(displayPrice)}
        </span>
      </div>
    </motion.div>
  );
});
