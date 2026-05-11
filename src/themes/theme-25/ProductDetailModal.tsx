import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Minus, Plus, Check } from "lucide-react";
import { Product, Portion, OrderTag, OrderTagItem, SelectedTagItem } from "@/types/restaurant";
import { AllergensSection } from "@/components/menu/AllergensSection";
import { useCart } from "@/hooks/useCart";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useFlyingEmoji } from "@/hooks/useFlyingEmoji";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getProductImageSrc, handleProductImageError } from "@/lib/productImage";
import { toast } from "sonner";

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
  const { restaurant, formatPrice, isRestaurantActive, isCurrentlyOpen } = useRestaurant();
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
      const cap = tag.maxSelected > 0 ? tag.maxSelected : defaultItems.length;
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
    if (product.isCampaign && selectedPortion.campaignPrice != null) {
      return selectedPortion.campaignPrice;
    }
    return selectedPortion.price;
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
          if (tag.maxSelected === 1) {
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
        if (tag.maxSelected === 1) {
          return { ...prev, [tag.id]: [newItem] };
        }
        if (tag.maxSelected > 0 && currentTagItems.length >= tag.maxSelected) {
          // Use the same key the shared modal uses, so locales stay in sync.
          toast.error(t("product.maxSelectionError", { max: tag.maxSelected }));
          return prev;
        }
        return { ...prev, [tag.id]: [...currentTagItems, newItem] };
      });
    },
    [t],
  );

  const validateMandatoryTags = useCallback((): { ok: boolean; missing?: string } => {
    for (const tag of selectedPortion.orderTags) {
      if (tag.freeTagging) continue;
      const hasMandatory = tag.orderTagItems.some((it) => it.isMandatory);
      if (!hasMandatory) continue;
      const picks = selectedTags[tag.id] || [];
      const mandatoryItems = tag.orderTagItems.filter((it) => it.isMandatory);
      const allMandatorySelected = mandatoryItems.every((mi) =>
        picks.some((p) => p.itemId === mi.id),
      );
      if (!allMandatorySelected) return { ok: false, missing: tag.name };
    }
    return { ok: true };
  }, [selectedPortion, selectedTags]);

  const handleAddToCart = useCallback(() => {
    if (!canAddToCart) {
      toast.error(t("common.closedHours"));
      return;
    }
    const v = validateMandatoryTags();
    if (!v.ok) {
      toast.error(`${v.missing} ${t("product.mandatoryGroup", "zorunlu")}`);
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
    validateMandatoryTags,
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
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed left-2 right-2 bottom-2 z-50 max-h-[calc(100dvh-8px)] bg-card rounded-[32px] flex flex-col shadow-mega overflow-hidden"
      >
        {/* Back arrow */}
        <div className="px-5 pt-4 shrink-0">
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
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

          {/* Order tag groups (mandatory + optional + freeTagging) */}
          {canOrderAtAll && selectedPortion.orderTags.length > 0 && (
            <div className="mt-6 space-y-4">
              {selectedPortion.orderTags.map((tag) => {
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
                return (
                  <div key={tag.id}>
                    <p className="text-xs font-semibold text-foreground mb-1.5">
                      {tag.name}
                      {tag.maxSelected > 0 && (
                        <span className="text-muted-foreground font-normal ml-1">
                          ({t("product.maxSelections", "En fazla")} {tag.maxSelected})
                        </span>
                      )}
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {tag.orderTagItems.map((item) => {
                        const isSelected = (selectedTags[tag.id] || []).some(
                          (s) => s.itemId === item.id,
                        );
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleTagSelect(tag, item)}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                              isSelected
                                ? "bg-[hsl(var(--brand-orange))] text-white"
                                : "bg-[hsl(var(--brand-orange-soft))] text-[hsl(var(--brand-orange))]",
                              item.isMandatory && "ring-1 ring-[hsl(var(--brand-orange))]/40",
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            <span>{item.name}</span>
                            {item.price > 0 && (
                              <span className="opacity-70">+{formatPrice(item.price)}</span>
                            )}
                          </button>
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
