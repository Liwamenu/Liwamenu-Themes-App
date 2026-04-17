import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
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

export const AnnouncementModal = forwardRef<HTMLDivElement, AnnouncementModalProps>(
  ({ isOpen, onClose, htmlContent }, ref) => {
    const { t } = useTranslation();

    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    const srcDoc = useMemo(() => {
      const sanitized = DOMPurify.sanitize(htmlContent, {
        ADD_TAGS: ["style"],
        ADD_ATTR: ["style", "target"],
        FORBID_TAGS: ["script"],
      });
      const isFullDoc = /<html[\s>]/i.test(sanitized) || /<!doctype/i.test(sanitized);
      if (isFullDoc) return sanitized;
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>
        html,body{margin:0;padding:0;background:transparent;font-family:system-ui,-apple-system,'Kumbh Sans',sans-serif;color:#111;word-wrap:break-word;overflow-x:hidden;}
        *{box-sizing:border-box;}
        img,video{max-width:100%;height:auto;display:block;}
        a{color:inherit;}
      </style></head><body>${sanitized}</body></html>`;
    }, [htmlContent]);

    const resizeIframe = useCallback(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const height = Math.max(
          doc.documentElement.scrollHeight,
          doc.body?.scrollHeight ?? 0
        );
        const maxPx = Math.floor(window.innerHeight * 0.85) - 140;
        const clamped = Math.min(Math.max(height, 200), Math.max(maxPx, 200));
        iframe.style.height = `${clamped}px`;
      } catch {
        // cross-origin or sandbox restriction — keep default
      }
    }, []);

    const handleIframeLoad = useCallback(() => {
      resizeIframe();
      const iframe = iframeRef.current;
      const doc = iframe?.contentDocument;
      if (!doc) return;
      // Re-measure after late images load
      const imgs = Array.from(doc.images || []);
      imgs.forEach((img) => {
        if (!img.complete) {
          img.addEventListener("load", resizeIframe, { once: true });
          img.addEventListener("error", resizeIframe, { once: true });
        }
      });
      try {
        const ro = new ResizeObserver(() => resizeIframe());
        if (doc.body) ro.observe(doc.body);
        (iframe as any)._ro?.disconnect?.();
        (iframe as any)._ro = ro;
      } catch {
        /* noop */
      }
    }, [resizeIframe]);

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
            ref={ref}
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
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-amber-500 to-primary" />
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-muted/80 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              <div className="relative pt-8">
                <iframe
                  ref={iframeRef}
                  title="announcement"
                  srcDoc={srcDoc}
                  sandbox="allow-same-origin"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onLoad={handleIframeLoad}
                  style={{ height: 200 }}
                  className="w-full max-h-[calc(85vh-140px)] border-0 bg-transparent overflow-auto"
                />
              </div>

              <div className="relative p-4 pt-2 border-t border-border/50 bg-background/80 backdrop-blur-sm">
                <Button
                  type="button"
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
  }
);

AnnouncementModal.displayName = "AnnouncementModal";
