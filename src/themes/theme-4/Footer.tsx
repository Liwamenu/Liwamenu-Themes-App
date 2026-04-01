import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Facebook, Instagram, Youtube, MessageCircle, CalendarDays, Star, Phone, MapPin } from "lucide-react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { ReservationModal } from "./ReservationModal";
import { SurveyModal } from "./SurveyModal";
import { Button } from "@/components/ui/button";

const dayKeys = ["", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function Footer() {
  const { t } = useTranslation();
  const { restaurant } = useRestaurant();
  const { socialLinks: SocialLinks, workingHours: WorkingHours } = restaurant;
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);

  const socialLinks = [
    { url: SocialLinks.facebookUrl, icon: Facebook, label: "Facebook" },
    { url: SocialLinks.instagramUrl, icon: Instagram, label: "Instagram" },
    { url: SocialLinks.youtubeUrl, icon: Youtube, label: "YouTube" },
    { url: SocialLinks.whatsappUrl, icon: MessageCircle, label: "WhatsApp" },
  ].filter((link) => link.url);

  return (
    <footer className="bg-foreground text-background mt-8">
      <div className="container px-4 py-8">
        {socialLinks.length > 0 && (
          <div className="mb-8">
            <h3 className="font-semibold text-center mb-4 text-background/90">{t("footer.followUs")}</h3>
            <div className="flex justify-center gap-4">
              {socialLinks.map((link, index) => (
                <a key={index} href={link.url!} target="_blank" rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-background/10 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center border border-background/20"
                  aria-label={link.label}>
                  <link.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-md mx-auto">
          <h3 className="font-semibold text-center mb-4 text-background/90">{t("footer.workingHours")}</h3>
          <div className="bg-background/10 rounded-2xl p-4 space-y-2 border border-background/20">
            {WorkingHours.map((wh) => (
              <div key={wh.Day} className="flex items-center justify-between text-sm">
                <span className="text-background/70">{t(`days.${dayKeys[wh.Day]}`)}</span>
                {wh.IsClosed ? (
                  <span className="text-secondary font-medium">{t("footer.closed")}</span>
                ) : (
                  <span className="font-medium text-background">{wh.Open} - {wh.Close}</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3 mt-6 flex-wrap">
            {restaurant.isReservationLicenseActive && restaurant.isReservationActive && (
              <Button onClick={() => setIsReservationOpen(true)} variant="outline"
                className="flex items-center gap-2 rounded-full bg-transparent border-background/30 text-background hover:bg-background/10">
                <CalendarDays className="w-4 h-4" />
                <span>{t("reservation.button")}</span>
              </Button>
            )}
            <Button onClick={() => setIsSurveyOpen(true)} variant="outline"
              className="flex items-center gap-2 rounded-full bg-transparent border-primary/50 text-primary hover:bg-primary/10">
              <Star className="w-4 h-4" />
              <span>{t("survey.button")}</span>
            </Button>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <a href={`tel:${restaurant.phoneNumber}`}
            className="w-12 h-12 rounded-full bg-background/10 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center border border-background/20"
            aria-label="Phone">
            <Phone className="w-5 h-5" />
          </a>
          <a href={`https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`} target="_blank" rel="noopener noreferrer"
            className="w-12 h-12 rounded-full bg-background/10 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center border border-background/20"
            aria-label="Location">
            <MapPin className="w-5 h-5" />
          </a>
        </div>

        <div className="mt-6 text-center text-sm text-background/60">
          <p className="font-semibold text-background text-lg mb-1">{restaurant.name}</p>
          {restaurant.slogan2 && <p className="text-primary italic mb-2">{restaurant.slogan2}</p>}
          <a href={`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
            {restaurant.address}
          </a>
          <p className="mt-1">{restaurant.phoneNumber}</p>
        </div>

        <div className="mt-8 pt-6 border-t border-background/20 text-center text-xs text-background/50">
          <p>© {new Date().getFullYear()} {restaurant.name}. {t("footer.allRightsReserved")}</p>
        </div>
      </div>

      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />
      <SurveyModal isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />
    </footer>
  );
}
