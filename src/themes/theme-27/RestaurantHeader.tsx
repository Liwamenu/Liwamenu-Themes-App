import {
  Clock,
  AlertTriangle,
  Receipt,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/lib/i18n";
import type { Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { Order } from "@/types/restaurant";

/** Language list with SVG flag components for cross-platform rendering. */
const LANGUAGES: { code: string; countryCode: Country; label: string }[] = [
  { code: "tr", countryCode: "TR", label: "TR" },
  { code: "en", countryCode: "GB", label: "EN" },
  { code: "de", countryCode: "DE", label: "DE" },
  { code: "fr", countryCode: "FR", label: "FR" },
  { code: "it", countryCode: "IT", label: "IT" },
  { code: "es", countryCode: "ES", label: "ES" },
  { code: "ar", countryCode: "SA", label: "AR" },
  { code: "az", countryCode: "AZ", label: "AZ" },
  { code: "ru", countryCode: "RU", label: "RU" },
  { code: "el", countryCode: "GR", label: "EL" },
  { code: "zh", countryCode: "CN", label: "ZH" },
];

function FlagRect({ country }: { country: Country }) {
  const FlagComponent = flags[country];
  if (!FlagComponent) return null;
  return (
    <span className="inline-flex w-full h-full overflow-hidden rounded-[6px]">
      <FlagComponent title={country} />
    </span>
  );
}

interface RestaurantHeaderProps {
  orders?: Order[];
  onViewOrder?: (order: Order) => void;
}

/**
 * Kiosk Header — centred logo, restaurant name, welcome text,
 * circular SVG flag language bar, dark/light theme toggle.
 * No reservation, no survey, no search.
 */
export function RestaurantHeader({ orders = [], onViewOrder }: RestaurantHeaderProps) {
  const { restaurant, isRestaurantActive, isCurrentlyOpen, getCurrentWorkingHour } = useRestaurant();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const workingHour = getCurrentWorkingHour;
  const isDark = theme === "dark";

  return (
    <header className="kiosk-header" dir="ltr">
      {/* Top-right: order badge + theme toggle */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {orders.length > 0 && onViewOrder && (
          <button
            onClick={() => onViewOrder(orders[0])}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[hsla(var(--kiosk-gold),0.15)] text-[hsl(var(--kiosk-gold))] text-sm font-semibold"
          >
            <Receipt className="w-4 h-4" />
            <span>{orders.length}</span>
          </button>
        )}

        {/* Dark / Light toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="w-10 h-10 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Logo circle */}
      <div className="kiosk-header-logo">
        <img
          src={restaurant.logoImageUrl || restaurant.imageAbsoluteUrl}
          alt={restaurant.name}
        />
      </div>

      {/* Restaurant name */}
      <h1>{restaurant.name}</h1>

      {/* Welcome text */}
      <p className="kiosk-welcome">{t("header.welcome", "Hosgeldiniz")}</p>

      {/* Slogan */}
      {restaurant.slogan1 && (
        <p className="kiosk-slogan">{restaurant.slogan1}</p>
      )}

      {/* Open/Closed status */}
      <div className="relative mt-4 flex justify-center">
        {!isRestaurantActive ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--destructive))] text-white text-sm font-semibold rounded-full">
            <AlertTriangle className="w-4 h-4" />
            <span>{t("header.notServing")}</span>
          </div>
        ) : isCurrentlyOpen ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--success))] text-white text-sm font-semibold rounded-full">
            <span className="w-2 h-2 bg-current rounded-full animate-pulse" />
            <span>{t("header.open")}</span>
            {workingHour && (
              <span className="opacity-80 text-xs">
                {workingHour.open} - {workingHour.close}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--destructive))]/80 text-white text-sm font-semibold rounded-full">
            <Clock className="w-4 h-4" />
            <span>{t("header.currentlyClosed")}</span>
          </div>
        )}
      </div>

      {/* Flag language bar — circular SVG flags, prominent, centered */}
      <div className="kiosk-lang-bar">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`kiosk-lang-btn ${i18n.language === lang.code ? "active" : ""}`}
            aria-label={lang.label}
          >
            <FlagRect country={lang.countryCode} />
          </button>
        ))}
      </div>
    </header>
  );
}
