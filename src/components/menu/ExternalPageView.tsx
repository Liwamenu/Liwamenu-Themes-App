import { X } from "lucide-react";
import DOMPurify from "dompurify";
import { useMemo } from "react";

interface ExternalPageViewProps {
  html?: string | null;
  image?: string | null;
  onClose: () => void;
}

export function ExternalPageView({ html, image, onClose }: ExternalPageViewProps) {
  const sanitizedHtml = useMemo(() => {
    if (!html) return null;
    return DOMPurify.sanitize(html, {
      ADD_TAGS: ["script", "link", "style", "meta", "iframe"],
      ADD_ATTR: ["target", "rel", "class", "style", "src", "href", "sandbox"],
      WHOLE_DOCUMENT: true,
    });
  }, [html]);

  const content = sanitizedHtml || html;
  const showHtml = !!content;
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
        <iframe
          srcDoc={content!}
          className="flex-1 w-full border-0"
          sandbox="allow-same-origin allow-scripts allow-popups"
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