import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBasket, X, Plus, Minus, Trash2, Bell } from 'lucide-react';
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
    if (isOpen && items.length === 0) {
      onClose();
    }
  }, [isOpen, items.length, onClose]);

  const handleRemoveItem = (itemId: string, itemName: string) => {
    setItemToRemove({ id: itemId, name: itemName });
  };

  const confirmRemoveItem = () => {
    if (itemToRemove) {
      removeItem(itemToRemove.id);
      setItemToRemove(null);
    }
  };

  const confirmClearCart = () => {
    clearCart();
    setShowClearConfirm(false);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                  <ShoppingBasket className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-bold">{t('cart.title')}</h2>
                  <span className="px-2 py-0.5 bg-primary text-primary-foreground text-sm rounded-full">
                    {items.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {items.length > 0 && (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="text-sm text-secondary hover:text-secondary/80 bg-secondary/10 hover:bg-secondary/20 px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      {t('cart.clearCart')}
                    </button>
                  )}
                  <button onClick={onClose} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <ShoppingBasket className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    <p className="text-lg text-muted-foreground">{t('cart.empty')}</p>
                    <p className="text-sm text-muted-foreground/70">{t('cart.emptySubtitle')}</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {items.map((item) => {
                      const portion = item.portion;
                      let price = portion.price;
                      if ((portion.specialPrice ?? 0) > 0) price = portion.specialPrice;
                      else if ((portion.campaignPrice ?? 0) > 0) price = portion.campaignPrice;
                      const tagTotal = item.selectedTags.reduce((sum, tag) => sum + (tag.price * tag.quantity), 0);
                      const itemTotal = (price + tagTotal) * item.quantity;

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex gap-4 bg-card rounded-2xl p-3 shadow-sm"
                        >
                          <img src={item.product.imageURL} alt={item.product.name} className="w-20 h-20 rounded-xl object-cover" loading="lazy" decoding="async" width={80} height={80} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-sm line-clamp-1">{item.product.name}</h4>
                                <p className="text-xs text-muted-foreground">{item.portion.name}</p>
                              </div>
                              <button onClick={() => handleRemoveItem(item.id, item.product.name)} className="p-1.5 text-muted-foreground hover:text-secondary transition-colors">
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
                              <div className="flex items-center gap-2">
                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-6 text-center font-semibold">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
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

              {items.length > 0 && (
                <div className="p-5 border-t border-border bg-card space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">{t('common.total')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">:</span>
                      <span className="text-2xl font-bold text-primary">{formatPrice(total)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!restaurant.tableNumber) { onTableRequired?.(); return; }
                        onCallWaiter?.();
                      }}
                      disabled={waiterCooldown > 0}
                      className={`h-12 px-4 rounded-xl flex items-center gap-2 text-sm font-medium transition-all ${
                        waiterCooldown > 0
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-sky-500 text-white hover:bg-sky-600"
                      }`}
                    >
                      <Bell className="w-4 h-4" />
                      <span>{waiterCooldown > 0 ? `${waiterCooldown}s` : t('waiter.button')}</span>
                    </button>
                    {canOrder ? (
                      <Button onClick={onCheckout} size="lg" className="flex-1 h-12 text-base font-semibold rounded-3xl bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow">
                        {t('cart.checkout')}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          if (!restaurant.tableNumber) { onTableRequired?.(); return; }
                          onCallWaiter?.();
                        }}
                        disabled={waiterCooldown > 0}
                        size="lg"
                        className="flex-1 h-12 text-base font-semibold rounded-xl bg-amber-500 hover:bg-amber-600"
                      >
                        <Bell className="w-4 h-4 mr-1" />
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{itemToRemove?.name}</AlertDialogTitle>
            <AlertDialogDescription>{t('cart.removeItemDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveItem} className="bg-secondary hover:bg-secondary/90">{t('common.remove')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cart.clearCartTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('cart.clearCartDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearCart} className="bg-secondary hover:bg-secondary/90">{t('cart.clearCart')}</AlertDialogAction>
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
      onClick={onClick}
      data-cart-button
      className={`w-16 h-16 rounded-2xl bg-cart text-cart-foreground shadow-lg flex items-center justify-center ${
        shouldShake ? 'animate-shake' : ''
      }`}
      style={{ boxShadow: '0 4px 20px hsla(45, 100%, 51%, 0.4)' }}
    >
      <div className="relative">
        <ShoppingBasket className="w-7 h-7" />
        <span className="absolute -top-2 -right-3 w-5 h-5 bg-secondary text-secondary-foreground text-xs font-bold rounded-full flex items-center justify-center">
          {itemCount}
        </span>
      </div>
    </motion.button>
  );
}
