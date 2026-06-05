import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Check, MessageSquare } from 'lucide-react';
import { Product, Portion, OrderTag, OrderTagItem, SelectedTagItem } from '@/types/restaurant';
import { resolveActiveBasePrice } from '@/lib/priceList';
import { AllergensSection } from '@/components/menu/AllergensSection';
import { useCart } from '@/hooks/useCart';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useFlyingEmoji } from '@/hooks/useFlyingEmoji';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getProductImageSrc, handleProductImageError } from '@/lib/productImage';
import { toast } from 'sonner';
import { getEffectiveTagBounds, shouldShowTagItemPrice } from "@/lib/orderTag";

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

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
  const [productNote, setProductNote] = useState('');
  const [shakingTagId, setShakingTagId] = useState<string | null>(null);
  const tagRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-select default (isDefault) tag items whenever the active portion changes.
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
      // Respect group max — keep at most maxSelected (1 for single-select).
      const cap = getEffectiveTagBounds(tag).max > 0 ? getEffectiveTagBounds(tag).max : defaultItems.length;
      defaults[tag.id] = defaultItems.slice(0, cap);
    });
    setSelectedTags(defaults);
    // NOTE: freeTagNotes is intentionally NOT reset here. If the customer
    // typed a free-tagging note and then switched portions, we keep their
    // text so they don't lose it. Notes that belong to free-tags not
    // present in the new portion are still kept in state but hidden from
    // the UI, and filtered out at add-to-cart time so they don't pollute
    // the order note.
  }, [selectedPortion]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const canAddToCart = isRestaurantActive && isCurrentlyOpen;
  // Whether ordering is enabled at all for this restaurant. When both order
  // types are disabled, the modal renders in a view-only mode (no tags/note,
  // no add-to-cart button) — customer can still see how price scales by qty.
  const canOrderAtAll = !!(restaurant.onlineOrder || restaurant.inPersonOrder);

  // Get display price
  const getDisplayPrice = (portion: Portion) => {
    if (restaurant.isSpecialPriceActive && portion.specialPrice != null) {
      return portion.specialPrice;
    }
    // Mirror the campaign-validity rule from useRestaurant + useCart:
    // a campaign price applies only when it's strictly > 0 AND strictly
    // less than the base price. Misconfigured entries fall through to
    // the normal price so the modal can't show a bogus discount.
    if (
      product.isCampaign &&
      portion.campaignPrice != null &&
      portion.campaignPrice > 0 &&
      portion.campaignPrice < portion.price
    ) {
      return portion.campaignPrice;
    }
    // Non-special, non-campaign → base price dictated by the active
    // menu's `priceListType` ("Happy Hour" pricing), with a fallback
    // to the normal price when no menu is active or the selected
    // price column is empty.
    return resolveActiveBasePrice(portion);
  };

  const displayPrice = getDisplayPrice(selectedPortion);
  const originalPrice = displayPrice !== selectedPortion.price ? selectedPortion.price : null;

  // Calculate tag total
  const tagTotal = Object.values(selectedTags).flat().reduce((sum, tag) => sum + (tag.price * tag.quantity), 0);
  const totalPrice = (displayPrice + tagTotal) * quantity;

  // Handle tag selection
  const handleTagSelect = (tag: OrderTag, item: OrderTagItem) => {
    setSelectedTags(prev => {
      const currentTagItems = prev[tag.id] || [];
      const existingIndex = currentTagItems.findIndex(t => t.itemId === item.id);

      if (existingIndex >= 0) {
        // Mandatory items cannot be deselected.
        if (item.isMandatory) {
          toast.error(t('product.mandatoryTagItem', { name: item.name }));
          return prev;
        }
        // Remove if already selected (for single select) or toggle off
        if (getEffectiveTagBounds(tag).max === 1) {
          return { ...prev, [tag.id]: [] };
        }
        return {
          ...prev,
          [tag.id]: currentTagItems.filter(t => t.itemId !== item.id),
        };
      }

      // Add new selection
      const startQty = 1;
      const newItem: SelectedTagItem = {
        tagId: tag.id,
        tagName: tag.name,
        itemId: item.id,
        itemName: item.name,
        price: item.price,
        quantity: startQty,
      };

      if (getEffectiveTagBounds(tag).max === 1) {
        // Single select - replace
        return { ...prev, [tag.id]: [newItem] };
      }

      // Multi select - check max
      if (currentTagItems.length >= getEffectiveTagBounds(tag).max) {
        toast.error(t('product.maxSelectionError', { max: getEffectiveTagBounds(tag).max }));
        return prev;
      }

      return { ...prev, [tag.id]: [...currentTagItems, newItem] };
    });
  };

  // Handle tag item quantity change
  const handleTagItemQuantity = (tagId: string, itemId: string, delta: number) => {
    setSelectedTags(prev => {
      const currentTagItems = prev[tagId] || [];
      const itemIndex = currentTagItems.findIndex(t => t.itemId === itemId);
      if (itemIndex < 0) return prev;

      const current = currentTagItems[itemIndex];
      // Find the original OrderTagItem for min/max bounds
      const orderTag = selectedPortion.orderTags.find(t => t.id === tagId);
      const orderTagItem = orderTag?.orderTagItems.find(i => i.id === itemId);
      const minQty = orderTagItem?.minQuantity ?? 0;
      const maxQty = orderTagItem?.maxQuantity ?? 99;

      const newQty = current.quantity + delta;

      // Don't go below 1
      if (newQty < 1) {
        return prev;
      }

      // Don't exceed maxQuantity
      if (newQty > maxQty) {
        toast.error(t('product.maxQuantityError', { name: current.itemName, max: maxQty }));
        return prev;
      }

      return {
        ...prev,
        [tagId]: currentTagItems.map((t, i) =>
          i === itemIndex ? { ...t, quantity: newQty } : t
        ),
      };
    });
  };

  const isTagItemSelected = (tagId: string, itemId: string) => {
    return (selectedTags[tagId] || []).some(t => t.itemId === itemId);
  };

  const getTagItemQuantity = (tagId: string, itemId: string) => {
    return (selectedTags[tagId] || []).find(t => t.itemId === itemId)?.quantity ?? 0;
  };

  // Validate required tags and scroll to first invalid one
  const validateTags = useCallback((): boolean => {
    for (const tag of selectedPortion.orderTags) {
      const currentTagItems = selectedTags[tag.id] || [];
      // Count total quantity (3× one item counts as 3), not distinct items,
      // so a group min like "pick at least 4" is satisfied by summed quantities.
      const selectedCount = currentTagItems.reduce((sum, it) => sum + (it.quantity || 1), 0);
      
      // Check group-level minSelected
      if (getEffectiveTagBounds(tag).min > 0 && selectedCount < getEffectiveTagBounds(tag).min) {
        const tagElement = tagRefs.current[tag.id];
        if (tagElement) {
          tagElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setShakingTagId(tag.id);
        setTimeout(() => setShakingTagId(null), 1500);
        toast.error(t('product.minSelectionError', { name: tag.name, min: getEffectiveTagBounds(tag).min }));
        return false;
      }

      // Check per-item minQuantity for selected items
      for (const selectedItem of currentTagItems) {
        const orderTagItem = tag.orderTagItems.find(i => i.id === selectedItem.itemId);
        if (orderTagItem && orderTagItem.minQuantity > 0 && selectedItem.quantity < orderTagItem.minQuantity) {
          const tagElement = tagRefs.current[tag.id];
          if (tagElement) {
            tagElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          setShakingTagId(tag.id);
          setTimeout(() => setShakingTagId(null), 1500);
          toast.error(t('product.minQuantityError', { name: selectedItem.itemName, min: orderTagItem.minQuantity }));
          return false;
        }
      }
    }
    return true;
  }, [selectedPortion.orderTags, selectedTags, t]);

  const handleAddToCart = () => {
    if (!canAddToCart) {
      toast.error(t('order.cannotAddOutsideHours'));
      return;
    }
    if (!validateTags()) return;

    // Trigger flying emoji animation
    if (addButtonRef.current) {
      const rect = addButtonRef.current.getBoundingClientRect();
      triggerFlyingEmoji(rect.left + rect.width / 2, rect.top);
    }

    const allSelectedTags = Object.values(selectedTags).flat();

    // Merge per-tag-group free-tagging notes into the product note so the
    // backend sees them via the existing `note` field. Only notes whose
    // free-tag still exists in the currently selected portion are sent —
    // a customer might have typed notes for a different portion and then
    // switched, in which case those stale notes shouldn't go through.
    const currentFreeTagIds = new Set(
      selectedPortion.orderTags.filter((t) => t.freeTagging).map((t) => t.id),
    );
    const freeLines = Object.entries(freeTagNotes)
      .filter(([tagId]) => currentFreeTagIds.has(tagId))
      .map(([, text]) => text.trim())
      .filter(Boolean);
    const finalNote = [...freeLines, productNote.trim()].filter(Boolean).join(' | ');

    addItem(product, selectedPortion, allSelectedTags, quantity, finalNote || undefined);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        // touch-none: drag-attempts on the dim backdrop must NOT scroll
        // the underlying page (iOS rubber-band leak). Taps still close
        // the modal because touch-action: none only blocks gestures,
        // not click events.
        className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm touch-none"
      />
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed left-[3px] right-[3px] bottom-[3px] z-50 max-h-[calc(100dvh-6px)] bg-card rounded-3xl flex flex-col"
      >
        {/* Header Image — touch-none so dragging on the photo doesn't
            bubble out as a page scroll on iOS Safari. The image isn't
            inside the overflow-y-auto scroll container, so without
            this drags here cause background bleed. */}
        <div className="relative h-56 shrink-0 rounded-t-[15px] overflow-hidden touch-none">
          <img
            src={getProductImageSrc(product.imageURL)}
            onError={handleProductImageError}
            alt={product.name}
            width={800}
            height={448}
            loading="eager"
            decoding="async"
            // @ts-expect-error - fetchPriority is a valid HTML attribute
            fetchpriority="high"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-red-100 backdrop-blur flex items-center justify-center shadow-lg"
          >
            <X className="w-5 h-5 text-red-500" />
          </button>
        </div>

        <div className="px-4 pb-20 -mt-8 relative flex-1 overflow-y-auto overscroll-contain">
          {/* Product Info */}
          <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              {product.name}
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              {product.description}
            </p>
            
            {/* Price */}
            <div className="flex items-baseline gap-2 flex-wrap min-w-0">
              <span className="text-2xl font-bold text-primary whitespace-nowrap truncate max-w-full">
                {formatPrice(displayPrice)}
              </span>
              {originalPrice && (
                <span className="text-lg text-muted-foreground line-through whitespace-nowrap truncate max-w-full">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Portion Selection */}
          {product.portions.length > 1 && (
            <div className="mb-4">
              <h3 className="font-semibold text-foreground mb-3">{t('product.portionSelect')}</h3>
              <div className="grid grid-cols-2 gap-2">
                {product.portions.map((portion) => (
                  <button
                    key={portion.id}
                    onClick={() => {
                      setSelectedPortion(portion);
                      setSelectedTags({});
                    }}
                    className={cn(
                      'px-3 py-2 rounded-xl text-[12px] font-medium transition-all min-w-0',
                      'flex flex-col items-center justify-center leading-tight text-center',
                      selectedPortion.id === portion.id
                        ? 'bg-primary text-primary-foreground shadow-glow'
                        : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    <span className="whitespace-nowrap">{portion.name}</span>
                    <span className="whitespace-nowrap">{formatPrice(getDisplayPrice(portion))}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Order Tags */}
          {selectedPortion.orderTags.filter((tag) => !tag.freeTagging || canOrderAtAll).map((tag) => {
            const isRequired = getEffectiveTagBounds(tag).min > 0;
            const selectedCount = (selectedTags[tag.id] || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
            const isUnfulfilled = isRequired && selectedCount < getEffectiveTagBounds(tag).min;
            // A required group whose minimum is > 1 spells out the count
            // ("En az 2 tane seçin") instead of the generic "Zorunlu Seçim".
            const requirementLabel = getEffectiveTagBounds(tag).min > 1
              ? t('product.selectAtLeast', { count: getEffectiveTagBounds(tag).min })
              : t('common.required');
            const isShaking = shakingTagId === tag.id;
            
            return (
              <div 
                key={tag.id} 
                ref={(el) => (tagRefs.current[tag.id] = el)}
                className={cn(
                  "mb-4 p-3 rounded-xl transition-all",
                  isShaking && "animate-shake bg-destructive/5 ring-2 ring-destructive"
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <h3 className={cn(
                    "font-semibold",
                    isShaking ? "text-destructive" : "text-foreground"
                  )}>{tag.name}</h3>
                  {isUnfulfilled && (
                    <span className={cn(
                      "px-2 py-0.5 text-xs rounded-full transition-all",
                      isShaking
                        ? "bg-destructive text-destructive-foreground animate-pulse"
                        : "bg-destructive/10 text-destructive"
                    )}>
                      {requirementLabel}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {tag.freeTagging && (
                    <div className="mb-1">
                      <Textarea
                        value={freeTagNotes[tag.id] || ''}
                        onChange={(e) =>
                          setFreeTagNotes((prev) => ({ ...prev, [tag.id]: e.target.value }))
                        }
                        placeholder={t('product.freeTagPlaceholder')}
                        className="rounded-xl resize-none text-sm"
                        rows={2}
                      />
                    </div>
                  )}
                {!tag.freeTagging && tag.orderTagItems.map((item) => {
                    const selected = isTagItemSelected(tag.id, item.id);
                    const qty = getTagItemQuantity(tag.id, item.id);
                    const hasQuantityControl = item.maxQuantity > 1;
                    
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all',
                          selected
                            ? 'bg-primary/10 border-2 border-primary'
                            : isShaking && isUnfulfilled
                              ? 'bg-secondary border-2 border-destructive/50 animate-pulse'
                              : 'bg-secondary border-2 border-transparent'
                        )}
                      >
                        <button
                          onClick={() => handleTagSelect(tag, item)}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <div className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                            selected
                              ? 'bg-primary border-primary'
                              : isShaking && isUnfulfilled
                                ? 'border-destructive'
                                : 'border-muted-foreground/30'
                          )}>
                            {selected && (
                              <Check className="w-3 h-3 text-primary-foreground" />
                            )}
                          </div>
                          <span className="font-light text-[11px] tracking-wide leading-snug truncate">{item.name}</span>
                        </button>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Quantity controls for selected items with maxQuantity > 1 */}
                          {selected && hasQuantityControl && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTagItemQuantity(tag.id, item.id, -1);
                                }}
                                className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center border border-border"
                              >
                                <Minus className="w-3.5 h-3.5 text-foreground" />
                              </button>
                              <span className="text-sm font-bold w-5 text-center">{qty}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTagItemQuantity(tag.id, item.id, 1);
                                }}
                                className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {shouldShowTagItemPrice(item) && (
                            <span className="text-sm text-muted-foreground dark:text-white whitespace-nowrap truncate min-w-0">
                              {formatPriceWithSign(item.price * (qty || 1))}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Product Note */}
          {product.isNoteAllowed && (
            <div className="mb-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {t('product.note')} ({t('common.optional')})
              </h3>
              <Textarea
                placeholder={t('product.notePlaceholder')}
                value={productNote}
                onChange={(e) => setProductNote(e.target.value)}
                className="rounded-xl resize-none"
                rows={2}
              />
            </div>
          )}

          {/* Allergens (EU 14 + Türk Gıda Kodeksi) */}
          <AllergensSection product={product} />

        </div>

        {/* Sticky bottom bar — quantity controls + Add to Cart */}
        <div className="sticky bottom-0 left-0 right-0 px-4 py-3 bg-card border-t border-border flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
              aria-label="decrease quantity"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="text-base font-bold w-6 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
              aria-label="increase quantity"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {(() => {
            const priceStr = formatPrice(totalPrice);
            const veryLong = priceStr.length > 12;
            const long = priceStr.length > 9;
            const labelSize = veryLong ? 'text-[9px]' : long ? 'text-[10px]' : 'text-[11px]';
            const priceSize = veryLong ? 'text-[11px]' : long ? 'text-[13px]' : 'text-[15px]';
            // View-only price tile when ordering is disabled
            if (!canOrderAtAll) {
              return (
                <div className="flex-1 min-w-0 h-11 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-between gap-2 px-4">
                  <span className={`flex flex-col leading-tight ${labelSize} font-medium opacity-80 text-left shrink-0`}>
                    <span className="whitespace-nowrap">{t('common.total', 'Toplam')}</span>
                  </span>
                  <span className={`${priceSize} font-bold whitespace-nowrap truncate min-w-0`}>
                    {priceStr}
                  </span>
                </div>
              );
            }
            return (
              <Button
                ref={addButtonRef}
                onClick={handleAddToCart}
                size="default"
                className="flex-1 min-w-0 h-11 rounded-xl shadow-glow"
              >
                <span className="flex items-center justify-between gap-2 w-full">
                  <span className={`flex flex-col leading-tight ${labelSize} font-medium opacity-90 text-left shrink-0`}>
                    {(() => {
                      const [first, ...rest] = t('product.addToCart').split(' ');
                      return (
                        <>
                          <span className="whitespace-nowrap">{first}</span>
                          {rest.length > 0 && <span className="whitespace-nowrap">{rest.join(' ')}</span>}
                        </>
                      );
                    })()}
                  </span>
                  <span className={`${priceSize} font-bold whitespace-nowrap truncate min-w-0`}>
                    {priceStr}
                  </span>
                </span>
              </Button>
            );
          })()}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
