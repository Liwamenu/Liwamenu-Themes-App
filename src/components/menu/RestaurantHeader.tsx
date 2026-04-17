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
    <header className="relative overflow-hidden">
      {/* Hero Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-background" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url(${restaurant.imageAbsoluteUrl || restaurant.heroImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

      <div className="relative container px-4 pt-8 pb-6">
        {/* Language & Theme Switcher */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center"
        >
          {/* Logo */}
          <div className="w-24 h-24 rounded-2xl bg-card shadow-card overflow-hidden mb-4 ring-4 ring-primary/20">
            <img
              src={restaurant.logoImageUrl}
              alt={restaurant.name}
              className="w-full h-full object-cover"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              width={96}
              height={96}
            />
          </div>

          {/* Name & Slogan */}
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">{restaurant.name}</h1>
          <p className="text-muted-foreground text-sm mb-4">{restaurant.slogan1}</p>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2 justify-center">
            {!isRestaurantActive ? (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-full text-sm font-medium"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{t("header.notServing")}</span>
              </motion.div>
            ) : isCurrentlyOpen ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-full text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span>{t("header.open")}</span>
                {workingHour && (
                <span className="text-muted-foreground">
                    • {workingHour.open} - {workingHour.close}
                  </span>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium animate-pulse-red"
              >
                <div className="flex items-center gap-2 text-destructive">
                  <Clock className="w-4 h-4" />
                  <span className="font-semibold">{t("header.currentlyClosed")}</span>
                </div>
                {workingHour && !workingHour.isClosed && (
                  <div className="text-muted-foreground text-xs">
                    {t("header.workingHours")}: {workingHour.open} - {workingHour.close}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Reservation, Survey and My Order Buttons */}
          <div className="flex gap-2 my-2 flex-wrap justify-center">
            {restaurant.reservationSettings?.isActive && (
              <Button
                onClick={() => setIsReservationOpen(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 rounded-full"
              >
                <CalendarDays className="w-4 h-4" />
                <span>{t("reservation.button")}</span>
              </Button>
            )}
            <Button
              onClick={() => setIsSurveyOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 rounded-full border-amber-500/50 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
            >
              <Star className="w-4 h-4" />
              <span>{t("survey.button")}</span>
            </Button>
            {orders.length > 0 && onViewOrder && (
              <Button
                onClick={() => onViewOrder(orders[0])}
                size="sm"
                className="flex items-center gap-2 rounded-full"
              >
                <Receipt className="w-4 h-4" />
                <span>{t("menu.myOrder")}</span>
              </Button>
            )}
          </div>

          {/* Info Row */}
          <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
            <a
              href={`tel:${restaurant.phoneNumber}`}
              className="flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>{restaurant.phoneNumber}</span>
            </a>
            <a
              href={`https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <MapPin className="w-4 h-4" />
              <span>
                {restaurant.district}, {restaurant.city}
              </span>
            </a>
          </div>
        </motion.div>
      </div>

      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />
      <SurveyModal isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />
    </header>
  );
}
