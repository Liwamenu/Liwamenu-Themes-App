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

  const socialLinksList = [
    { url: SocialLinks.facebookUrl, icon: Facebook, label: "Facebook" },
    { url: SocialLinks.instagramUrl, icon: Instagram, label: "Instagram" },
    { url: SocialLinks.youtubeUrl, icon: Youtube, label: "YouTube" },
    { url: SocialLinks.whatsappUrl, icon: MessageCircle, label: "WhatsApp" },
  ].filter((link) => link.url);

  return (
    <footer className="bg-foreground text-card mt-8">
      <div className="max-w-[600px] mx-auto px-4 py-10">
        {/* Restaurant Name */}
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl font-bold italic text-card">{restaurant.name}</h2>
          {restaurant.slogan2 && <p className="text-card/60 text-sm mt-1 italic">{restaurant.slogan2}</p>}
        </div>

        {/* Social Links */}
        {socialLinksList.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-center gap-3">
              {socialLinksList.map((link, index) => (
                <a
                  key={index}
                  href={link.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-card/20 hover:bg-card/10 transition-colors flex items-center justify-center text-card/70 hover:text-card"
                  aria-label={link.label}
                >
                  <link.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Working Hours */}
        <div className="max-w-sm mx-auto">
          <h3 className="font-display text-sm font-semibold text-center mb-3 text-card/80 uppercase tracking-wider">{t("footer.workingHours")}</h3>
          <div className="bg-card/5 rounded-xl p-4 space-y-2 border border-card/10">
            {WorkingHours.map((wh) => (
              <div key={wh.day} className="flex items-center justify-between text-sm">
                <span className="text-card/50">{t(`days.${dayKeys[wh.day]}`)}</span>
                {wh.isClosed ? (
                  <span className="text-destructive font-medium">{t("footer.closed")}</span>
                ) : (
                  <span className="font-medium text-card/90">{wh.open} - {wh.close}</span>
                )}
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex justify-center gap-3 mt-6 flex-wrap">
            {restaurant.reservationSettings?.isActive && (
              <Button
                onClick={() => setIsReservationOpen(true)}
                variant="outline"
                className="flex items-center gap-2 rounded-full bg-transparent border-card/20 text-card hover:bg-card/10"
              >
                <CalendarDays className="w-4 h-4" />
                <span>{t("reservation.button")}</span>
              </Button>
            )}
            <Button
              onClick={() => setIsSurveyOpen(true)}
              variant="outline"
              className="flex items-center gap-2 rounded-full bg-transparent border-card/20 text-card hover:bg-card/10"
            >
              <Star className="w-4 h-4" />
              <span>{t("survey.button")}</span>
            </Button>
          </div>
        </div>

        {/* Contact */}
        <div className="flex justify-center gap-4 mt-6">
          <a href={`tel:${restaurant.phoneNumber}`} className="w-10 h-10 rounded-full border border-card/20 hover:bg-card/10 transition-colors flex items-center justify-center text-card/70" aria-label="Phone">
            <Phone className="w-4 h-4" />
          </a>
          <a href={`https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-card/20 hover:bg-card/10 transition-colors flex items-center justify-center text-card/70" aria-label="Location">
            <MapPin className="w-4 h-4" />
          </a>
        </div>

        {/* Address */}
        <div className="mt-6 text-center text-xs text-card/40">
          <a href={`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`} target="_blank" rel="noopener noreferrer" className="hover:text-card/60 transition-colors">
            {restaurant.address}
          </a>
          <p className="mt-1">{restaurant.phoneNumber}</p>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-card/10 text-center text-xs text-card/30">
          <p>© {new Date().getFullYear()} {restaurant.name}. {t("footer.allRightsReserved")}</p>
        </div>
      </div>

      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />
      <SurveyModal isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />
    </footer>
  );
}
