import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WaiterSuccessAnimationProps {
  onComplete: () => void;
}

export function WaiterSuccessAnimation({ onComplete }: WaiterSuccessAnimationProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" style={{ WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)' }} />
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ type: "spring", duration: 0.5 }} className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative">
          <motion.div initial={{ scale: 0.8, opacity: 0.8 }} animate={{ scale: 2.5, opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }} className="absolute inset-0 rounded-full bg-sky-400" />
          <motion.div initial={{ scale: 0.8, opacity: 0.6 }} animate={{ scale: 2, opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5, delay: 0.3 }} className="absolute inset-0 rounded-full bg-sky-400" />
          <motion.div animate={{ rotate: [0, -15, 15, -10, 10, -5, 5, 0] }} transition={{ duration: 0.8, repeat: 2, repeatDelay: 0.5 }}
            className="relative w-24 h-24 rounded-full bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center shadow-lg">
            <Bell className="w-12 h-12 text-white" />
          </motion.div>
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: "spring" }}
            className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-md">
            <Check className="w-6 h-6 text-white" strokeWidth={3} />
          </motion.div>
        </div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-center">
          <h3 className="text-2xl font-bold text-white mb-2">{t('waiter.success')}</h3>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-white/80 text-sm">
            {t('waiter.coming')}
          </motion.p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
