import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Loader2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useRestaurant, useRestaurantStore } from '@/hooks/useRestaurant';
import { apiCallWaiter } from '@/lib/api';
import { WaiterSuccessAnimation } from './WaiterSuccessAnimation';
import { ChangeTableModal } from './ChangeTableModal';

interface CallWaiterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CallWaiterModal({ isOpen, onClose, onSuccess }: CallWaiterModalProps) {
  const { t } = useTranslation();
  const { restaurant } = useRestaurant();
  const setTableNumber = useRestaurantStore((state) => state.setTableNumber);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showChangeTableModal, setShowChangeTableModal] = useState(false);

  const handleTableChange = (newTable: string) => {
    setTableNumber(newTable);
    toast.success(t('cart.tableChanged', { table: newTable }));
  };

  // Prevent body scroll when modal is open and reset selections
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset all selections when modal opens
      setReason('');
      setSelectedOptions([]);
      setShowSuccessAnimation(false);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleAnimationComplete = useCallback(() => {
    setShowSuccessAnimation(false);
    onSuccess?.();
    onClose();
  }, [onClose, onSuccess]);

  const quickOptions = [
    t('waiter.quickOptions.orderQuestion'),
    t('waiter.quickOptions.requestBill'),
    t('waiter.quickOptions.cleanTable'),
  ];

  const handleQuickOptionClick = (option: string) => {
    setSelectedOptions((prev) => {
      if (prev.includes(option)) {
        // Remove if already selected
        return prev.filter((o) => o !== option);
      } else {
        // Add if not selected
        return [...prev, option];
      }
    });

    setReason((prev) => {
      if (prev.includes(option)) {
        // Remove from reason
        const newReason = prev
          .split(', ')
          .filter((o) => o !== option)
          .join(', ');
        return newReason;
      }
      if (!prev.trim()) return option;
      return `${prev}, ${option}`;
    });
  };

  const handleCallWaiter = async () => {
    setIsSubmitting(true);

    const payload = {
      restaurantId: restaurant.restaurantId,
      tableNumber: restaurant.tableNumber,
      reason: reason.trim() || undefined,
      timestamp: new Date().toISOString(),
    };

    try {
      await apiCallWaiter({
        restaurantId: restaurant.restaurantId,
        tableNumber: Number(restaurant.tableNumber),
        note: reason.trim() || null,
      });

      setReason('');
      setShowSuccessAnimation(true);
    } catch (error) {
      toast.error(t('waiter.error'));
      setIsSubmitting(false);
    } finally {
      if (!showSuccessAnimation) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {showSuccessAnimation && (
        <WaiterSuccessAnimation onComplete={handleAnimationComplete} />
      )}
      {isOpen && !showSuccessAnimation && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
            style={{ WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 z-50 max-w-md mx-auto my-auto h-fit pointer-events-none"
          >
            <div className="bg-card rounded-3xl overflow-hidden shadow-elegant pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold">{t('waiter.title')}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4 p-4 bg-secondary rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Bell className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{t('waiter.currentTable')}</p>
                    <p className="text-xl font-bold">{restaurant.tableNumber}</p>
                  </div>
                </div>

                {/* Change Table Option */}
                <button
                  type="button"
                  onClick={() => setShowChangeTableModal(true)}
                  className="w-full flex items-center gap-4 p-4 bg-secondary/50 hover:bg-secondary rounded-2xl transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{t('cart.tableChanged?')}</p>
                    <p className="text-sm text-muted-foreground">{t('cart.scanNewQr')}</p>
                  </div>
                </button>

                <div className="space-y-3">
                  <label className="text-sm font-medium block">
                    {t('waiter.reason')} ({t('common.optional')})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {quickOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleQuickOptionClick(option)}
                        className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                          selectedOptions.includes(option)
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-secondary hover:bg-secondary/80'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder={t('waiter.reasonPlaceholder')}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="rounded-xl resize-none"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleCallWaiter}
                  disabled={isSubmitting}
                  size="lg"
                  className="w-full h-14 text-lg font-semibold rounded-2xl"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t('waiter.calling')}
                    </>
                  ) : (
                    <>
                      <Bell className="w-5 h-5 mr-2" />
                      {t('waiter.button')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      <ChangeTableModal
        isOpen={showChangeTableModal}
        onClose={() => setShowChangeTableModal(false)}
        onTableChange={handleTableChange}
        currentTable={restaurant.tableNumber}
      />
    </AnimatePresence>
  );
}
