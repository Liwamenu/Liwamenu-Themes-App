/**
 * OrderTypeModal — Shown after the splash "Siparişe Başla" button.
 *
 * Lets the kiosk customer:
 *   1. Choose a language (flag bar — same as RestaurantHeader)
 *   2. Pick an order type: Gel Al · Paket · Masada
 *
 * Also checks restaurant open/active status and shows a
 * blocking message if the restaurant cannot accept orders.
 */

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/lib/i18n";
import { useRestaurant } from "@/hooks/useRestaurant";
import {
  ShoppingBag,
  Package,
  UtensilsCrossed,
  AlertTriangle,
  Clock,
} from "lucide-react";
import type { Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

export type KioskOrderType = "takeaway" | "package" | "dineIn";

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

interface OrderTypeModalProps {
  isOpen: boolean;
  onSelect: (type: KioskOrderType) => void;
  onBack: () => void;
}

export function OrderTypeModal({ isOpen, onSelect, onBack }: OrderTypeModalProps) {
  const { t, i18n } = useTranslation();
  const { isRestaurantActive, isCurrentlyOpen, restaurant } = useRestaurant();

  const canServe = isRestaurantActive && isCurrentlyOpen;

  if (!isOpen) return null;

  return (
    <div className="kiosk-splash" dir="ltr">
          {/* Logo */}
          <div className="kiosk-splash-logo">
            <img
              src={restaurant.logoImageUrl || restaurant.imageAbsoluteUrl}
              alt={restaurant.name}
            />
          </div>

          {/* Restaurant name */}
          <h1 className="text-2xl font-extrabold text-[hsl(var(--foreground))] font-[Poppins]">
            {restaurant.name}
          </h1>

          {/* Language selection */}
          <div className="w-full max-w-xl px-4">
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2 text-center">
              {t("kiosk.selectLanguage", "Dil Seçin")}
            </p>
            <div className="kiosk-lang-bar" style={{ marginTop: 0 }}>
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
          </div>

          {/* Status check */}
          {!canServe ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="kiosk-order-type-status"
            >
              {!isRestaurantActive ? (
                <>
                  <AlertTriangle className="w-10 h-10 text-[hsl(var(--destructive))]" />
                  <p className="text-lg font-semibold text-[hsl(var(--destructive))]">
                    {t("kiosk.restaurantNotActive", "Restoran su an hizmet vermiyor")}
                  </p>
                </>
              ) : (
                <>
                  <Clock className="w-10 h-10 text-[hsl(var(--destructive))]" />
                  <p className="text-lg font-semibold text-[hsl(var(--destructive))]">
                    {t("kiosk.restaurantClosed", "Restoran su an kapalidir")}
                  </p>
                </>
              )}
            </motion.div>
          ) : (
            /* Order type selection */
            <div className="w-full max-w-2xl px-4">
              <p className="text-base font-semibold text-[hsl(var(--foreground))] mb-4 text-center">
                {t("kiosk.selectOrderType", "Siparis Turunu Secin")}
              </p>

              <div className="grid grid-cols-3 gap-4">
                {/* Gel Al */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onSelect("takeaway")}
                  className="kiosk-order-type-card"
                >
                  <div className="kiosk-order-type-icon">
                    <ShoppingBag className="w-10 h-10" />
                  </div>
                  <span className="kiosk-order-type-label">
                    {t("kiosk.takeaway", "Gel Al")}
                  </span>
                  <span className="kiosk-order-type-desc">
                    {t("kiosk.takeawayDesc", "Siparis ver, tezgahtan al")}
                  </span>
                </motion.button>

                {/* Paket */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onSelect("package")}
                  className="kiosk-order-type-card"
                >
                  <div className="kiosk-order-type-icon">
                    <Package className="w-10 h-10" />
                  </div>
                  <span className="kiosk-order-type-label">
                    {t("kiosk.package", "Paket")}
                  </span>
                  <span className="kiosk-order-type-desc">
                    {t("kiosk.packageDesc", "Paketlensin, yaniniza alin")}
                  </span>
                </motion.button>

                {/* Masada */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onSelect("dineIn")}
                  className="kiosk-order-type-card"
                >
                  <div className="kiosk-order-type-icon">
                    <UtensilsCrossed className="w-10 h-10" />
                  </div>
                  <span className="kiosk-order-type-label">
                    {t("kiosk.dineIn", "Masada")}
                  </span>
                  <span className="kiosk-order-type-desc">
                    {t("kiosk.dineInDesc", "Masaniza servis edilsin")}
                  </span>
                </motion.button>
              </div>
            </div>
          )}
    </div>
  );
}
