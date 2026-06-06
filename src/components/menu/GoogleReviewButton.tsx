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
}: {
  /** Optional override for the wrapper className (themes may want their
   *  own pill chrome). Defaults to the shared outline-rounded style. */
  className?: string;
}) {
  const { t } = useTranslation();
  const { restaurant } = useRestaurant();
  const url = restaurant.googleReviewLink?.trim();
  if (!url) return null;
  return (
    <Button
      asChild
      variant="outline"
      className={
        className ??
        "flex items-center gap-2 rounded-full"
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
