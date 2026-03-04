import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Facebook, Instagram, Youtube, MessageCircle, CalendarDays, Star } from "lucide-react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { ReservationModal } from "./ReservationModal";
import { SurveyModal } from "./SurveyModal";
import { Button } from "@/components/ui/button";

const dayKeys = ["", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function Footer() {
  const { t } = useTranslation();
  const { restaurant } = useRestaurant();
  const { SocialLinks, WorkingHours } = restaurant;
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);

  const socialLinks = [
    { url: SocialLinks.facebookUrl, icon: Facebook, label: "Facebook" },
    { url: SocialLinks.instagramUrl, icon: Instagram, label: "Instagram" },
    { url: SocialLinks.youtubeUrl, icon: Youtube, label: "YouTube" },
    { url: SocialLinks.whatsappUrl, icon: MessageCircle, label: "WhatsApp" },
  ].filter((link) => link.url);

  return (
    <footer className="bg-card border-t border-border mt-8">
      <div className="container px-4 py-8">
        {/* Social Links */}
        {socialLinks.length > 0 && (
          <div className="mb-8">
            <h3 className="font-semibold text-center mb-4">{t("footer.followUs")}</h3>
            <div className="flex justify-center gap-4">
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                  aria-label={link.label}
                >
                  <link.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Working Hours */}
        <div className="max-w-md mx-auto">
          <h3 className="font-semibold text-center mb-4">{t("footer.workingHours")}</h3>
          <div className="bg-secondary rounded-2xl p-4 space-y-2">
            {WorkingHours.map((wh) => (
              <div key={wh.Day} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t(`days.${dayKeys[wh.Day]}`)}</span>
                {wh.IsClosed ? (
                  <span className="text-destructive font-medium">{t("footer.closed")}</span>
                ) : (
                  <span className="font-medium">
                    {wh.Open} - {wh.Close}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Reservation and Survey Buttons */}
          <div className="flex justify-center gap-3 mt-6 flex-wrap">
            {restaurant.reservationSettings?.isActive && (
              <Button
                onClick={() => setIsReservationOpen(true)}
                variant="outline"
                className="flex items-center gap-2 rounded-full"
              >
                <CalendarDays className="w-4 h-4" />
                <span>{t("reservation.button")}</span>
              </Button>
            )}
            <Button
              onClick={() => setIsSurveyOpen(true)}
              variant="outline"
              className="flex items-center gap-2 rounded-full border-amber-500/50 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
            >
              <Star className="w-4 h-4" />
              <span>{t("survey.button")}</span>
            </Button>
          </div>
        </div>

        {/* Restaurant Info */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">{restaurant.name}</p>
          {restaurant.slogan2 && <p className="text-primary italic mb-2">{restaurant.slogan2}</p>}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            {restaurant.address}
          </a>
          <p className="mt-1">{restaurant.phoneNumber}</p>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {restaurant.name}. {t("footer.allRightsReserved")}
          </p>
        </div>
      </div>

      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />
      <SurveyModal isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />
    </footer>
  );
}
