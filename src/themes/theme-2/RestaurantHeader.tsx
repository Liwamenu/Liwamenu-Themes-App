import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, Phone, AlertTriangle, CalendarDays, Receipt, Star } from "lucide-react";
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

  return (
    <header className="relative">
      {/* Hero Banner */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <img
          src={restaurant.heroImageUrl || restaurant.imageAbsoluteUrl}
          alt={restaurant.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="container px-4 py-3 flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg border-2 border-white/50">
                <img
                  src={restaurant.logoImageUrl || restaurant.imageAbsoluteUrl}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="font-display text-lg font-bold text-white drop-shadow-md">{restaurant.name}</h1>
                <p className="text-xs text-white/80 drop-shadow-sm">{restaurant.slogan1}</p>
              </div>
            </motion.div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-card/80 backdrop-blur-sm rounded-full p-1 shadow-md">
                <ThemeSwitcher />
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          {!isRestaurantActive ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground text-sm font-semibold rounded-full shadow-lg">
              <AlertTriangle className="w-4 h-4" />
              <span>{t("header.notServing")}</span>
            </div>
          ) : isCurrentlyOpen ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-success text-success-foreground text-sm font-semibold rounded-full shadow-lg">
              <span className="w-2 h-2 bg-success-foreground rounded-full animate-pulse" />
              <span>{t("header.open")}</span>
              {workingHour && (
                <span className="opacity-80 text-xs">
                  {workingHour.open} - {workingHour.close}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-destructive/90 text-destructive-foreground text-sm font-semibold rounded-full shadow-lg animate-pulse-subtle">
              <Clock className="w-4 h-4" />
              <span>{t("header.currentlyClosed")}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Scrolling Marquee */}
      <div className="overflow-hidden bg-primary py-2">
        <motion.div
          animate={{ x: [0, -1000] }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="flex whitespace-nowrap"
        >
          {[...Array(10)].map((_, i) => (
            <span key={i} className="text-lg font-display font-bold text-primary-foreground mx-8">
              {restaurant.slogan2 || "Lezzetin Adresi"} ✦
            </span>
          ))}
        </motion.div>
      </div>

      {/* Action Buttons Row */}
      <div className="bg-card border-b border-border">
        <div className="container px-4 py-3">
          <div className="flex gap-2 flex-wrap items-center">
            {restaurant.reservationSettings?.isActive && (
              <Button
                onClick={() => setIsReservationOpen(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 rounded-full border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <CalendarDays className="w-4 h-4" />
                <span>{t("reservation.button")}</span>
              </Button>
            )}
            <Button
              onClick={() => setIsSurveyOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 rounded-full border-campaign/30 hover:bg-campaign hover:text-campaign-foreground transition-all"
            >
              <Star className="w-4 h-4" />
              <span>{t("survey.button")}</span>
            </Button>
            {orders.length > 0 && onViewOrder && (
              <Button
                onClick={() => onViewOrder(orders[0])}
                size="sm"
                className="flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-md"
              >
                <Receipt className="w-4 h-4" />
                <span>{t("menu.myOrder")}</span>
              </Button>
            )}
            
            <div className="flex items-center gap-4 ml-auto text-xs text-muted-foreground">
              <a href={`tel:${restaurant.phoneNumber}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{restaurant.phoneNumber}</span>
              </a>
              <a
                href={`https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{restaurant.district}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />
      <SurveyModal isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />
    </header>
  );
}
