import { Flame, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Product } from "@/types/restaurant";
import { cn } from "@/lib/utils";

interface ProductBadgesProps {
  product: Pick<Product, "calorie" | "preparationTime">;
  /** "sm" for product cards, "md" for the (larger) detail modal. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Calorie + preparation-time chips, shared across every theme so the markup and
 * i18n live in one place. Renders nothing unless the backend supplied a positive
 * value (graceful: absent / null / 0 → hidden, no layout shift before the backend
 * ships the fields). Placement is the caller's job — it sits on the product's
 * price row, pinned to the side opposite the price.
 */
export function ProductBadges({ product, size = "sm", className }: ProductBadgesProps) {
  const { t } = useTranslation();
  const calorie = Number(product.calorie);
  const prep = Number(product.preparationTime);
  if (!(calorie > 0) && !(prep > 0)) return null;

  const chip = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  const icon = size === "md" ? "w-3.5 h-3.5" : "w-3 h-3";
  // Anthracite (RAL 7016) pill with white text and a 4px corner radius —
  // identical for both chips; they're told apart by icon + label.
  const base = "inline-flex items-center gap-1 rounded font-medium whitespace-nowrap bg-[#293133] text-white";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {calorie > 0 && (
        <span className={cn(base, chip)}>
          <Flame className={cn("shrink-0", icon)} />
          {t("productCard.calorieBadge", { count: calorie })}
        </span>
      )}
      {prep > 0 && (
        <span className={cn(base, chip)}>
          <Clock className={cn("shrink-0", icon)} />
          {t("productCard.prepTimeBadge", { count: prep })}
        </span>
      )}
    </div>
  );
}
