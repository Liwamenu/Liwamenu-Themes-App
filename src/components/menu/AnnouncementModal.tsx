import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
}

export const AnnouncementModal = ({ isOpen, onClose, htmlContent }: AnnouncementModalProps) => {
  const { t } = useTranslation();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md max-h-[85vh] bg-gradient-to-br from-background via-background to-muted rounded-2xl shadow-2xl overflow-hidden border border-primary/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-amber-500 to-primary" />
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-muted/80 hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Scrollable content */}
            <div className="relative max-h-[calc(85vh-80px)] overflow-y-auto p-6 pt-8">
              <div 
                className="announcement-content prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>

            {/* Footer with button */}
            <div className="relative p-4 pt-2 border-t border-border/50 bg-background/80 backdrop-blur-sm">
              <Button 
                onClick={onClose}
                className="w-full h-11 bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-primary-foreground font-medium rounded-xl shadow-lg"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {t('common.ok', 'Tamam')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Demo content for New Year celebration
export const getNewYearAnnouncementContent = (): string => {
  return `
    <div class="text-center space-y-4">
      <div class="text-5xl mb-2">🎉✨🎊</div>
      <h2 class="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
        Yeni Yılınız Kutlu Olsun!
      </h2>
      <p class="text-muted-foreground">
        2025 yılının sağlık, mutluluk ve başarılarla dolu olmasını dileriz!
      </p>
      
      <div class="my-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-amber-500/10 border border-primary/20">
        <div class="flex items-center justify-center gap-2 mb-3">
          <span class="text-xl">🔥</span>
          <span class="font-bold text-primary">Yeni Yıl Kampanyası</span>
          <span class="text-xl">🔥</span>
        </div>
        <p class="text-sm text-muted-foreground mb-3">
          Yeni yıla özel kampanyalı ürünlerimizi keşfedin! Seçili ürünlerde <strong class="text-primary">%20'ye varan indirimler</strong> sizi bekliyor.
        </p>
        <div class="flex flex-wrap justify-center gap-2 text-xs">
          <span class="px-2 py-1 rounded-full bg-primary/20 text-primary">🍕 Lezzetli Pizzalar</span>
          <span class="px-2 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">🍔 Gurme Burgerler</span>
          <span class="px-2 py-1 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400">🥤 Özel İçecekler</span>
        </div>
      </div>
      
      <p class="text-xs text-muted-foreground italic">
        Kampanya 31 Ocak 2025 tarihine kadar geçerlidir.
      </p>
    </div>
  `;
};
