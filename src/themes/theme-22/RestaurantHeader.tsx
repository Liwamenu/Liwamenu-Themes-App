import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  MapPin,
  Phone,
  AlertTriangle,
  CalendarDays,
  Receipt,
  Star,
  Menu as MenuIcon,
  X,
  Sun,
  Moon,
  Monitor,
  Check,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useTranslation } from "react-i18next";
import { ReservationModal } from "./ReservationModal";
import { SurveyModal } from "./SurveyModal";
import { changeLanguage } from "@/lib/i18n";
import type { Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { cn } from "@/lib/utils";
import { Order } from "@/types/restaurant";
import { GoogleReviewButton } from "@/components/menu/GoogleReviewButton";

const LANGUAGES: { code: string; label: string; countryCode: Country }[] = [
  { code: "tr", label: "Türkçe", countryCode: "TR" },
  { code: "en", label: "English", countryCode: "GB" },
  { code: "de", label: "Deutsch", countryCode: "DE" },
  { code: "fr", label: "Français", countryCode: "FR" },
  { code: "it", label: "Italiano", countryCode: "IT" },
  { code: "es", label: "Español", countryCode: "ES" },
  { code: "ar", label: "العربية", countryCode: "SA" },
  { code: "az", label: "Azərbaycan", countryCode: "AZ" },
  { code: "ru", label: "Русский", countryCode: "RU" },
  { code: "el", label: "Ελληνικά", countryCode: "GR" },
  { code: "zh", label: "中文", countryCode: "CN" },
];

function CountryFlag({ country }: { country: Country }) {
  const FlagComponent = flags[country];
  if (!FlagComponent) return null;
  return (
    <span className="inline-flex w-5 h-4 overflow-hidden rounded-[2px] shrink-0">
      <FlagComponent title={country} />
    </span>
  );
}

const THEME_OPTIONS = [
  { value: "light", icon: Sun, labelKey: "theme.light" },
  { value: "dark", icon: Moon, labelKey: "theme.dark" },
  { value: "system", icon: Monitor, labelKey: "theme.auto" },
];

interface RestaurantHeaderProps {
  orders?: Order[];
  onViewOrder?: (order: Order) => void;
}

/**
 * Sushi-house style header.
 * - Hero image with dark overlay; restaurant name in `Permanent Marker` font
 *   so it reads like an inked stamp.
 * - Single hamburger button at the top-right opens a slide-in drawer that
 *   collects every secondary action (reservation, survey, my order, theme,
 *   language, contact). Keeps the hero clean and lets us avoid a busy
 *   action-buttons row underneath.
 */
export function RestaurantHeader({ orders = [], onViewOrder }: RestaurantHeaderProps) {
  const { restaurant, isRestaurantActive, isCurrentlyOpen, getCurrentWorkingHour } = useRestaurant();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const workingHour = getCurrentWorkingHour;

  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <header className="relative">
      {/* Hero Banner */}
      <div className="relative h-56 sm:h-72 overflow-hidden">
        <img
          src={restaurant.heroImageUrl || restaurant.imageAbsoluteUrl}
          alt={restaurant.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="container px-4 py-3 flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg border-2 border-white/60 ring-2 ring-[hsl(var(--sushi-red))]/40">
                <img
                  src={restaurant.logoImageUrl || restaurant.imageAbsoluteUrl}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/70 leading-tight">
                  {restaurant.slogan1}
                </p>
              </div>
            </motion.div>

            <button
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Menu"
              className="relative w-11 h-11 rounded-full bg-white/95 hover:bg-white shadow-lg flex items-center justify-center text-[hsl(var(--sushi-red))] transition-colors"
            >
              <MenuIcon className="w-5 h-5" />
              {orders.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[hsl(var(--sushi-red))] text-white text-[11px] font-bold flex items-center justify-center shadow-md ring-2 ring-white animate-pulse"
                  aria-label={`${orders.length} aktif sipariş`}
                >
                  {orders.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Brand stamp — restaurant name in Permanent Marker, centered */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <h1
            className="font-display text-white text-4xl sm:text-5xl text-center px-6 drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]"
          >
            {restaurant.name}
          </h1>
        </motion.div>

        {/* Status Badge */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          {!isRestaurantActive ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground text-sm font-semibold rounded-full shadow-lg">
              <AlertTriangle className="w-4 h-4" />
              <span>{t("header.notServing")}</span>
            </div>
          ) : isCurrentlyOpen ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-success text-success-foreground text-sm font-semibold rounded-full shadow-lg">
              <span className="w-2 h-2 bg-current rounded-full animate-pulse" />
              <span>{t("header.open")}</span>
              {workingHour && (
                <span className="opacity-80 text-xs">
                  {workingHour.open} - {workingHour.close}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-destructive/90 text-destructive-foreground text-sm font-semibold rounded-full shadow-lg">
              <Clock className="w-4 h-4" />
              <span>{t("header.currentlyClosed")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Scrolling Marquee — slogan in script font */}
      {(restaurant.slogan1 || restaurant.slogan2) && (
        <div className="overflow-hidden bg-card py-2 border-y border-border">
          <motion.div
            animate={{ x: [0, -1000] }}
            transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
            className="flex whitespace-nowrap"
          >
            {[...Array(10)].map((_, i) => (
              <span
                key={i}
                className="font-script text-3xl text-[hsl(var(--sushi-red))] mx-8"
              >
                {restaurant.slogan1 || restaurant.slogan2}
              </span>
            ))}
          </motion.div>
        </div>
      )}

      {/* Hamburger Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="menu-drawer fixed top-0 right-0 bottom-0 z-[61] w-[88%] max-w-sm shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-display text-2xl text-[hsl(var(--sushi-red))]">
                  {restaurant.name}
                </h3>
                <button
                  onClick={closeDrawer}
                  className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {orders.length > 0 && onViewOrder && (
                  <div className="space-y-2 mb-3 pb-3 border-b border-border">
                    <p className="px-4 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      {t("menu.myOrder")}
                    </p>
                    {orders.map((order) => (
                      <button
                        key={order.id}
                        onClick={() => {
                          closeDrawer();
                          onViewOrder(order);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[hsl(var(--sushi-red))] text-white shadow-md hover:opacity-90 transition-opacity text-left"
                      >
                        <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                          <Receipt className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {t("menu.myOrder")} #{String(order.id).slice(-6)}
                          </p>
                          <p className="text-xs text-white/80 truncate">
                            {t(`order.statuses.${order.status}`, order.status)}
                          </p>
                        </div>
                        <span
                          className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shrink-0"
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {restaurant.reservationSettings?.isActive && (
                  <button
                    onClick={() => {
                      closeDrawer();
                      setIsReservationOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-[hsl(var(--sushi-red))] hover:bg-secondary transition-colors"
                  >
                    <CalendarDays className="w-5 h-5 text-[hsl(var(--sushi-red))]" />
                    <span>{t("reservation.button")}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    closeDrawer();
                    setIsSurveyOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-[hsl(var(--sushi-red))] hover:bg-secondary transition-colors"
                >
                  <Star className="w-5 h-5 text-[hsl(var(--sushi-amber))]" />
                  <span>{t("survey.button")}</span>
                </button>

                <GoogleReviewButton variant="drawer" />

                {/* Theme picker — inline buttons (avoids dropdown z-index
                    conflicts inside the drawer) */}
                <div className="pt-3 border-t border-border">
                  <p className="px-4 pb-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {t("theme.title", "Tema")}
                  </p>
                  <div className="px-4 grid grid-cols-3 gap-2">
                    {THEME_OPTIONS.map(({ value, icon: Icon, labelKey }) => {
                      const isActive = theme === value;
                      return (
                        <button
                          key={value}
                          onClick={() => setTheme(value)}
                          className={cn(
                            "flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border transition-colors text-xs font-medium",
                            isActive
                              ? "border-[hsl(var(--sushi-red))] bg-[hsl(var(--sushi-red))]/10 text-[hsl(var(--sushi-red))]"
                              : "border-border hover:border-[hsl(var(--sushi-red))]/40 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          <span>{t(labelKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language picker — inline list of flags */}
                <div className="pt-3 border-t border-border">
                  <p className="px-4 pb-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {t("language.title", "Dil")}
                  </p>
                  <div className="px-4 grid grid-cols-2 gap-1.5">
                    {LANGUAGES.map((lang) => {
                      const isActive = i18n.language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          onClick={() => changeLanguage(lang.code)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                            isActive
                              ? "bg-[hsl(var(--sushi-red))]/10 text-[hsl(var(--sushi-red))] font-semibold"
                              : "hover:bg-secondary text-foreground",
                          )}
                        >
                          <CountryFlag country={lang.countryCode} />
                          <span className="truncate flex-1 text-left">{lang.label}</span>
                          {isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-border space-y-2">
                  {restaurant.phoneNumber && (
                    <a
                      href={`tel:${restaurant.phoneNumber}`}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors"
                    >
                      <Phone className="w-5 h-5 text-[hsl(var(--sushi-red))]" />
                      <span>{restaurant.phoneNumber}</span>
                    </a>
                  )}
                  {(restaurant.latitude || restaurant.longitude) && (
                    <a
                      href={`https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors"
                    >
                      <MapPin className="w-5 h-5 text-[hsl(var(--sushi-red))]" />
                      <span className="line-clamp-2 text-sm">
                        {restaurant.address || restaurant.district}
                      </span>
                    </a>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border text-center">
                <p className="text-xs text-muted-foreground italic">
                  {restaurant.slogan2}
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />
      <SurveyModal isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />
    </header>
  );
}
