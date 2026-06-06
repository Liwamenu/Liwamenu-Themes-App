import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, Phone, AlertTriangle, CalendarDays, Receipt, Star } from "lucide-react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/menu/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/menu/ThemeSwitcher";
import { ReservationModal } from "@/components/menu/ReservationModal";
import { SurveyModal } from "@/components/menu/SurveyModal";
import { Button } from "@/components/ui/button";
import { GoogleReviewButton } from "@/components/menu/GoogleReviewButton";
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
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${restaurant.imageAbsoluteUrl || restaurant.heroImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative container px-4 pt-8 pb-6">
        {/* Language & Theme Switcher */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-card/90 backdrop-blur-sm shadow-sm">
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
              <div className="flex items-center gap-2 px-4 py-2 bg-card/90 backdrop-blur-sm text-success rounded-full text-sm font-medium shadow-sm">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span>{t("header.open")}</span>
                {workingHour && (
                <span className="text-foreground/80">
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

        </motion.div>
      </div>

      {/* Widgets Row — rendered below the hero, above the search box, primary-colored */}
      {orders.length > 0 && onViewOrder && (
        <div className="relative bg-background px-4 pt-3 pb-2">
          <div className="container mx-auto flex justify-center">
            <Button
              onClick={() => onViewOrder(orders[0])}
              size="sm"
              className="flex items-center gap-2 rounded-full"
            >
              <Receipt className="w-4 h-4" />
              <span>{t("menu.myOrder")}</span>
            </Button>
          </div>
        </div>
      )}
      <div className="relative bg-background px-4 pt-3 pb-4">
        <div className="container mx-auto grid grid-cols-2 gap-2">
          {restaurant.reservationSettings?.isActive && (
            <button
              onClick={() => setIsReservationOpen(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-opacity text-sm font-medium"
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span className="truncate">{t("reservation.button")}</span>
            </button>
          )}
          <button
            onClick={() => setIsSurveyOpen(true)}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-opacity text-sm font-medium"
          >
            <Star className="w-4 h-4 shrink-0" />
            <span className="truncate">{t("survey.button")}</span>
          </button>
          <GoogleReviewButton />
          <a
            href={`tel:${restaurant.phoneNumber}`}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors text-sm font-medium min-w-0"
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span className="truncate">{restaurant.phoneNumber}</span>
          </a>
          <a
            href={`https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors text-sm font-medium min-w-0"
          >
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">{restaurant.district}, {restaurant.city}</span>
          </a>
        </div>
      </div>

      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />
      <SurveyModal isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />
    </header>
  );
}
