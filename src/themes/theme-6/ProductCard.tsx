import { memo, useCallback, useState } from "react";
import { Product, Portion } from "@/types/restaurant";
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
  const [showFullDesc, setShowFullDesc] = useState(false);

  const handleClick = useCallback(() => {
    onSelect(product);
  }, [onSelect, product]);

  return (
    <div
      onClick={handleClick}
      className="flex items-stretch gap-4 py-3 border-b border-secondary/40 cursor-pointer group"
    >
      {/* Portrait image */}
      <div className="w-[85px] flex-shrink-0 relative overflow-hidden rounded-md">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          className="w-full h-full object-cover aspect-[3/4]"
          loading="lazy"
          decoding="async"
        />
        {/* Badge */}
        {priceType !== "normal" && (
          <span
            className={`absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
              priceType === "campaign" ? "bg-campaign text-campaign-foreground" : "bg-special text-special-foreground"
            }`}
          >
            {priceType === "special" ? specialPriceName : t("productCard.campaign")}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex justify-between items-start min-w-0">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-semibold text-foreground leading-tight line-clamp-1">
            {product.name}
          </h3>
          {product.description && (
            <p
              className={`text-muted-foreground text-[13px] leading-snug mt-1 ${showFullDesc ? "" : "line-clamp-2"}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowFullDesc((v) => !v);
              }}
            >
              {product.description}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="flex flex-col items-end ml-3 flex-shrink-0">
          <span className="text-xl font-bold text-foreground font-display">
            {formatPrice(displayPrice)}
          </span>
          {originalPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
