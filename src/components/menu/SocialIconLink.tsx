import type { ComponentType, SVGProps } from "react";

/**
 * Brand-coloured PNG assets shipped with the app (under /public/images).
 * Keyed by the `label` the Footer passes in, so a new platform just needs an
 * entry here + the matching file in public/images.
 *
 * Google is listed but currently has no UI hook-up — the backend is adding
 * the `googleUrl` field; when it lands the footer just adds another entry to
 * its socialLinks array and this component renders it without further work.
 */
const ICON_SRC: Record<string, string> = {
  Facebook: "/images/facebook.png",
  Instagram: "/images/instagram.png",
  TikTok: "/images/tiktok.png",
  YouTube: "/images/youtube.png",
  WhatsApp: "/images/whatsapp.png",
  Google: "/images/google.png",
};

interface SocialIconLinkProps {
  /** Outbound URL — caller should already have filtered out empty links. */
  url: string;
  /** Platform name; also used to look up the PNG asset. */
  label: string;
  /**
   * Fallback icon component (Lucide or our TikTok shim). Rendered only when
   * the platform has no PNG entry in `ICON_SRC`. Themes still need to import
   * an icon to satisfy the existing socialLinks shape; if a PNG is present
   * it always wins.
   */
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Wrapper `<a>` class — themes can pass spacing/hover effects here. */
  className?: string;
  /** Icon size class — defaults to a touch-friendly 28px. */
  iconClassName?: string;
}

/**
 * Renders a social media link as the platform's original brand artwork (PNG
 * under /public/images) so the colours match the real brand identity exactly.
 * Background stays transparent; the only visual chrome is a subtle scale-up
 * on hover.
 */
export function SocialIconLink({
  url,
  label,
  icon: Icon,
  className,
  iconClassName,
}: SocialIconLinkProps) {
  const src = ICON_SRC[label];
  const sizeClass = iconClassName ?? "w-7 h-7";
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={
        className ??
        "inline-flex items-center justify-center p-2 transition-transform hover:scale-110"
      }
    >
      {src ? (
        <img
          src={src}
          alt={label}
          className={`${sizeClass} object-contain`}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <Icon className={sizeClass} />
      )}
    </a>
  );
}
