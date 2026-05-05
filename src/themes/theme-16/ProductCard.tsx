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
    while (el.scrollHeight > el.clientHeight + 1 && size > 8 && i < 24) {
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
  const titleRef = useFitToLines(2, product.name);

  const handleClick = useCallback(() => {
    onSelect(product);
  }, [onSelect, product]);

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      className="group relative flex flex-col cursor-pointer"
    >
      {/* Square Image */}
      <div className="relative aspect-square overflow-hidden rounded-xl bg-secondary">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />

        {product.recommendation && (
          <div className="absolute top-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[9px] font-semibold shadow-sm">
            <Star className="w-2 h-2 fill-current" />
          </div>
        )}

        {priceType === "campaign" && (
          <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-campaign text-campaign-foreground rounded-full text-[9px] font-bold shadow-sm">
            %
          </div>
        )}

        {priceType === "special" && (
          <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-special text-special-foreground rounded-full text-[9px] font-bold shadow-sm">
            ★
          </div>
        )}
      </div>

      {/* Title */}
      <h3
        ref={titleRef as React.RefObject<HTMLHeadingElement>}
        className="mt-2 font-bold text-foreground text-[12px] leading-tight overflow-hidden text-center break-words"
        style={{ maxHeight: "2.4em" }}
      >
        {product.name}
      </h3>

      {/* Price */}
      <div className="mt-0.5 flex flex-col items-center gap-0 min-w-0">
        {originalPrice && (
          <span className="text-[9px] text-muted-foreground line-through whitespace-nowrap truncate max-w-full">
            {formatPrice(originalPrice)}
          </span>
        )}
        <span className={cn(
          "text-[13px] font-extrabold whitespace-nowrap truncate max-w-full leading-none",
          priceType === "campaign" ? "text-campaign" : priceType === "special" ? "text-special" : "text-primary"
        )}>
          {formatPrice(displayPrice)}
        </span>
      </div>

    </motion.div>
  );
});
