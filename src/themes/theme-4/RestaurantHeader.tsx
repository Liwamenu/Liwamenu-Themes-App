import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Receipt } from "lucide-react";
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
}

export function RestaurantHeader({ orders = [], onViewOrder }: RestaurantHeaderProps) {
  const { restaurant } = useRestaurant();
  const { t } = useTranslation();
  const { items } = useCart();
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [scrollOpacity, setScrollOpacity] = useState(1);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const fadeStart = 50;
      const fadeEnd = 200;
      if (scrollY <= fadeStart) {
        setScrollOpacity(1);
      } else if (scrollY >= fadeEnd) {
        setScrollOpacity(0);
      } else {
        setScrollOpacity(1 - (scrollY - fadeStart) / (fadeEnd - fadeStart));
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const logoUrl = (restaurant as any).logoUrl || restaurant.heroImageUrl;

  return (
    <header
      className="sticky top-0 z-50 transition-opacity duration-200 bg-background/80 backdrop-blur-md border-b border-border/30"
      style={{ opacity: scrollOpacity, pointerEvents: scrollOpacity < 0.1 ? "none" : "auto" }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-10 h-10 rounded-full border-2 border-border/30 overflow-hidden flex items-center justify-center bg-muted"
          >
            {logoUrl ? (
              <img src={logoUrl} alt={restaurant.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-foreground">{restaurant.name?.charAt(0)}</span>
            )}
          </motion.div>
          <h1 className="font-display text-lg font-bold tracking-widest text-foreground uppercase">
            {restaurant.name}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {orders.length > 0 && onViewOrder && (
            <button
              onClick={() => onViewOrder(orders[0])}
              className="relative p-2 rounded-full hover:bg-muted transition-colors"
              aria-label={t("order.viewOrder")}
            >
              <Receipt className="w-5 h-5 text-foreground" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[8px] font-bold flex items-center justify-center">
                {orders.length}
              </span>
            </button>
          )}
          <ThemeSwitcher />
          <LanguageSwitcher />
          <div className="relative ml-2">
            <ShoppingCart className="w-6 h-6 text-foreground" />
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
              {totalItems}
            </span>
          </div>
        </div>
      </div>

      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />
      <SurveyModal isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />
    </header>
  );
}
