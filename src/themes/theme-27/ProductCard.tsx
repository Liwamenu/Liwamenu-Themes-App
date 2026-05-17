import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Product, Portion } from "@/types/restaurant";
import { getActivePriceListType, resolveBasePrice } from "@/lib/priceList";
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
  const hasCampaign =
    isCampaign &&
    portion.campaignPrice != null &&
    portion.campaignPrice > 0 &&
    portion.campaignPrice < portion.price;

  // When special pricing is OFF at restaurant level, don't let
  // menu-level priceListType="special" override normal prices
  const plt = getActivePriceListType();
  const effectivePlt = (!isSpecialPriceActive && plt === 'special') ? 'normal' : plt;
  let displayPrice = resolveBasePrice(portion, effectivePlt);
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

/**
 * Kiosk product tile — square image + 3D price button overlapping
 * the bottom of the image, product name below.
 */
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

  const { displayPrice, originalPrice, priceType } = getPriceDisplay(
    firstPortion,
    isSpecialPriceActive,
    !!product.isCampaign,
  );

  const handleClick = useCallback(() => {
    onSelect(product);
  }, [onSelect, product]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileTap={{ scale: 0.96 }}
      onClick={handleClick}
      className="kiosk-card"
    >
      {/* Square product image */}
      <div className="kiosk-card-image">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          loading="lazy"
          decoding="async"
        />

        {/* Recommendation badge */}
        {product.recommendation && (
          <div className="kiosk-badge-recommend">
            <Star className="w-3.5 h-3.5 fill-current" />
          </div>
        )}

        {/* Campaign / special badge overlay */}
        {priceType !== "normal" && (
          <div className="absolute bottom-2 left-2">
            {priceType === "campaign" && (
              <span className="kiosk-badge-campaign">
                {t("productCard.campaign")}
              </span>
            )}
            {priceType === "special" && (
              <span className="kiosk-badge-special">
                {specialPriceName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3D Price button — overlaps bottom edge of image */}
      <div
        className={cn(
          "kiosk-price-btn",
          priceType === "campaign" && "kiosk-price-btn--campaign",
          priceType === "special" && "kiosk-price-btn--special",
        )}
      >
        {originalPrice && (
          <span className="kiosk-price-old">{formatPrice(originalPrice)}</span>
        )}
        <span>{formatPrice(displayPrice)}</span>
      </div>

      {/* Product name — 2 line clamp */}
      <p className="kiosk-card-name">{product.name}</p>
    </motion.div>
  );
});
