import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { ReservationModal } from "./ReservationModal";
import { SurveyModal } from "./SurveyModal";
import { Order } from "@/types/restaurant";
import { useCart } from "@/hooks/useCart";

interface RestaurantHeaderProps {
  orders?: Order[];
  onViewOrder?: (order: Order) => void;
  isVisible?: boolean;
}

export function RestaurantHeader({ orders = [], onViewOrder, isVisible = true }: RestaurantHeaderProps) {
  const { restaurant } = useRestaurant();
  const { t } = useTranslation();
  const { items } = useCart();
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <motion.header
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : -100 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 transition-shadow"
      style={{ boxShadow: isVisible ? 'var(--shadow-md)' : 'none' }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 max-w-[1220px] mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden flex-shrink-0"
        >
          {(restaurant as any).logoImageUrl ? (
            <img
              src={(restaurant as any).logoImageUrl}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          ) : restaurant.imageAbsoluteUrl ? (
            <img
              src={restaurant.imageAbsoluteUrl}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-primary font-bold text-sm">{restaurant.name?.charAt(0)}</span>
          )}
        </motion.div>

        {/* Title */}
        <h1 className="font-display text-lg font-bold tracking-widest text-foreground uppercase">
          {t("menu.title", "MENUS")}
        </h1>

        {/* Right side: theme, lang, cart */}
        <div className="flex items-center gap-1">
          <ThemeSwitcher />
          <LanguageSwitcher />
          <div className="relative ml-1">
            <ShoppingCart className="w-5 h-5 text-foreground" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </div>
        </div>
      </div>

      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />
      <SurveyModal isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />
    </motion.header>
  );
}
