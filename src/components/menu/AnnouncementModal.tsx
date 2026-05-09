import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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
    const timeoutsRef = useRef<number[]>([]);

    const clearPendingTimeouts = useCallback(() => {
      timeoutsRef.current.forEach((id) => clearTimeout(id));
      timeoutsRef.current = [];
    }, []);

    const srcDoc = useMemo(() => {
      if (!isOpen) return "";
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

      // Neutralize min-h-screen / h-screen which would otherwise make the
      // content always report the iframe viewport height (causing tiny clamps).
      const heightOverride = `<style>
        html,body{margin:0!important;padding:0;background:transparent;min-height:0!important;height:auto!important;word-wrap:break-word;overflow-x:hidden;}
        .min-h-screen,.h-screen{min-height:0!important;height:auto!important;}
        *{box-sizing:border-box;}
        img,video{max-width:100%;height:auto;}
      </style>`;

      if (isFullDoc) {
        // Inject override into <head> (or before </html> as fallback)
        if (/<\/head>/i.test(sanitized)) {
          return sanitized.replace(/<\/head>/i, `${heightOverride}</head>`);
        }
        return sanitized.replace(/<html[^>]*>/i, (m) => `${m}<head>${heightOverride}</head>`);
      }
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>${heightOverride}</head><body>${sanitized}</body></html>`;
    }, [htmlContent, isOpen]);

    const resizeIframe = useCallback(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const body = doc.body;
        const html = doc.documentElement;
        const height = Math.max(
          body?.scrollHeight ?? 0,
          body?.offsetHeight ?? 0,
          html?.scrollHeight ?? 0,
          html?.offsetHeight ?? 0
        );
        const footerPx = 64;
        const maxPx = Math.floor(window.innerHeight * 0.9) - footerPx;
        const clamped = Math.min(Math.max(height, 400), maxPx);
        iframe.style.height = `${clamped}px`;
      } catch {
        // cross-origin or sandbox restriction — keep default
      }
    }, []);

    const handleIframeLoad = useCallback(() => {
      clearPendingTimeouts();
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
        const id = window.setTimeout(resizeIframe, delay);
        timeoutsRef.current.push(id);
      });

      try {
        let raf = 0;
        const ro = new ResizeObserver(() => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => resizeIframe());
        });
        if (doc.body) ro.observe(doc.body);
        (iframe as any)._ro?.disconnect?.();
        (iframe as any)._ro = ro;
      } catch {
        /* noop */
      }
    }, [resizeIframe, clearPendingTimeouts]);

    useEffect(() => {
      return () => {
        clearPendingTimeouts();
        const iframe = iframeRef.current as any;
        iframe?._ro?.disconnect?.();
        if (iframe) iframe._ro = null;
      };
    }, [clearPendingTimeouts]);

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

    // Mount a persistent dedicated portal container in body so Radix Dialog
    // (used by SurveyModal) cannot mark our portal `inert` / `aria-hidden`
    // when it opens. We strip those attrs on every mutation.
    const portalContainerRef = useRef<HTMLDivElement | null>(null);
    if (typeof document !== "undefined" && !portalContainerRef.current) {
      const div = document.createElement("div");
      div.setAttribute("data-announcement-portal", "");
      // Always interactive — cannot be suppressed by ancestor inert.
      div.style.pointerEvents = "auto";
      portalContainerRef.current = div;
    }

    useEffect(() => {
      const el = portalContainerRef.current;
      if (!el) return;
      document.body.appendChild(el);

      // Some libs (Radix Dialog's aria-hidden manager) automatically apply
      // `inert` / `aria-hidden` to body siblings when their dialog opens.
      // Strip those attributes so this portal stays interactive.
      const strip = () => {
        if (el.hasAttribute("inert")) el.removeAttribute("inert");
        if (el.hasAttribute("aria-hidden")) el.removeAttribute("aria-hidden");
        if (el.hasAttribute("data-aria-hidden")) el.removeAttribute("data-aria-hidden");
      };
      strip();
      const observer = new MutationObserver(strip);
      observer.observe(el, {
        attributes: true,
        attributeFilter: ["inert", "aria-hidden", "data-aria-hidden"],
      });

      return () => {
        observer.disconnect();
        if (el.parentElement) el.parentElement.removeChild(el);
      };
    }, []);

    if (typeof document === "undefined" || !portalContainerRef.current) return null;

    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={ref}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Rendered into document.body via portal so it always sits above
            // any in-tree modal regardless of stacking contexts. z-[2000] keeps
            // it above Radix Dialog (z-50) and ReservationModal (z-[100]).
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
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
                loading="lazy"
                onLoad={handleIframeLoad}
                style={{ height: 400 }}
                className="w-full border-0 bg-transparent block"
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
      </AnimatePresence>,
      portalContainerRef.current
    );
  }
);

AnnouncementModal.displayName = "AnnouncementModal";
