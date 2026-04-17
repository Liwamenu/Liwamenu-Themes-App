import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import DOMPurify from "dompurify";
import { useTranslation } from "react-i18next";

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
      const isFullDoc = /<html[\s>]/i.test(htmlContent) || /<!doctype/i.test(htmlContent);

      // Permissive sanitization — user explicitly opted in to allow scripts
      // so backend HTML (e.g., Tailwind CDN) renders with full fidelity.
      const sanitized = DOMPurify.sanitize(htmlContent, {
        WHOLE_DOCUMENT: isFullDoc,
        ADD_TAGS: ["script", "link", "style", "meta"],
        ADD_ATTR: ["target", "rel", "src", "href", "type", "crossorigin", "integrity", "referrerpolicy", "onload", "onerror"],
        FORCE_BODY: !isFullDoc,
        ALLOW_UNKNOWN_PROTOCOLS: false,
      });

      if (isFullDoc) return sanitized;
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>
        html,body{margin:0;padding:0;background:transparent;word-wrap:break-word;overflow-x:hidden;}
        *{box-sizing:border-box;}
        img,video{max-width:100%;height:auto;}
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
        const maxPx = Math.floor(window.innerHeight * 0.9);
        const clamped = Math.min(Math.max(height, 200), maxPx);
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

      // Tailwind CDN / async stylesheets inject styles after load — re-measure a few times
      [100, 400, 1000, 2000].forEach((delay) => {
        setTimeout(resizeIframe, delay);
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
              className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <iframe
                ref={iframeRef}
                title="announcement"
                srcDoc={srcDoc}
                sandbox="allow-same-origin allow-scripts allow-popups"
                referrerPolicy="no-referrer"
                onLoad={handleIframeLoad}
                style={{ height: 200 }}
                className="w-full flex-1 min-h-0 border-0 bg-transparent block"
              />

              <div className="shrink-0 p-3 bg-background/95 backdrop-blur border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                  {t("common.okay")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

AnnouncementModal.displayName = "AnnouncementModal";
