import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Product, Portion } from "@/types/restaurant";
import { resolveActiveBasePrice } from "@/lib/priceList";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { getProductImageSrc, handleProductImageError } from "@/lib/productImage";
import { ProductBadges } from "@/components/menu/ProductBadges";

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
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="group relative bg-card rounded-[8px] cursor-pointer border border-border shadow-card hover:shadow-card-hover transition-all duration-300 pl-[110px] pr-3 pt-3 pb-3 min-h-[120px] overflow-visible"
    >
      {/* Heart-shaped image — overflows the card's top-left corner */}
      <div className="absolute -top-3 -left-3 w-[120px] h-[110px] z-30 [filter:drop-shadow(4px_4px_10px_rgba(0,0,0,0.18))]">
        <svg viewBox="0 0 160 145" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full">
          <defs>
            <clipPath id={`heart-frame-${product.id}`}>
              <path d="M80 145c-2.3 0-4.6-.9-6.3-2.6C54.1 123.6 0 81.3 0 45 0 20.2 20.2 0 45 0c14.2 0 27.5 6.6 35 17.9C87.5 6.6 100.8 0 115 0c24.8 0 45 20.2 45 45 0 36.3-54.1 78.6-73.7 97.4-1.7 1.7-4 2.6-6.3 2.6z" />
            </clipPath>
            <clipPath id={`heart-image-${product.id}`}>
              <path transform="translate(6 5.5)" d="M74 134.1c-2.1 0-4.3-.8-5.8-2.4C49.9 114.4 0 75.3 0 41.6 0 18.6 18.7 0 41.6 0c13.1 0 25.5 6.1 32.4 16.5C80.9 6.1 93.3 0 106.4 0 129.3 0 148 18.6 148 41.6c0 33.7-49.9 72.8-68.2 90.1-1.5 1.6-3.7 2.4-5.8 2.4z" />
            </clipPath>
            <linearGradient id={`heart-bg-${product.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--card))" />
              <stop offset="100%" stopColor="hsl(var(--muted))" />
            </linearGradient>
          </defs>
          {/* White heart frame */}
          <rect width="160" height="145" fill={`url(#heart-bg-${product.id})`} clipPath={`url(#heart-frame-${product.id})`} />
          {/* Inset image */}
          <image
            href={getProductImageSrc(product.imageURL)}
            width="148"
            height="134"
            x="6"
            y="5.5"
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#heart-image-${product.id})`}
          />
        </svg>
        <img
          src={getProductImageSrc(product.imageURL)}
          alt={product.name}
          onError={handleProductImageError}
          loading="lazy"
          decoding="async"
          className="hidden"
        />

        {product.recommendation && (
          <div className="absolute top-0 right-0 z-20 flex items-center gap-0.5 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[9px] font-semibold shadow-md">
            <Star className="w-2 h-2 fill-current" />
            <span>{t("productCard.recommended")}</span>
          </div>
        )}

        {priceType === "campaign" && (
          <div className="absolute bottom-3 right-3 z-20 px-1.5 py-0.5 bg-campaign text-campaign-foreground rounded-full text-[9px] font-bold shadow-md">
            {t("productCard.campaign")}
          </div>
        )}

        {priceType === "special" && (
          <div className="absolute bottom-3 right-3 z-20 px-1.5 py-0.5 bg-special text-special-foreground rounded-full text-[9px] font-bold shadow-md">
            {specialPriceName}
          </div>
        )}
      </div>

      {/* Right side: title + prices, all right-aligned */}
      <div className="text-right">
        <h3
          className="text-[16px] font-bold text-foreground leading-tight line-clamp-2 break-words mb-2"
          style={{ fontFamily: "'Ubuntu', system-ui, sans-serif" }}
        >
          {product.name}
        </h3>

        {/* Price row: badges pinned left, prices stacked right */}
        <div className="flex items-end justify-between gap-2 min-w-0">
          <ProductBadges product={product} className="min-w-0" />
          <div className="flex flex-col items-end gap-1 min-w-0 max-w-full">
            {originalPrice && (
              <span className="text-[12px] text-muted-foreground line-through whitespace-nowrap truncate max-w-full">
                {formatPrice(originalPrice)}
              </span>
            )}
            <span className="text-[18px] font-semibold text-foreground whitespace-nowrap truncate max-w-full">
              {formatPrice(displayPrice)}
            </span>
          </div>
        </div>
      </div>

    </motion.div>
  );
});
