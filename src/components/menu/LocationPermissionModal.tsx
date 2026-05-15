import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type LocationPermissionReason = 'online' | 'inPerson' | 'callWaiter';

interface LocationPermissionModalProps {
  isOpen: boolean;
  reason: LocationPermissionReason;
  onAllow: () => void;
  onDeny: () => void;
}

export function LocationPermissionModal({
  isOpen,
  reason,
  onAllow,
  onDeny,
}: LocationPermissionModalProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
            style={{
              WebkitBackdropFilter: 'blur(4px)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={onDeny}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 z-[61] max-w-sm mx-auto my-auto h-fit pointer-events-none"
          >
            <div className="bg-card rounded-3xl overflow-hidden shadow-elegant pointer-events-auto">
              {/* Header icon */}
              <div className="flex flex-col items-center pt-8 pb-4 px-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Navigation className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-center">
                  {t('locationPermission.title')}
                </h2>
              </div>

              {/* Body */}
              <div className="px-6 pb-6">
                <p className="text-sm text-muted-foreground text-center leading-relaxed mb-2">
                  {t(`locationPermission.reason_${reason}`)}
                </p>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/60 mb-6">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('locationPermission.privacyNote')}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onDeny}
                    className="flex-1 h-12 rounded-2xl font-medium"
                  >
                    {t('locationPermission.deny')}
                  </Button>
                  <Button
                    onClick={onAllow}
                    className="flex-1 h-12 rounded-2xl font-medium"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    {t('locationPermission.allow')}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
