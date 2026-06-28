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
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      /* product-card class is styled via theme.css inside .product-zone */
      className="product-card group relative w-full overflow-hidden rounded-2xl flex flex-col cursor-pointer transition-shadow duration-300 hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-[hsl(var(--surface-light))]">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {product.recommendation && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--amber))] text-[hsl(var(--plum-deep))] text-[10px] font-bold rounded-full shadow-sm">
            <Star className="w-2.5 h-2.5 fill-current" />
            <span>{t("productCard.recommended")}</span>
          </div>
        )}

        {priceType === "campaign" && (
          <div className={cn(
            "absolute px-2 py-0.5 bg-campaign text-campaign-foreground text-[10px] font-bold uppercase tracking-wide rounded-full shadow-sm",
            product.recommendation ? "bottom-1.5 left-1.5" : "top-1.5 left-1.5"
          )}>
            {t("productCard.campaign")}
          </div>
        )}

        {priceType === "special" && (
          <div className={cn(
            "absolute px-2 py-0.5 bg-special text-special-foreground text-[10px] font-bold uppercase tracking-wide rounded-full shadow-sm",
            product.recommendation ? "bottom-1.5 left-1.5" : "top-1.5 left-1.5"
          )}>
            {specialPriceName}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-display font-bold italic text-[15px] leading-tight line-clamp-2 break-words">
          {product.name}
        </h3>
        {product.description && (
          <p className="product-card-muted text-[11px] leading-snug line-clamp-2 mt-1 min-h-[28px]">
            {product.description}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2">
          <span className="flex-1 h-px bg-[hsl(var(--amber))]/50" />
          <div className="flex flex-col items-center gap-0">
            {originalPrice && (
              <span className="text-[10px] product-card-muted line-through whitespace-nowrap leading-none">
                {formatPrice(originalPrice)}
              </span>
            )}
            <span className={cn(
              "font-display whitespace-nowrap leading-none text-[15px] italic font-bold product-card-price",
              priceType === "campaign" && "!text-campaign",
              priceType === "special" && "!text-special",
            )}>
              {formatPrice(displayPrice)}
            </span>
          </div>
          <span className="flex-1 h-px bg-[hsl(var(--amber))]/50" />
        </div>
        <ProductBadges product={product} className="mt-2 justify-center" />
      </div>
    </motion.article>
  );
});
