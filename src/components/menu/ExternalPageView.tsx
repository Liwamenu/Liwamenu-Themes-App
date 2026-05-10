import { X } from "lucide-react";
import { useMemo } from "react";

interface ExternalPageViewProps {
  html?: string | null;
  image?: string | null;
  onClose: () => void;
}

export function ExternalPageView({ html, image, onClose }: ExternalPageViewProps) {
  // Trust model (per CLAUDE.md): the external page HTML is *backend-
  // authored by a trusted admin* — the admin panel already does
  // save-time validation (rejects javascript:/vbscript:/data:text/html
  // URLs, <meta refresh>, <base>, SQL injection patterns). The iframe
  // sandbox below is the security boundary. We deliberately do NOT
  // run DOMPurify here: it kept stripping <iframe>, <style> contents
  // and various attributes the author legitimately uses (YouTube
  // embeds, custom CSS selectors, body backgrounds), so the page
  // would render blank or unstyled. Defense-in-depth via sanitization
  // isn't worth the permanent stream of "preview works, customer
  // doesn't" bug reports — same reasoning as AnnouncementModal.
  const srcDoc = useMemo(() => {
    if (!html) return "";
    const isFullDoc =
      /<html[\s>]/i.test(html) || /<!doctype/i.test(html);

    // Style overrides injected into the iframe head — neutralize
    // Tailwind viewport classes that would clamp body height, force
    // 100% max-width on media so explicit `width="1840"` attributes
    // on pasted YouTube embeds don't trigger horizontal scroll on
    // phones, and force YouTube/Vimeo iframes to a 16:9 responsive
    // frame regardless of the embed code's hard-coded dimensions.
    const overrides = `<style>
      *,*::before,*::after{box-sizing:border-box;}
      html,body{margin:0!important;padding:0;min-height:0!important;height:auto!important;word-wrap:break-word;overflow-x:hidden;}
      .min-h-screen,.h-screen{min-height:0!important;height:auto!important;}
      img,video,iframe{max-width:100%;height:auto;display:block;}
      iframe[src*="youtube.com"],iframe[src*="youtube-nocookie.com"],iframe[src*="vimeo.com"]{
        width:100%!important;height:auto!important;aspect-ratio:16/9;border-radius:12px;border:0;
      }
      pre,code{white-space:pre-wrap;word-break:break-word;}
    </style>`;

    if (isFullDoc) {
      // Inject overrides into <head> (or before </html> as fallback)
      if (/<\/head>/i.test(html)) {
        return html.replace(/<\/head>/i, `${overrides}</head>`);
      }
      return html.replace(
        /<html[^>]*>/i,
        (m) => `${m}<head>${overrides}</head>`,
      );
    }
    // Snippet → wrap with a default Tailwind CDN doc so the
    // "Tailwind destekli HTML" promise from the editor still holds.
    return `<!DOCTYPE html><html lang="tr"><head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <script>window.tailwind={config:{darkMode:'class'}};</script>
      <script src="https://cdn.tailwindcss.com"></script>
      ${overrides}
    </head><body>${html}</body></html>`;
  }, [html]);

  const showHtml = !!html;
  const showImage = !showHtml && !!image;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {showHtml && (
        // Sandbox + Permissions Policy mirror AnnouncementModal so
        // every embed (YouTube, Vimeo, Maps) that works in the popup
        // also works on the external page.
        <iframe
          srcDoc={srcDoc}
          className="flex-1 w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation allow-forms"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
          title="External page"
        />
      )}

      {showImage && (
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <img
            src={image!}
            alt="External page"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
