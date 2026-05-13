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
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="group relative bg-card shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer flex items-center py-3 my-1 rounded-lg overflow-hidden"
    >
      {/* Price Badge */}
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

      {/* Round Image */}
      <div className="w-[100px] h-[100px] rounded-full overflow-hidden mx-4 flex-shrink-0">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          decoding="async"
          width={100}
          height={100}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between h-[100px] min-w-0 pr-2">
        <div>
          <h3 className="font-bold text-foreground text-base leading-tight line-clamp-2 break-words font-barlow">
            {product.name}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2 mt-0.5">
            {product.description}
          </p>
        </div>
      </div>

      {/* Price Column */}
      <div className="flex flex-col h-[100px] flex-shrink-0 justify-end items-end mr-3 max-w-[45%] min-w-0">
        <div className="text-right pb-1 min-w-0 max-w-full">
          <span className="text-lg font-bold text-foreground whitespace-nowrap truncate block max-w-full">{formatPrice(displayPrice)}</span>
          {originalPrice && (
            <span className="block text-xs text-muted-foreground line-through whitespace-nowrap truncate max-w-full">{formatPrice(originalPrice)}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
});
