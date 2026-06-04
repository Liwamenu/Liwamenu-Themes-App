import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { ReservationModal } from "@/components/menu/ReservationModal";
import { LanguageSwitcher } from "@/components/menu/LanguageSwitcher";
import { useInitializeRestaurant, useRestaurant } from "@/hooks/useRestaurant";

/**
 * Standalone, iframe-friendly reservation page.
 *
 * Restaurants embed THIS on their own websites via an <iframe> — the admin
 * panel's "Web Siteme Göm / Paylaş" section generates the snippet (HTML /
 * PHP / share link). It renders ONLY the reservation form (no menu, no
 * header chrome) and:
 *   - initializes restaurant data from the tenant (subdomain / path / ?tenant=),
 *     exactly like the menu — same URL conventions apply;
 *   - is ALWAYS light (embeds sit on arbitrary host sites) with an off-white
 *     backdrop so the white form card reads cleanly;
 *   - auto-applies the restaurant's default language + offers an 11-language
 *     switcher so visitors can pick their own;
 *   - reuses <ReservationModal embedded /> for the full form + SMS verify flow;
 *   - posts its content height to the parent window so the host page can
 *     auto-size the iframe (no fixed height / inner scrollbar needed).
 *
 * URL: https://<tenant>.liwamenu.com/reservation
 */
export default function ReservationEmbed() {
  const { t } = useTranslation();
  const { isLoading, error, isInitialized } = useInitializeRestaurant();
  const { restaurant } = useRestaurant();
  const rootRef = useRef<HTMLDivElement>(null);

  // Force LIGHT for the whole embed document. Embeds live on arbitrary host
  // sites, so we ignore the visitor's system dark mode. We do NOT use
  // next-themes' setTheme (it persists to localStorage and would flip the QR
  // menu too, same origin) — instead we just keep <html> out of `.dark`
  // directly, re-asserting via a MutationObserver if next-themes flips it.
  // Doing this at the document root (not a subtree) also keeps the radix
  // portals — date picker, time select, language dropdown — light.
  useEffect(() => {
    const html = document.documentElement;
    const forceLight = () => {
      if (html.classList.contains("dark")) html.classList.remove("dark");
    };
    forceLight();
    const mo = new MutationObserver(forceLight);
    mo.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  // Auto-resize: report our content height to the parent frame whenever it
  // changes (step transitions, validation messages, language switch, …) so
  // the embedding site can size the iframe to fit. No-op when not framed.
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    const post = () => {
      const height = Math.ceil(
        rootRef.current?.getBoundingClientRect().height ??
          document.documentElement.scrollHeight,
      );
      if (height > 0) {
        window.parent.postMessage(
          { type: "liwamenu:reservation:height", height },
          "*",
        );
      }
    };
    post();
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(post) : null;
    if (ro && rootRef.current) ro.observe(rootRef.current);
    window.addEventListener("load", post);
    return () => {
      ro?.disconnect();
      window.removeEventListener("load", post);
    };
  }, [isInitialized, error]);

  const reservationActive = restaurant?.reservationSettings?.isActive;
  const ready = isInitialized && !error;

  return (
    <div ref={rootRef} className="w-full bg-[#f1efe8] p-3 sm:p-5">
      <div className="max-w-md mx-auto">
        {/* Minimal header: restaurant name + 11-language switcher.
            (Logo and slogan intentionally omitted per design.) */}
        {ready && (
          <div className="flex items-center justify-between gap-3 mb-4">
            <h1 className="text-base font-semibold text-foreground truncate min-w-0">
              {restaurant?.name}
            </h1>
            <div className="shrink-0">
              <LanguageSwitcher />
            </div>
          </div>
        )}

        {!isInitialized && isLoading && (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t(
                "reservation.embedUnavailable",
                "Rezervasyon formu şu anda yüklenemedi.",
              )}
            </p>
          </div>
        )}

        {ready && !reservationActive && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t(
                "reservation.embedNotActive",
                "Bu işletme için rezervasyon şu anda kapalı.",
              )}
            </p>
          </div>
        )}

        {ready && reservationActive && (
          <ReservationModal isOpen embedded onClose={() => {}} />
        )}
      </div>
    </div>
  );
}
