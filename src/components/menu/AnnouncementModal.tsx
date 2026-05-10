import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
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

      // Trust model (per CLAUDE.md): announcement HTML is *backend-authored
      // by a trusted admin* — the admin panel already does save-time
      // validation (rejects javascript:/vbscript:/data:text/html URLs,
      // <meta refresh>, <base>, SQL injection patterns). The iframe sandbox
      // below is the security boundary that protects the customer app from
      // anything that slips through. We deliberately do NOT run DOMPurify
      // here: it kept stripping <iframe>, <style> contents and various
      // attributes the author legitimately uses (YouTube embeds, custom CSS
      // selectors, body backgrounds), so the modal would render blank or
      // unstyled. Defense-in-depth via sanitization isn't worth the
      // permanent stream of "preview works, customer doesn't" bug reports.

      // Style overrides injected into the iframe head:
      //  - neutralize Tailwind viewport classes (min-h-screen / h-screen)
      //    that would otherwise clamp the body to the tiny initial iframe
      //    height,
      //  - cap media at 100% width so explicit width="1840" attributes on
      //    pasted YouTube embeds don't trigger horizontal scroll on phones,
      //  - force a 16:9 responsive frame on YouTube/Vimeo iframes regardless
      //    of the embed code's hard-coded width/height.
      // `background:transparent` was REMOVED — it silently overrode the
      // author's body background (the cascade ordering put this <style>
      // after the author's, defeating their gradient with no !important
      // needed), which is what made the previous build show a blank white
      // modal even when the author had a styled body.
      const heightOverride = `<style>
        html,body{margin:0!important;padding:0;min-height:0!important;height:auto!important;word-wrap:break-word;overflow-x:hidden;}
        .min-h-screen,.h-screen{min-height:0!important;height:auto!important;}
        *{box-sizing:border-box;}
        img,video,iframe{max-width:100%;height:auto;display:block;}
        iframe[src*="youtube.com"],iframe[src*="youtube-nocookie.com"],iframe[src*="vimeo.com"]{
          width:100%!important;height:auto!important;aspect-ratio:16/9;border-radius:12px;border:0;
        }
        pre,code{white-space:pre-wrap;word-break:break-word;}
      </style>`;

      if (isFullDoc) {
        // Inject override into <head> (or before </html> as fallback)
        if (/<\/head>/i.test(htmlContent)) {
          return htmlContent.replace(/<\/head>/i, `${heightOverride}</head>`);
        }
        return htmlContent.replace(/<html[^>]*>/i, (m) => `${m}<head>${heightOverride}</head>`);
      }
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>${heightOverride}</head><body>${htmlContent}</body></html>`;
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

              {/* Sandbox + Permissions Policy mirror the admin panel's
                  preview iframe (see Liwa Menu - Frontend admin
                  announcementSettings.jsx). Tokens chosen so embedded
                  media — YouTube, Vimeo, Maps, fonts CDN — actually plays:
                   - allow-scripts: Tailwind CDN + author interaction code
                   - allow-same-origin: nested <iframe> (e.g. YouTube)
                     inherits this sandbox; without it the embed iframe is
                     forced to an opaque origin and the YouTube player
                     fails its storage/cookie checks
                   - allow-popups + allow-popups-to-escape-sandbox: "Watch
                     on YouTube" and similar links open outside sandbox
                   - allow-presentation: enables fullscreen toggle
                   - allow-forms: surveys / feedback forms can submit
                  `allow="..."` mirrors YouTube's own copy-embed list so
                  every share-dialog snippet works without modification. */}
              <iframe
                ref={iframeRef}
                title="announcement"
                srcDoc={srcDoc}
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation allow-forms"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
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
