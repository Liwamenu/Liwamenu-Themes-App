import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Facebook, Instagram, Youtube, MessageCircle, CalendarDays, Star, Heart } from "lucide-react";
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
    { url: SocialLinks.facebookUrl, icon: Facebook, label: "Facebook", color: "hover:bg-blue-500" },
    { url: SocialLinks.instagramUrl, icon: Instagram, label: "Instagram", color: "hover:bg-pink-500" },
    { url: SocialLinks.youtubeUrl, icon: Youtube, label: "YouTube", color: "hover:bg-red-500" },
    { url: SocialLinks.whatsappUrl, icon: MessageCircle, label: "WhatsApp", color: "hover:bg-green-500" },
  ].filter((link) => link.url);

  return (
    <footer className="bg-card border-t border-border mt-10">
      <div className="container px-4 py-12">
        {socialLinks.length > 0 && (
          <div className="mb-10">
            <h3 className="font-display font-semibold text-center mb-6 text-lg">{t("footer.followUs")}</h3>
            <div className="flex justify-center gap-3">
              {socialLinks.map((link, index) => (
                <a key={index} href={link.url!} target="_blank" rel="noopener noreferrer"
                  className={`w-12 h-12 rounded-full bg-secondary flex items-center justify-center transition-all duration-300 hover:text-white hover:scale-110 hover:shadow-lg ${link.color}`}
                  aria-label={link.label}>
                  <link.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-sm mx-auto">
          <h3 className="font-display font-semibold text-center mb-6 text-lg">{t("footer.workingHours")}</h3>
          <div className="bg-secondary/30 rounded-2xl p-5 space-y-3 border border-border/50">
            {WorkingHours.map((wh) => (
              <div key={wh.day} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t(`days.${dayKeys[wh.day]}`)}</span>
                {wh.isClosed ? (
                  <span className="text-destructive font-medium px-2 py-0.5 bg-destructive/10 rounded-full text-xs">{t("footer.closed")}</span>
                ) : (
                  <span className="font-medium text-foreground">{wh.open} - {wh.close}</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3 mt-6 flex-wrap">
            {restaurant.reservationSettings?.isActive && (
              <Button onClick={() => setIsReservationOpen(true)} variant="outline" className="flex items-center gap-2 rounded-full border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all">
                <CalendarDays className="w-4 h-4" />
                <span>{t("reservation.button")}</span>
              </Button>
            )}
            <Button onClick={() => setIsSurveyOpen(true)} variant="outline" className="flex items-center gap-2 rounded-full border-special/30 hover:bg-special hover:text-special-foreground transition-all">
              <Star className="w-4 h-4" />
              <span>{t("survey.button")}</span>
            </Button>
          </div>
        </div>

        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-4">
            <Heart className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-medium text-primary">Made with love</span>
          </div>
          <p className="font-display font-semibold text-foreground text-lg mb-1">{restaurant.name}</p>
          {restaurant.slogan2 && <p className="text-primary italic mb-3">{restaurant.slogan2}</p>}
          <a href={`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            {restaurant.address}
          </a>
          <p className="text-sm text-muted-foreground mt-1">{restaurant.phoneNumber}</p>
        </div>

        <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {restaurant.name}. {t("footer.allRightsReserved")}</p>
        </div>
      </div>

      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />
      <SurveyModal isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />
    </footer>
  );
}
