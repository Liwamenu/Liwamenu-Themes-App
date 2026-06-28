import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, Check } from "lucide-react";
import { Product, Portion, OrderTag, OrderTagItem, SelectedTagItem } from "@/types/restaurant";
import { resolveActiveBasePrice } from "@/lib/priceList";
import { AllergensSection } from "@/components/menu/AllergensSection";
import { ProductBadges } from "@/components/menu/ProductBadges";
import { useCart } from "@/hooks/useCart";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useFlyingEmoji } from "@/hooks/useFlyingEmoji";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getProductImageSrc, handleProductImageError } from "@/lib/productImage";
import { toast } from "sonner";
import { getEffectiveTagBounds, shouldShowTagItemPrice } from "@/lib/orderTag";

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

/**
 * Theme-25 Product Detail Modal — Orange Fresh aesthetic.
 *
 * Visual blueprint (from public/Premium themes/Orange White reference):
 *   - back arrow top-left
 *   - large centered product image
 *   - circular orange qty badge top-right of the image
 *   - dots indicator under the image (one per portion)
 *   - big bold centered title
 *   - price row: square orange [-] | total | square orange [+]
 *   - "About" heading + product description with optional "More" toggle
 *   - two stat chips (Total Amount + Portion)
 *   - full-width orange ADD TO CART button
 *
 * Reuses the same hooks the shared modal uses (useCart, useRestaurant,
 * useFlyingEmoji) and supports portions, mandatory order tags, free-tag
 * notes, allergens, and the view-only mode when ordering is disabled.
 */
export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const { t } = useTranslation();
  const { restaurant, formatPrice,
    formatPriceWithSign, isRestaurantActive, isCurrentlyOpen } = useRestaurant();
  const { addItem } = useCart();
  const { triggerFlyingEmoji } = useFlyingEmoji();
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const [selectedPortion, setSelectedPortion] = useState<Portion>(product.portions[0]);
  const [quantity, setQuantity] = useState(1);
  const [selectedTags, setSelectedTags] = useState<Record<string, SelectedTagItem[]>>({});
  const [freeTagNotes, setFreeTagNotes] = useState<Record<string, string>>({});
  const [productNote, setProductNote] = useState("");
  const [showFullDesc, setShowFullDesc] = useState(false);

  /* Auto-select default tag items when portion changes. */
  useEffect(() => {
    const defaults: Record<string, SelectedTagItem[]> = {};
    selectedPortion.orderTags.forEach((tag) => {
      const defaultItems = tag.orderTagItems
        .filter((it) => it.isDefault)
        .map<SelectedTagItem>((it) => ({
          tagId: tag.id,
          tagName: tag.name,
          itemId: it.id,
          itemName: it.name,
          price: it.price,
          quantity: Math.max(1, it.minQuantity || 1),
        }));
      if (defaultItems.length === 0) return;
      const cap = getEffectiveTagBounds(tag).max > 0 ? getEffectiveTagBounds(tag).max : defaultItems.length;
      defaults[tag.id] = defaultItems.slice(0, cap);
    });
    setSelectedTags(defaults);
    // Preserve freeTagNotes across portion switches (filtered at add-to-cart).
  }, [selectedPortion]);

  /* Body scroll lock */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const canOrderAtAll = !!(restaurant.onlineOrder || restaurant.inPersonOrder);
  const canAddToCart = isRestaurantActive && isCurrentlyOpen && canOrderAtAll;

  const displayPrice = useMemo(() => {
    if (restaurant.isSpecialPriceActive && selectedPortion.specialPrice != null) {
      return selectedPortion.specialPrice;
    }
    // Campaign-price validity: must be > 0 AND < base price; otherwise
    // fall through to the normal portion price. Matches the rule in
    // useRestaurant / useCart / shared ProductDetailModal.
    if (
      product.isCampaign &&
      selectedPortion.campaignPrice != null &&
      selectedPortion.campaignPrice > 0 &&
      selectedPortion.campaignPrice < selectedPortion.price
    ) {
      return selectedPortion.campaignPrice;
    }
    // Non-special, non-campaign → base price from the active menu's
    // `priceListType` ("Happy Hour"), falling back to the normal price.
    return resolveActiveBasePrice(selectedPortion);
  }, [restaurant.isSpecialPriceActive, product.isCampaign, selectedPortion]);

  const originalPrice =
    displayPrice !== selectedPortion.price ? selectedPortion.price : null;

  const tagTotal = Object.values(selectedTags)
    .flat()
    .reduce((sum, tag) => sum + tag.price * tag.quantity, 0);
  const totalPrice = (displayPrice + tagTotal) * quantity;

  const handleTagSelect = useCallback(
    (tag: OrderTag, item: OrderTagItem) => {
      setSelectedTags((prev) => {
        const currentTagItems = prev[tag.id] || [];
        const existingIndex = currentTagItems.findIndex((t) => t.itemId === item.id);
        if (existingIndex >= 0) {
          if (item.isMandatory) {
            toast.error(t("product.mandatoryTagItem", { name: item.name }));
            return prev;
          }
          if (getEffectiveTagBounds(tag).max === 1) {
            return { ...prev, [tag.id]: [] };
          }
          return {
            ...prev,
            [tag.id]: currentTagItems.filter((t) => t.itemId !== item.id),
          };
        }
        const newItem: SelectedTagItem = {
          tagId: tag.id,
          tagName: tag.name,
          itemId: item.id,
          itemName: item.name,
          price: item.price,
          quantity: Math.max(1, item.minQuantity || 1),
        };
        if (getEffectiveTagBounds(tag).max === 1) {
          return { ...prev, [tag.id]: [newItem] };
        }
        if (getEffectiveTagBounds(tag).max > 0 && currentTagItems.length >= getEffectiveTagBounds(tag).max) {
          // Use the same key the shared modal uses, so locales stay in sync.
          toast.error(t("product.maxSelectionError", { max: getEffectiveTagBounds(tag).max }));
          return prev;
        }
        return { ...prev, [tag.id]: [...currentTagItems, newItem] };
      });
    },
    [t],
  );

  /* Adjust quantity for a selected tag item (when item.maxQuantity > 1).
   * Mirrors handleTagItemQuantity in the shared modal: clamps to
   * [1, maxQuantity]; deselect happens via the outer chip click. */
  const handleTagItemQuantity = useCallback(
    (tag: OrderTag, item: OrderTagItem, delta: number) => {
      setSelectedTags((prev) => {
        const currentTagItems = prev[tag.id] || [];
        const idx = currentTagItems.findIndex((s) => s.itemId === item.id);
        if (idx < 0) return prev;
        const current = currentTagItems[idx];
        const minQty = item.minQuantity || 1;
        const maxQty = item.maxQuantity || 99;
        const newQty = current.quantity + delta;
        if (newQty < Math.max(1, minQty)) return prev;
        if (newQty > maxQty) {
          toast.error(t("product.maxQuantityError", { name: current.itemName, max: maxQty }));
          return prev;
        }
        return {
          ...prev,
          [tag.id]: currentTagItems.map((s, i) =>
            i === idx ? { ...s, quantity: newQty } : s,
          ),
        };
      });
    },
    [t],
  );

  const validateTags = useCallback((): { ok: boolean; message?: string } => {
    for (const tag of selectedPortion.orderTags) {
      if (tag.freeTagging) continue;
      const picks = selectedTags[tag.id] || [];
      // Group-level minimum — counts total quantity (3x one item counts as 3).
      const bounds = getEffectiveTagBounds(tag);
      if (bounds.min > 0) {
        const count = picks.reduce((sum, it) => sum + (it.quantity || 1), 0);
        if (count < bounds.min) {
          return { ok: false, message: t("product.minSelectionError", { name: tag.name, min: bounds.min }) };
        }
      }
      // All mandatory items must be selected.
      const mandatoryItems = tag.orderTagItems.filter((it) => it.isMandatory);
      if (mandatoryItems.length > 0 && !mandatoryItems.every((mi) => picks.some((p) => p.itemId === mi.id))) {
        return { ok: false, message: `${tag.name} ${t("product.mandatoryGroup", "zorunlu")}` };
      }
    }
    return { ok: true };
  }, [selectedPortion, selectedTags, t]);

  const handleAddToCart = useCallback(() => {
    if (!canAddToCart) {
      toast.error(t("common.closedHours"));
      return;
    }
    const v = validateTags();
    if (!v.ok) {
      toast.error(v.message);
      return;
    }
    if (addButtonRef.current) {
      const rect = addButtonRef.current.getBoundingClientRect();
      triggerFlyingEmoji(rect.left + rect.width / 2, rect.top);
    }
    const allSelectedTags = Object.values(selectedTags).flat();
    const currentFreeTagIds = new Set(
      selectedPortion.orderTags.filter((t) => t.freeTagging).map((t) => t.id),
    );
    const freeLines = Object.entries(freeTagNotes)
      .filter(([tagId]) => currentFreeTagIds.has(tagId))
      .map(([, text]) => text.trim())
      .filter(Boolean);
    const finalNote = [...freeLines, productNote.trim()].filter(Boolean).join(" | ");
    addItem(product, selectedPortion, allSelectedTags, quantity, finalNote || undefined);
    onClose();
  }, [
    addItem,
    canAddToCart,
    freeTagNotes,
    onClose,
    product,
    productNote,
    quantity,
    selectedPortion,
    selectedTags,
    t,
    triggerFlyingEmoji,
    validateTags,
  ]);

  /* Description with "More" affordance */
  const desc = product.description || "";
  const isLongDesc = desc.length > 140;
  const visibleDesc =
    showFullDesc || !isLongDesc ? desc : desc.slice(0, 140).trimEnd() + "…";

  const hasPortions = product.portions.length > 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        // touch-none: drag on backdrop must not scroll the page below.
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm touch-none"
      />
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed left-2 right-2 bottom-2 z-50 max-h-[calc(100dvh-8px)] bg-card rounded-[32px] flex flex-col shadow-mega overflow-hidden"
      >
        {/* Close — red circle with white X (replaces the back-arrow
         *  affordance; universal close vocabulary reads instantly on
         *  any card background and gives a stronger visual exit cue
         *  than a thin arrow icon).
         *
         *  touch-none: this non-scrollable header strip is OUTSIDE the
         *  scroll container below, so drags here would otherwise bleed
         *  out as page scrolls on iOS Safari. */}
        <div className="px-5 pt-4 shrink-0 touch-none">
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-[hsl(0,75%,55%)] hover:bg-[hsl(0,75%,45%)] flex items-center justify-center transition-colors shadow-[0_2px_8px_hsla(0,75%,30%,0.35)]"
          >
            <X className="w-5 h-5 text-white" strokeWidth={2.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-32">
          {/* Hero image with qty badge */}
          <div className="relative mt-2 mx-auto w-full max-w-[280px] aspect-square">
            <img
              src={getProductImageSrc(product.imageURL)}
              onError={handleProductImageError}
              alt={product.name}
              className="w-full h-full object-cover rounded-2xl"
              loading="eager"
              decoding="async"
            />
            <div
              className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-[hsl(var(--brand-orange))] text-white font-bold text-lg flex items-center justify-center shadow-lg ring-4 ring-card"
              aria-label={`${quantity}`}
            >
              {quantity}
            </div>
          </div>

          {/* Title */}
          <h2 className="mt-4 text-center text-2xl font-bold text-foreground tracking-tight px-2">
            {product.name}
          </h2>

          {/* Explicit portion buttons — pill row, active orange */}
          {hasPortions && (
            <div className="mt-3 flex justify-center gap-2 flex-wrap">
              {product.portions.map((p) => {
                const isActive = selectedPortion.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPortion(p)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-[hsl(var(--brand-orange))] text-white shadow-md"
                        : "bg-[hsl(var(--brand-orange-soft))] text-[hsl(var(--brand-orange))] hover:opacity-80",
                    )}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Price + qty controls */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-md bg-[hsl(var(--brand-orange))] text-white flex items-center justify-center shadow-sm disabled:opacity-40 transition-opacity"
              aria-label="Decrease"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground tabular-nums">
                {formatPrice(totalPrice)}
              </span>
              {originalPrice && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(originalPrice * quantity)}
                </span>
              )}
            </div>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-md bg-[hsl(var(--brand-orange))] text-white flex items-center justify-center shadow-sm transition-opacity hover:opacity-90"
              aria-label="Increase"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Calorie / prep-time badges — on the same price band as the
              centered total above. The price here is centered between the
              ± steppers (no left/right pin), so badges sit centered just
              below it (graceful: hidden when both values are 0/absent). */}
          <ProductBadges product={product} size="md" className="mt-3 justify-center" />

          {/* About */}
          {desc && (
            <>
              <h3 className="mt-6 text-center text-base font-bold text-foreground">
                {t("product.about", "Hakkında")}
              </h3>
              <p className="mt-2 text-center text-xs text-muted-foreground leading-relaxed">
                {visibleDesc}
                {isLongDesc && !showFullDesc && (
                  <button
                    onClick={() => setShowFullDesc(true)}
                    className="ml-1 text-[hsl(var(--brand-orange))] font-semibold"
                  >
                    {t("product.readMore", "Daha fazla")}
                  </button>
                )}
              </p>
            </>
          )}

          {/* Order tag groups (mandatory + optional + freeTagging).
              Regular tag groups are product INFO and always show (so the
              options + prices are visible even when ordering is off);
              free-text note fields only make sense when ordering is
              possible. Mirrors the shared ProductDetailModal. */}
          {selectedPortion.orderTags.some((tag) => !tag.freeTagging || canOrderAtAll) && (
            <div className="mt-6 space-y-4">
              {selectedPortion.orderTags
                .filter((tag) => !tag.freeTagging || canOrderAtAll)
                .map((tag) => {
                if (tag.freeTagging) {
                  return (
                    <div key={tag.id}>
                      <p className="text-xs font-semibold text-foreground mb-1.5">
                        {tag.name}
                      </p>
                      <Textarea
                        value={freeTagNotes[tag.id] || ""}
                        onChange={(e) =>
                          setFreeTagNotes((prev) => ({
                            ...prev,
                            [tag.id]: e.target.value,
                          }))
                        }
                        placeholder={t("product.freeTagPlaceholder")}
                        className="min-h-[60px] text-xs"
                      />
                    </div>
                  );
                }
                const bounds = getEffectiveTagBounds(tag);
                const selectedCount = (selectedTags[tag.id] || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
                const isUnfulfilled = bounds.min > 0 && selectedCount < bounds.min;
                const requirementLabel = bounds.min > 1
                  ? t("product.selectAtLeast", { count: bounds.min })
                  : t("common.required");
                return (
                  <div key={tag.id}>
                    <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-2">
                      <span>{tag.name}</span>
                      {isUnfulfilled && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[hsl(var(--brand-orange-soft))] text-[hsl(var(--brand-orange))]">
                          {requirementLabel}
                        </span>
                      )}
                    </p>
                    {/* Touch-friendly pills (~36 px tall) + inline qty
                        stepper for items whose maxQuantity > 1, so a
                        customer can pick e.g. "Extra Şiş ×3". Tapping
                        the name region toggles select; ± stop
                        propagation so they only adjust the quantity. */}
                    <div className="flex gap-2 flex-wrap">
                      {tag.orderTagItems.map((item) => {
                        const selectedItem = (selectedTags[tag.id] || []).find(
                          (s) => s.itemId === item.id,
                        );
                        const isSelected = !!selectedItem;
                        const qty = selectedItem?.quantity ?? 0;
                        const showStepper = isSelected && item.maxQuantity > 1;
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "inline-flex items-center rounded-full text-sm font-medium transition-colors overflow-hidden",
                              isSelected
                                ? "bg-[hsl(var(--brand-orange))] text-white"
                                : "bg-[hsl(var(--brand-orange-soft))] text-[hsl(var(--brand-orange))]",
                              item.isMandatory && "ring-1 ring-[hsl(var(--brand-orange))]/40",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => handleTagSelect(tag, item)}
                              className="flex items-center gap-1.5 px-3.5 py-2 min-h-[36px]"
                            >
                              {isSelected && !showStepper && <Check className="w-4 h-4" />}
                              <span>{item.name}</span>
                              {shouldShowTagItemPrice(item) && (
                                <span className="opacity-70">
                                  {formatPriceWithSign(item.price * (qty || 1))}
                                </span>
                              )}
                            </button>
                            {showStepper && (
                              <div className="flex items-center gap-1.5 pr-1.5 pl-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTagItemQuantity(tag, item, -1);
                                  }}
                                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                                  aria-label="decrease quantity"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="font-bold min-w-[14px] text-center">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTagItemQuantity(tag, item, 1);
                                  }}
                                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                                  aria-label="increase quantity"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Note — only when the product permits notes (matches shared modal behavior) */}
          {canOrderAtAll && product.isNoteAllowed && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-foreground mb-1.5">
                {t("product.note")} ({t("common.optional", "isteğe bağlı")})
              </p>
              <Textarea
                value={productNote}
                onChange={(e) => setProductNote(e.target.value)}
                placeholder={t("product.notePlaceholder")}
                className="min-h-[60px] text-xs"
              />
            </div>
          )}

          {/* Allergens */}
          <div className="mt-5">
            <AllergensSection product={product} />
          </div>
        </div>

        {/* ADD TO CART — full-width sticky bottom */}
        {canAddToCart && (
          <div className="absolute left-0 right-0 bottom-0 p-4 bg-card border-t border-border">
            <button
              ref={addButtonRef}
              onClick={handleAddToCart}
              className="w-full bg-[hsl(var(--brand-orange))] hover:opacity-90 transition-opacity text-white font-bold tracking-wider py-3.5 rounded-xl shadow-lg uppercase text-sm"
            >
              {t("cart.add", "Sepete Ekle")} — {formatPrice(totalPrice)}
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
