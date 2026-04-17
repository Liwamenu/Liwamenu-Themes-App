import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, AlertTriangle, CalendarDays, Receipt, Star } from "lucide-react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { ReservationModal } from "./ReservationModal";
import { SurveyModal } from "./SurveyModal";
import { Button } from "@/components/ui/button";
import { Order } from "@/types/restaurant";

interface RestaurantHeaderProps {
  orders?: Order[];
  onViewOrder?: (order: Order) => void;
}

export function RestaurantHeader({ orders = [], onViewOrder }: RestaurantHeaderProps) {
  const { restaurant, isRestaurantActive, isCurrentlyOpen, getCurrentWorkingHour } = useRestaurant();
  const { t } = useTranslation();
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);

  const workingHour = getCurrentWorkingHour;
  const heroImage = restaurant.imageAbsoluteUrl || restaurant.heroImageUrl;

  return (
    <header className="relative bg-background">
      <div className="flex items-center justify-end gap-1 px-4 py-2 border-b border-border/50">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>

      <div className="container px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row gap-6 items-start"
        >
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="relative">
              <div
                className="w-20 h-20 md:w-24 md:h-24 rounded-2xl shadow-lg overflow-hidden border-4 border-primary/20"
                style={{ backgroundImage: `url(${heroImage})`, backgroundSize: "cover", backgroundPosition: "center" }}
              />
              {isRestaurantActive && isCurrentlyOpen && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full border-2 border-background flex items-center justify-center">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </span>
              )}
            </div>

            <div className="flex flex-col">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight">{restaurant.name}</h1>
              <p className="text-muted-foreground text-sm">{restaurant.slogan1}</p>
              <div className="mt-2">
                {!isRestaurantActive ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    {t("header.notServing")}
                  </span>
                ) : isCurrentlyOpen ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {t("header.open")}
                    {workingHour && (
                      <span className="text-primary/70">• {workingHour.open} - {workingHour.close}</span>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                    <Clock className="w-3 h-3" />
                    {t("header.currentlyClosed")}
                    {workingHour && !workingHour.isClosed && (
                      <span>• {workingHour.open} - {workingHour.close}</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:ml-auto">
            {restaurant.reservationSettings?.isActive && (
              <Button onClick={() => setIsReservationOpen(true)} variant="outline" size="sm" className="flex items-center gap-2 rounded-full text-xs">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{t("reservation.button")}</span>
              </Button>
            )}
            <Button onClick={() => setIsSurveyOpen(true)} variant="outline" size="sm" className="flex items-center gap-2 rounded-full text-xs">
              <Star className="w-3.5 h-3.5" />
              <span>{t("survey.button")}</span>
            </Button>
            {orders.length > 0 && onViewOrder && (
              <Button onClick={() => onViewOrder(orders[0])} size="sm" className="flex items-center gap-2 rounded-full text-xs">
                <Receipt className="w-3.5 h-3.5" />
                <span>{t("menu.myOrder")}</span>
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />
      <SurveyModal isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />
    </header>
  );
}
