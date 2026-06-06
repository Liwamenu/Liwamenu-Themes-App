import { useTranslation } from "react-i18next";
import { useRestaurant } from "@/hooks/useRestaurant";
import { Button } from "@/components/ui/button";

/**
 * "Google'da Değerlendir / Write a review on Google" button.
 *
 * Reads `restaurant.googleReviewLink` (set in the restaurant entity by the
 * backend — see GOOGLE_REVIEW_LINK_DTO_BRIEF). Renders nothing when the link
 * is empty/null, so themes can drop it into the footer button row
 * unconditionally and it only appears for restaurants that configured a link.
 *
 * Footer call site (every theme): placed next to the existing Reservation /
 * Survey buttons, same outline pill so it sits naturally in the row.
 */
export function GoogleReviewButton({
  className,
  variant = "default",
}: {
  /** Optional override for the wrapper className (themes may want their
   *  own pill chrome). When set, replaces the variant defaults entirely. */
  className?: string;
  /** Visual mode:
   *  - `default` — compact white pill (footer / header rows)
   *  - `drawer`  — full-width row with leading icon (hamburger menus)
   */
  variant?: "default" | "drawer";
}) {
  const { t } = useTranslation();
  const { restaurant } = useRestaurant();
  const url = restaurant.googleReviewLink?.trim();
  if (!url) return null;
  return (
    <Button
      asChild
      variant="outline"
      // Hard-coded white / dark-grey palette instead of theme tokens.
      // The previous version inherited `--background` / `--foreground`
      // from the active theme, which on some themes (theme-19 plum,
      // theme-25 sand, etc.) left the button bg and the surrounding
      // footer almost the same colour — the label "Google'da Değerlendir"
      // became unreadable. Locking the button to Google's own brand
      // chrome (white pill, slate text) keeps it legible on every theme
      // and every light/dark mode, and it also matches the visual
      // language Google uses on its own review prompts.
      className={
        className ??
        (variant === "drawer"
          // Hamburger / drawer item: full-width row, leading-aligned icon
          // + label. Keeps Google's chrome (white pill, dark slate label)
          // so it stays legible inside dark drawers (theme-19) as well as
          // light ones (theme-25).
          ? "w-full justify-start flex items-center gap-3 px-4 py-3 rounded-xl !bg-white !text-gray-900 !border-gray-300 hover:!bg-gray-50 hover:!text-gray-900 font-medium shadow-sm"
          // Default (footer / header row): compact white pill.
          : "flex items-center gap-2 rounded-full !bg-white !text-gray-900 !border-gray-300 hover:!bg-gray-50 hover:!text-gray-900 font-medium shadow-sm")
      }
    >
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label={t("footer.googleReview")}>
        <img
          src="/images/google.png"
          alt=""
          aria-hidden="true"
          className="w-4 h-4"
          loading="lazy"
          decoding="async"
        />
        <span>{t("footer.googleReview")}</span>
      </a>
    </Button>
  );
}
