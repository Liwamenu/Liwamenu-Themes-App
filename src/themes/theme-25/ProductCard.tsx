import { memo, useCallback } from "react";
import { Flame, Leaf } from "lucide-react";
import { Product, Portion } from "@/types/restaurant";
import { resolveActiveBasePrice } from "@/lib/priceList";
import { cn } from "@/lib/utils";
import { ProductBadges } from "@/components/menu/ProductBadges";
import { useTranslation } from "react-i18next";
import { getProductImageSrc, handleProductImageError } from "@/lib/productImage";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  isSpecialPriceActive: boolean;
  specialPriceName: string;
  formatPrice: (price: number) => string;
  /** Index in the grid — drives the staggered book-page reveal delay. */
  index?: number;
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

function getDietaryInfo(product: Product) {
  const p = product as unknown as { spicyLevel?: number; isVegetarian?: boolean };
  const level = typeof p.spicyLevel === "number" ? Math.max(0, Math.min(3, p.spicyLevel)) : 0;
  return { spicyLevel: level, isVegetarian: !!p.isVegetarian };
}

/**
 * Orange-Fresh card: white tile, heart icon top-left (filled if the
 * product is marked `recommendation`), square photo, centered bold name
 * + bold price, then a 5-star rating row. Reference design from
 * `public/Premium themes/Orange White/src/pages/OrangeFood.tsx`.
 */
export const ProductCard = memo(function ProductCard({
  product,
  onSelect,
  isSpecialPriceActive,
  specialPriceName,
  formatPrice,
  index = 0,
}: ProductCardProps) {
  const { t } = useTranslation();
  const firstPortion = product.portions?.[0];
  if (!firstPortion) return null;
  const { displayPrice, originalPrice, priceType } = getPriceDisplay(
    firstPortion,
    isSpecialPriceActive,
    !!product.isCampaign,
  );
  const { spicyLevel, isVegetarian } = getDietaryInfo(product);

  const handleClick = useCallback(() => {
    onSelect(product);
  }, [onSelect, product]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="menu-row text-left animate-page-flip"
      aria-label={product.name}
      style={{ animationDelay: `${Math.floor(index / 2) * 0.135}s` }}
    >
      {/* Square product image */}
      <div className="product-image-wrap">
        <img
          src={getProductImageSrc(product.imageURL)}
          onError={handleProductImageError}
          alt={product.name}
          loading="lazy"
        />
      </div>

      {/* Centered name */}
      <h3 className="product-name">{product.name}</h3>

      {/* Centered price */}
      <span
        className={cn(
          "product-price",
          priceType === "campaign" && "!text-[hsl(var(--campaign))]",
          priceType === "special" && "!text-[hsl(var(--special))]",
        )}
      >
        {formatPrice(displayPrice)}
      </span>
      {originalPrice && (
        <span className="block text-center text-[10px] text-muted-foreground line-through mt-0.5">
          {formatPrice(originalPrice)}
        </span>
      )}

      <ProductBadges product={product} className="justify-center mt-1.5" />

      {/* Optional chips: campaign / special / dietary — kept compact below */}
      {(priceType !== "normal" || spicyLevel > 0 || isVegetarian) && (
        <div className="flex items-center gap-1 flex-wrap mt-2 justify-center">
          {priceType === "campaign" && (
            <span className="px-1.5 py-0.5 bg-campaign text-campaign-foreground text-[9px] font-bold uppercase tracking-wide rounded-full">
              {t("productCard.campaign")}
            </span>
          )}
          {priceType === "special" && (
            <span className="px-1.5 py-0.5 bg-special text-special-foreground text-[9px] font-bold uppercase tracking-wide rounded-full">
              {specialPriceName}
            </span>
          )}
          {spicyLevel > 0 &&
            [0, 1, 2].map((i) => (
              <Flame
                key={i}
                className="w-3 h-3"
                style={{
                  color:
                    i < spicyLevel
                      ? "hsl(var(--destructive))"
                      : "hsl(var(--muted-foreground))",
                  fill: i < spicyLevel ? "hsl(var(--destructive))" : "transparent",
                  opacity: i < spicyLevel ? 1 : 0.35,
                }}
              />
            ))}
          {isVegetarian && (
            <Leaf
              className="w-3 h-3"
              style={{ color: "hsl(var(--success))", fill: "hsl(var(--success))" }}
            />
          )}
        </div>
      )}
    </button>
  );
});
