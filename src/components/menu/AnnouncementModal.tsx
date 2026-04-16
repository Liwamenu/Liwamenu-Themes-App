import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
}

export const AnnouncementModal = ({ isOpen, onClose, htmlContent }: AnnouncementModalProps) => {
  const { t } = useTranslation();

  // Sanitize and wrap. We render inside a sandboxed iframe so any inline
  // <script>, external CDN <script>, or window.onload inside the payload
  // CANNOT touch the parent page (prevents iOS renderer crashes / hangs).
  const srcDoc = useMemo(() => {
    const sanitized = DOMPurify.sanitize(htmlContent, { WHOLE_DOCUMENT: true });
    // If payload is already a full document, use it as-is; otherwise wrap.
    const isFullDoc = /<html[\s>]/i.test(sanitized) || /<!doctype/i.test(sanitized);
    if (isFullDoc) return sanitized;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>html,body{margin:0;padding:16px;font-family:system-ui,-apple-system,sans-serif;color:#111;background:transparent;}img{max-width:100%;height:auto;}</style></head><body>${sanitized}</body></html>`;
  }, [htmlContent]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
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
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-muted/80 hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Sandboxed iframe — isolates inline scripts and CDN loads */}
            <div className="relative pt-8">
              <iframe
                title="announcement"
                srcDoc={srcDoc}
                sandbox="allow-scripts"
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-[60vh] max-h-[calc(85vh-140px)] border-0 bg-transparent"
              />
            </div>

            {/* Footer with button */}
            <div className="relative p-4 pt-2 border-t border-border/50 bg-background/80 backdrop-blur-sm">
              <Button
                onClick={onClose}
                className="w-full h-11 bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-primary-foreground font-medium rounded-xl shadow-lg"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {t("common.ok", "Tamam")}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
