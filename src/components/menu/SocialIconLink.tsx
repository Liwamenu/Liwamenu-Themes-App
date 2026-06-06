import type { ComponentType, CSSProperties, SVGProps } from "react";

/**
 * Brand colors for the social platforms we link to from the footer. Used so
 * every theme's social row renders in the original brand colors (no themed
 * recolour) regardless of the surrounding light/dark palette.
 *
 * Instagram is intentionally a single solid colour (not the official multi-stop
 * gradient) because the gradient does not read at favicon-sized icons against
 * arbitrary theme backgrounds; the magenta is recognisable on its own.
 */
const BRAND_COLORS: Record<string, string> = {
  Facebook: "#1877F2",
  Instagram: "#E1306C",
  TikTok: "#000000",
  YouTube: "#FF0000",
  WhatsApp: "#25D366",
};

interface SocialIconLinkProps {
  /** Outbound URL — caller should already have filtered out empty links. */
  url: string;
  /** Platform name; also used to look up the brand colour. */
  label: string;
  /** The icon component (Lucide or our TikTok shim). Must honour currentColor. */
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Wrapper `<a>` class — themes can pass spacing/hover effects here. */
  className?: string;
  /** Icon size/spacing class — defaults to a touch-friendly 28px. */
  iconClassName?: string;
  /** Optional style override for the icon (rarely needed). */
  iconStyle?: CSSProperties;
}

/**
 * Renders a social media link as a transparent-background, brand-coloured
 * outline icon. Replaces the previous theme-specific circle/pill chrome so
 * the icons read the same way across every theme.
 */
export function SocialIconLink({
  url,
  label,
  icon: Icon,
  className,
  iconClassName,
  iconStyle,
}: SocialIconLinkProps) {
  const color = BRAND_COLORS[label] ?? "currentColor";
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
      <Icon
        className={iconClassName ?? "w-7 h-7"}
        style={{
          color,
          // TikTok's brand colour is black, which disappears on dark theme
          // footers. A tiny white drop-shadow keeps the silhouette visible on
          // both light and dark backgrounds without changing the brand colour.
          ...(label === "TikTok" && {
            filter: "drop-shadow(0 0 1px rgba(255,255,255,0.9))",
          }),
          ...iconStyle,
        }}
      />
    </a>
  );
}
