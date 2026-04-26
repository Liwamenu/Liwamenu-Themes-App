import placeholder from "@/assets/product-placeholder.png";

export const PRODUCT_IMAGE_FALLBACK = placeholder;

/**
 * Returns a usable image source for a product. Falls back to the brand
 * placeholder when the URL is missing/empty.
 */
export function getProductImageSrc(url?: string | null): string {
  const trimmed = String(url ?? "").trim();
  return trimmed.length > 0 ? trimmed : PRODUCT_IMAGE_FALLBACK;
}

/**
 * onError handler for <img> tags — swaps in the placeholder when the
 * remote image fails to load. Safe against infinite loops.
 */
export function handleProductImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>
) {
  const img = e.currentTarget;
  if (img.src.endsWith(PRODUCT_IMAGE_FALLBACK) || img.dataset.fallback === "1") return;
  img.dataset.fallback = "1";
  img.src = PRODUCT_IMAGE_FALLBACK;
}