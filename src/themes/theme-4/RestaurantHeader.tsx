import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, ChefHat } from "lucide-react";
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

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-50 bg-primary">
      <div className="flex items-center justify-end gap-1 px-3 py-1 bg-primary border-b border-primary-foreground/10">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-10 h-10 rounded-full bg-primary-foreground/10 border-2 border-primary-foreground/30 flex items-center justify-center"
        >
          <ChefHat className="w-5 h-5 text-primary-foreground" />
        </motion.div>

        <h1 className="font-display text-lg font-bold tracking-widest text-primary-foreground uppercase">
          {t("menu.title", "MENUS")}
        </h1>

        <div className="relative">
          <ShoppingCart className="w-6 h-6 text-primary-foreground" />
          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
            {totalItems}
          </span>
        </div>
      </div>

      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />
      <SurveyModal isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />
    </header>
  );
}
