/**
 * Theme-27 Kiosk — ProductDetailModal (local copy)
 *
 * Differences from the shared component:
 *   1. Opens centered vertically & horizontally (not bottom-sheet)
 *   2. Clicking outside the modal does NOT close it — only X button
 *      or "Add to Cart" closes the modal.
 *   3. Scale-in animation instead of slide-up.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Check, MessageSquare } from 'lucide-react';
import { Product, Portion, OrderTag, OrderTagItem, SelectedTagItem } from '@/types/restaurant';
import { getActivePriceListType, resolveBasePrice } from '@/lib/priceList';
import { AllergensSection } from '@/components/menu/AllergensSection';
import { useCart } from '@/hooks/useCart';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useFlyingEmoji } from '@/hooks/useFlyingEmoji';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getProductImageSrc, handleProductImageError } from '@/lib/productImage';
import { toast } from 'sonner';
import { getEffectiveTagBounds, shouldShowTagItemPrice } from "@/lib/orderTag";
import { VirtualKeyboard } from './VirtualKeyboard';

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
  const [keyboardTarget, setKeyboardTarget] = useState<string | null>(null);
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
      const cap = getEffectiveTagBounds(tag).max > 0 ? getEffectiveTagBounds(tag).max : defaultItems.length;
      defaults[tag.id] = defaultItems.slice(0, cap);
    });
    setSelectedTags(defaults);
  }, [selectedPortion]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const canAddToCart = isRestaurantActive && isCurrentlyOpen;
  const canOrderAtAll = !!(restaurant.onlineOrder || restaurant.inPersonOrder);

  // Get display price
  const getDisplayPrice = (portion: Portion) => {
    if (restaurant.isSpecialPriceActive && portion.specialPrice != null) {
      return portion.specialPrice;
    }
    if (
      product.isCampaign &&
      portion.campaignPrice != null &&
      portion.campaignPrice > 0 &&
      portion.campaignPrice < portion.price
    ) {
      return portion.campaignPrice;
    }
    // When special pricing is OFF at restaurant level, don't let
    // menu-level priceListType="special" override normal prices
    const plt = getActivePriceListType();
    const effectivePlt = (!restaurant.isSpecialPriceActive && plt === 'special') ? 'normal' : plt;
    return resolveBasePrice(portion, effectivePlt);
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
        if (item.isMandatory) {
          toast.error(t('product.mandatoryTagItem', { name: item.name }));
          return prev;
        }
        if (getEffectiveTagBounds(tag).max === 1) {
          return { ...prev, [tag.id]: [] };
        }
        return { ...prev, [tag.id]: currentTagItems.filter(t => t.itemId !== item.id) };
      }

      const newItem: SelectedTagItem = {
        tagId: tag.id, tagName: tag.name,
        itemId: item.id, itemName: item.name,
        price: item.price, quantity: 1,
      };

      if (getEffectiveTagBounds(tag).max === 1) {
        return { ...prev, [tag.id]: [newItem] };
      }
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
      const orderTag = selectedPortion.orderTags.find(t => t.id === tagId);
      const orderTagItem = orderTag?.orderTagItems.find(i => i.id === itemId);
      const maxQty = orderTagItem?.maxQuantity ?? 99;

      const newQty = current.quantity + delta;
      if (newQty < 1) return prev;
      if (newQty > maxQty) {
        toast.error(t('product.maxQuantityError', { name: current.itemName, max: maxQty }));
        return prev;
      }

      return {
        ...prev,
        [tagId]: currentTagItems.map((t, i) => i === itemIndex ? { ...t, quantity: newQty } : t),
      };
    });
  };

  const isTagItemSelected = (tagId: string, itemId: string) =>
    (selectedTags[tagId] || []).some(t => t.itemId === itemId);

  const getTagItemQuantity = (tagId: string, itemId: string) =>
    (selectedTags[tagId] || []).find(t => t.itemId === itemId)?.quantity ?? 0;

  // Validate required tags
  const validateTags = useCallback((): boolean => {
    for (const tag of selectedPortion.orderTags) {
      const currentTagItems = selectedTags[tag.id] || [];
      const selectedCount = currentTagItems.length;

      if (getEffectiveTagBounds(tag).min > 0 && selectedCount < getEffectiveTagBounds(tag).min) {
        const tagElement = tagRefs.current[tag.id];
        if (tagElement) tagElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setShakingTagId(tag.id);
        setTimeout(() => setShakingTagId(null), 1500);
        toast.error(t('product.minSelectionError', { name: tag.name, min: getEffectiveTagBounds(tag).min }));
        return false;
      }

      for (const selectedItem of currentTagItems) {
        const orderTagItem = tag.orderTagItems.find(i => i.id === selectedItem.itemId);
        if (orderTagItem && orderTagItem.minQuantity > 0 && selectedItem.quantity < orderTagItem.minQuantity) {
          const tagElement = tagRefs.current[tag.id];
          if (tagElement) tagElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    const finalNote = [...freeLines, productNote.trim()].filter(Boolean).join(' | ');

    addItem(product, selectedPortion, allSelectedTags, quantity, finalNote || undefined);
    onClose();
  };

  return (
    <>
    <AnimatePresence>
      {/* Backdrop — NO onClick, clicking outside does NOT close.
          touch-none: drag on the dim layer must not bleed to the
          page below (kiosk runs on a touchscreen). */}
      <motion.div
        key="product-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm touch-none"
      />

      {/* Centered modal wrapper */}
      <motion.div
        key="product-modal"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="kiosk-product-modal-center"
      >
        <div className="w-[90vw] max-h-[90dvh] bg-card rounded-3xl flex flex-col shadow-2xl overflow-hidden">
          {/* Header Image — touch-none so drag on the photo doesn't
              bubble out as a background-page pan on iOS Safari. The
              image sits OUTSIDE the modal's scroll container. */}
          <div className="relative h-52 shrink-0 overflow-hidden touch-none">
            <img
              src={getProductImageSrc(product.imageURL)}
              onError={handleProductImageError}
              alt={product.name}
              width={800}
              height={416}
              loading="eager"
              decoding="async"
              // @ts-expect-error - fetchPriority is a valid HTML attribute
              fetchpriority="high"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          </div>

          {/* Scrollable content */}
          <div className="px-4 pb-20 -mt-8 relative flex-1 overflow-y-auto overscroll-contain">
            {/* Product Info */}
            <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">{product.name}</h2>
              <p className="text-muted-foreground text-sm mb-4">{product.description}</p>
              <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                <span className="text-2xl font-bold text-primary whitespace-nowrap truncate max-w-full">{formatPrice(displayPrice)}</span>
                {originalPrice && (
                  <span className="text-lg text-muted-foreground line-through whitespace-nowrap truncate max-w-full">{formatPrice(originalPrice)}</span>
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
                      onClick={() => { setSelectedPortion(portion); setSelectedTags({}); }}
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
              const selectedCount = (selectedTags[tag.id] || []).length;
              const isUnfulfilled = isRequired && selectedCount < getEffectiveTagBounds(tag).min;
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
                    <h3 className={cn("font-semibold", isShaking ? "text-destructive" : "text-foreground")}>{tag.name}</h3>
                    {isRequired && (
                      <span className={cn(
                        "px-2 py-0.5 text-xs rounded-full transition-all",
                        isShaking ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-destructive/10 text-destructive"
                      )}>
                        {t('common.required')}
                      </span>
                    )}
                    {getEffectiveTagBounds(tag).max > 1 && (
                      <span className="text-xs text-muted-foreground">
                        ({t('product.maxSelection', { max: getEffectiveTagBounds(tag).max })})
                      </span>
                    )}
                  </div>
                  {tag.freeTagging ? (
                    <div className="space-y-2">
                      <div className="mb-1">
                        <div
                          onClick={() => setKeyboardTarget(tag.id)}
                          className="w-full min-h-[52px] p-3 rounded-xl bg-background border border-input text-sm cursor-pointer select-none"
                        >
                          {freeTagNotes[tag.id] ? (
                            <span className="text-foreground">{freeTagNotes[tag.id]}</span>
                          ) : (
                            <span className="text-muted-foreground">{t('product.freeTagPlaceholder')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                    {tag.orderTagItems.map((item) => {
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
                              {selected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <span className="font-light text-[11px] tracking-wide leading-snug truncate">{item.name}</span>
                          </button>

                          <div className="flex items-center gap-2 shrink-0">
                            {selected && hasQuantityControl && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleTagItemQuantity(tag.id, item.id, -1); }}
                                  className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center border border-border"
                                >
                                  <Minus className="w-3.5 h-3.5 text-foreground" />
                                </button>
                                <span className="text-sm font-bold w-5 text-center">{qty}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleTagItemQuantity(tag.id, item.id, 1); }}
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
                  )}
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
                <div
                  onClick={() => setKeyboardTarget('productNote')}
                  className="w-full min-h-[52px] p-3 rounded-xl bg-background border border-input text-sm cursor-pointer select-none"
                >
                  {productNote ? (
                    <span className="text-foreground">{productNote}</span>
                  ) : (
                    <span className="text-muted-foreground">{t('product.notePlaceholder')}</span>
                  )}
                </div>
              </div>
            )}

            {/* Allergens */}
            <AllergensSection product={product} />
          </div>

          {/* Sticky bottom bar — quantity (centered) + Add to Cart */}
          <div className="sticky bottom-0 left-0 right-0 px-4 py-3 bg-card border-t border-border flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
                aria-label="decrease quantity"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-base font-bold w-8 text-center">{quantity}</span>
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

              if (!canOrderAtAll) {
                return (
                  <div className="w-full h-11 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-between gap-2 px-4">
                    <span className={`${labelSize} font-medium opacity-80 shrink-0 whitespace-nowrap`}>
                      {t('common.total', 'Toplam')}
                    </span>
                    <span className={`${priceSize} font-bold whitespace-nowrap truncate min-w-0`}>{priceStr}</span>
                  </div>
                );
              }
              return (
                <div className="flex gap-2 w-full">
                  <Button
                    ref={addButtonRef}
                    onClick={handleAddToCart}
                    size="default"
                    className="flex-1 min-w-0 h-14 rounded-xl kiosk-add-to-cart-btn"
                  >
                    <span className="flex items-center justify-between gap-2 w-full">
                      <span className={`${priceSize} font-bold text-left shrink-0 whitespace-nowrap kiosk-add-to-cart-label`}>
                        🧺 {t('product.addToCart')}
                      </span>
                      <span className={`${priceSize} font-bold whitespace-nowrap truncate min-w-0`}>{priceStr}</span>
                    </span>
                  </Button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-14 px-5 rounded-xl kiosk-cancel-btn whitespace-nowrap"
                  >
                    {t('common.cancel', 'Vazgeç')}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>

    <AnimatePresence>
      {keyboardTarget && (
        <VirtualKeyboard
          value={keyboardTarget === 'productNote' ? productNote : (freeTagNotes[keyboardTarget] || '')}
          onChange={(val) => {
            if (keyboardTarget === 'productNote') setProductNote(val);
            else setFreeTagNotes(prev => ({ ...prev, [keyboardTarget]: val }));
          }}
          onClose={() => setKeyboardTarget(null)}
          placeholder={keyboardTarget === 'productNote' ? t('product.notePlaceholder') : t('product.freeTagPlaceholder')}
          title={keyboardTarget === 'productNote' ? `${t('product.note')} (${t('common.optional')})` : undefined}
        />
      )}
    </AnimatePresence>
    </>
  );
}
