import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Check, MessageSquare } from 'lucide-react';
import { Product, Portion, OrderTag, OrderTagItem, SelectedTagItem } from '@/types/restaurant';
import { useCart } from '@/hooks/useCart';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useFlyingEmoji } from '@/hooks/useFlyingEmoji';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const { t } = useTranslation();
  const { restaurant, formatPrice, isRestaurantActive, isCurrentlyOpen } = useRestaurant();
  const { addItem } = useCart();
  const { triggerFlyingEmoji } = useFlyingEmoji();
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [selectedPortion, setSelectedPortion] = useState<Portion>(product.portions[0]);
  const [quantity, setQuantity] = useState(1);
  const [selectedTags, setSelectedTags] = useState<Record<string, SelectedTagItem[]>>({});
  const [productNote, setProductNote] = useState('');
  const [shakingTagId, setShakingTagId] = useState<string | null>(null);
  const tagRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const canAddToCart = isRestaurantActive && isCurrentlyOpen;

  // Get display price
  const getDisplayPrice = (portion: Portion) => {
    if (restaurant.isSpecialPriceActive && portion.specialPrice !== null) {
      return portion.specialPrice;
    }
    if (portion.campaignPrice !== null) {
      return portion.campaignPrice;
    }
    return portion.price;
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
        // Remove if already selected (for single select) or toggle off
        if (tag.maxSelected === 1) {
          return { ...prev, [tag.id]: [] };
        }
        return {
          ...prev,
          [tag.id]: currentTagItems.filter(t => t.itemId !== item.id),
        };
      }

      // Add new selection
      const startQty = item.minQuantity > 0 ? item.minQuantity : 1;
      const newItem: SelectedTagItem = {
        tagId: tag.id,
        tagName: tag.name,
        itemId: item.id,
        itemName: item.name,
        price: item.price,
        quantity: startQty,
      };

      if (tag.maxSelected === 1) {
        // Single select - replace
        return { ...prev, [tag.id]: [newItem] };
      }

      // Multi select - check max
      if (currentTagItems.length >= tag.maxSelected) {
        toast.error(t('product.maxSelectionError', { max: tag.maxSelected }));
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

      // If decreasing below minQuantity (or below 1), remove the item
      if (newQty < Math.max(1, minQty)) {
        return {
          ...prev,
          [tagId]: currentTagItems.filter(t => t.itemId !== itemId),
        };
      }

      // Don't exceed maxQuantity
      if (newQty > maxQty) {
        toast.error(t('product.maxQuantityError', { max: maxQty }));
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
      const selectedCount = (selectedTags[tag.id] || []).length;
      if (tag.minSelected > 0 && selectedCount < tag.minSelected) {
        // Scroll to the tag section
        const tagElement = tagRefs.current[tag.id];
        if (tagElement) {
          tagElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        // Trigger shake animation
        setShakingTagId(tag.id);
        setTimeout(() => setShakingTagId(null), 1500);
        
        toast.error(t('product.minSelectionError', { name: tag.name, min: tag.minSelected }));
        return false;
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
    addItem(product, selectedPortion, allSelectedTags, quantity, productNote.trim() || undefined);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed left-[3px] right-[3px] bottom-[3px] z-50 max-h-[92vh] bg-card rounded-3xl flex flex-col"
      >
        {/* Header Image */}
        <div className="relative h-56">
          <img
            src={product.imageURL}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-red-100 backdrop-blur flex items-center justify-center shadow-lg"
          >
            <X className="w-5 h-5 text-red-500" />
          </button>
        </div>

        <div className="px-4 pb-20 -mt-8 relative flex-1 overflow-y-auto">
          {/* Product Info */}
          <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              {product.name}
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              {product.description}
            </p>
            
            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">
                {formatPrice(displayPrice)}
              </span>
              {originalPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Portion Selection */}
          {product.portions.length > 1 && (
            <div className="mb-4">
              <h3 className="font-semibold text-foreground mb-3">{t('product.portionSelect')}</h3>
              <div className="flex flex-wrap gap-2">
                {product.portions.map((portion) => (
                  <button
                    key={portion.id}
                    onClick={() => {
                      setSelectedPortion(portion);
                      setSelectedTags({});
                    }}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                      selectedPortion.id === portion.id
                        ? 'bg-primary text-primary-foreground shadow-glow'
                        : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    {portion.name} - {formatPrice(getDisplayPrice(portion))}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Order Tags */}
          {selectedPortion.orderTags.map((tag) => {
            const isRequired = tag.minSelected > 0;
            const selectedCount = (selectedTags[tag.id] || []).length;
            const isUnfulfilled = isRequired && selectedCount < tag.minSelected;
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
                  {isRequired && (
                    <span className={cn(
                      "px-2 py-0.5 text-xs rounded-full transition-all",
                      isShaking 
                        ? "bg-destructive text-destructive-foreground animate-pulse" 
                        : "bg-destructive/10 text-destructive"
                    )}>
                      {t('common.required')}
                    </span>
                  )}
                  {tag.maxSelected > 1 && (
                    <span className="text-xs text-muted-foreground">
                      ({t('product.maxSelection', { max: tag.maxSelected })})
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {tag.orderTagItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleTagSelect(tag, item)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all',
                        isTagItemSelected(tag.id, item.id)
                          ? 'bg-primary/10 border-2 border-primary'
                          : isShaking && isUnfulfilled
                            ? 'bg-secondary border-2 border-destructive/50 animate-pulse'
                            : 'bg-secondary border-2 border-transparent'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                          isTagItemSelected(tag.id, item.id)
                            ? 'bg-primary border-primary'
                            : isShaking && isUnfulfilled
                              ? 'border-destructive'
                              : 'border-muted-foreground/30'
                        )}>
                          {isTagItemSelected(tag.id, item.id) && (
                            <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                        </div>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      {item.price > 0 && (
                        <span className="text-sm text-muted-foreground">
                          +{formatPrice(item.price)}
                        </span>
                      )}
                    </button>
                  ))}
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

          {/* Quantity */}
          <div className="flex items-center justify-between py-4 border-t border-border">
            <span className="font-semibold">{t('product.quantity')}</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-xl font-bold w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

        </div>

        {/* Sticky Add to Cart Button */}
        <div className="sticky bottom-0 left-0 right-0 px-4 py-3 bg-card border-t border-border">
          <Button
            ref={addButtonRef}
            onClick={handleAddToCart}
            size="default"
            className="w-full h-11 text-base font-semibold rounded-xl shadow-glow"
          >
            {t('product.addToCart')} - {formatPrice(totalPrice)}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
