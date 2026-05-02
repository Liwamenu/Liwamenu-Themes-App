import { useState } from "react";
import { motion } from "framer-motion";
import { Receipt } from "lucide-react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { ReservationModal } from "./ReservationModal";
import { SurveyModal } from "./SurveyModal";
import { Order } from "@/types/restaurant";

interface RestaurantHeaderProps {
  orders?: Order[];
  onViewOrder?: (order: Order) => void;
  isVisible?: boolean;
}

export function RestaurantHeader({ orders = [], onViewOrder, isVisible = true }: RestaurantHeaderProps) {
  const { restaurant } = useRestaurant();
  const { t } = useTranslation();
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : -100 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/40 transition-shadow"
      style={{ boxShadow: isVisible ? 'var(--shadow-sm)' : 'none' }}
    >
      <div className="flex items-center justify-between px-4 py-2 max-w-[600px] mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-10 h-10 rounded-full border-2 border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0"
        >
          {(restaurant as any).logoImageUrl ? (
            <img src={(restaurant as any).logoImageUrl} alt={restaurant.name} className="w-full h-full object-cover" />
          ) : restaurant.imageAbsoluteUrl ? (
            <img src={restaurant.imageAbsoluteUrl} alt={restaurant.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-primary font-display font-bold text-lg">{restaurant.name?.charAt(0)}</span>
          )}
        </motion.div>

        {/* Title */}
        <h1 className="font-display text-lg font-semibold tracking-wide text-foreground italic">
          {restaurant.name}
        </h1>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {orders.length > 0 && onViewOrder && (
            <button
              onClick={() => onViewOrder(orders[0])}
              className="relative p-2 rounded-full hover:bg-muted transition-colors"
              aria-label={t("order.viewOrder")}
            >
              <Receipt className="w-5 h-5 text-foreground" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
                {orders.length}
              </span>
            </button>
          )}
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </div>

      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />
      <SurveyModal isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />
    </motion.header>
  );
}
