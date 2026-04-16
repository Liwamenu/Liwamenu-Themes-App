import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Plus, Minus, Trash2, Bell } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useRestaurant } from '@/hooks/useRestaurant';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
  onCallWaiter?: () => void;
  onTableRequired?: () => void;
  waiterCooldown?: number;
}

export function CartDrawer({ isOpen, onClose, onCheckout, onCallWaiter, onTableRequired, waiterCooldown = 0 }: CartDrawerProps) {
  const { t } = useTranslation();
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCart();
  const { formatPrice, restaurant, canOrderOnline, canOrderInPerson } = useRestaurant();
  const [itemToRemove, setItemToRemove] = useState<{ id: string; name: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const total = getTotal();
  const canOrder = canOrderOnline || canOrderInPerson;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && items.length === 0) onClose();
  }, [isOpen, items.length, onClose]);

  const handleRemoveItem = (itemId: string, itemName: string) => setItemToRemove({ id: itemId, name: itemName });
  const confirmRemoveItem = () => { if (itemToRemove) { removeItem(itemToRemove.id); setItemToRemove(null); } };
  const handleClearCart = () => setShowClearConfirm(true);
  const confirmClearCart = () => { clearCart(); setShowClearConfirm(false); };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card shadow-xl flex flex-col rounded-l-3xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-display font-bold">{t('cart.title')}</h2>
                  <span className="px-2.5 py-1 bg-primary text-primary-foreground text-sm font-semibold rounded-full">{items.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  {items.length > 0 && (
                    <button onClick={handleClearCart} className="text-sm text-destructive hover:text-destructive/80 bg-destructive/10 hover:bg-destructive/20 px-3 py-1.5 rounded-full transition-colors">
                      {t('cart.clearCart')}
                    </button>
                  )}
                  <button onClick={onClose} className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                      <ShoppingCart className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <p className="text-lg font-medium text-muted-foreground">{t('cart.empty')}</p>
                    <p className="text-sm text-muted-foreground/70">{t('cart.emptySubtitle')}</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {items.map((item) => {
                      const portion = item.portion;
                      let price = portion.price;
                      if (portion.specialPrice !== null) price = portion.specialPrice;
                      else if (portion.campaignPrice !== null) price = portion.campaignPrice;
                      const tagTotal = item.selectedTags.reduce((sum, tag) => sum + (tag.price * tag.quantity), 0);
                      const itemTotal = (price + tagTotal) * item.quantity;

                      return (
                        <motion.div key={item.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex gap-4 bg-secondary/30 rounded-2xl p-3 border border-border/50">
                          <img src={item.product.imageURL} alt={item.product.name} className="w-20 h-20 rounded-xl object-cover" loading="lazy" decoding="async" width={80} height={80} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-sm line-clamp-1">{item.product.name}</h4>
                                <p className="text-xs text-muted-foreground">{item.portion.name}</p>
                              </div>
                              <button onClick={() => handleRemoveItem(item.id, item.product.name)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            {item.selectedTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.selectedTags.map((tag) => (
                                  <span key={tag.itemId} className="px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded-full">
                                    {tag.itemName}{tag.price > 0 && ` +${formatPrice(tag.price)}`}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.note && <p className="text-xs text-muted-foreground mt-1 italic">📝 {item.note}</p>}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1">
                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-8 text-center font-semibold">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors">
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                              <span className="font-bold text-primary">{formatPrice(itemTotal)}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="p-5 border-t border-border space-y-4 bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">{t('common.total')}</span>
                    <span className="text-2xl font-display font-bold text-primary">{formatPrice(total)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { if (!restaurant.tableNumber) { onTableRequired?.(); return; } onCallWaiter?.(); }}
                      disabled={waiterCooldown > 0}
                      className={`h-12 px-4 rounded-full flex items-center gap-2 text-sm font-medium transition-all ${waiterCooldown > 0 ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-accent text-accent-foreground hover:bg-accent/80"}`}
                    >
                      <Bell className="w-4 h-4" />
                      <span>{waiterCooldown > 0 ? `${waiterCooldown}s` : t('waiter.button')}</span>
                    </button>
                    {canOrder ? (
                      <Button onClick={onCheckout} size="lg" className="flex-1 h-12 text-base font-semibold rounded-full shadow-glow">
                        {t('cart.checkout')}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => { if (!restaurant.tableNumber) { onTableRequired?.(); return; } onCallWaiter?.(); }}
                        disabled={waiterCooldown > 0}
                        size="lg"
                        className="flex-1 h-12 text-base font-semibold rounded-full bg-campaign hover:bg-campaign/90"
                      >
                        <Bell className="w-4 h-4 mr-2" />
                        {t('waiter.button')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AlertDialog open={!!itemToRemove} onOpenChange={() => setItemToRemove(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{itemToRemove?.name}</AlertDialogTitle>
            <AlertDialogDescription>{t('cart.removeItemDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveItem} className="rounded-full bg-destructive hover:bg-destructive/90">{t('common.remove')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cart.clearCartTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('cart.clearCartDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearCart} className="rounded-full bg-destructive hover:bg-destructive/90">{t('cart.clearCart')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function CartButton({ onClick }: { onClick: () => void }) {
  const { getItemCount } = useCart();
  const itemCount = getItemCount();
  const [shouldShake, setShouldShake] = useState(false);
  const prevItemCount = useRef(itemCount);

  useEffect(() => {
    if (itemCount > prevItemCount.current) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 500);
      return () => clearTimeout(timer);
    }
    prevItemCount.current = itemCount;
  }, [itemCount]);

  if (itemCount === 0) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      data-cart-button
      className={`w-14 h-14 rounded-full bg-cart text-cart-foreground shadow-glow flex items-center justify-center ${shouldShake ? 'animate-shake' : ''}`}
    >
      <div className="relative">
        <ShoppingCart className="w-6 h-6" />
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-campaign text-campaign-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
          {itemCount}
        </span>
      </div>
    </motion.button>
  );
}
