import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, Phone, AlertTriangle, CalendarDays, Receipt } from "lucide-react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ReservationModal } from "./ReservationModal";
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

  const workingHour = getCurrentWorkingHour;

  return (
    <header className="relative overflow-hidden">
      {/* Hero Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-background" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

      <div className="relative container px-4 pt-8 pb-6">
        {/* Language Switcher */}
        <div className="absolute top-2 right-2 z-10">
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
              src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop"
              alt={restaurant.name}
              className="w-full h-full object-cover"
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
                    • {workingHour.Open} - {workingHour.Close}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-full text-sm font-medium">
                <Clock className="w-4 h-4" />
                <span>{t("header.closed")}</span>
                {workingHour && !workingHour.IsClosed && (
                  <span>• {t("header.opensAt", { time: workingHour.Open })}</span>
                )}
              </div>
            )}
          </div>

          {/* Reservation and My Order Buttons */}
          <div className="flex gap-2 my-2">
            {restaurant.isReservationLicenseActive && restaurant.isReservationActive && (
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
    </header>
  );
}
