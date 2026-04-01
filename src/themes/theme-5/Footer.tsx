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
    <footer className="bg-primary text-primary-foreground mt-8">
      <div className="max-w-[1220px] mx-auto px-4 py-8">
        {/* Social Links */}
        {socialLinksList.length > 0 && (
          <div className="mb-8">
            <h3 className="font-semibold text-center mb-4 text-primary-foreground/90">{t("footer.followUs")}</h3>
            <div className="flex justify-center gap-3">
              {socialLinksList.map((link, index) => (
                <a
                  key={index}
                  href={link.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-[36px] h-[36px] rounded-full border border-primary-foreground/40 hover:bg-primary-foreground/20 transition-colors flex items-center justify-center"
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
          <h3 className="font-semibold text-center mb-4 text-primary-foreground/90">{t("footer.workingHours")}</h3>
          <div className="bg-primary-foreground/10 rounded-2xl p-4 space-y-2 border border-primary-foreground/20">
            {WorkingHours.map((wh) => (
              <div key={wh.day} className="flex items-center justify-between text-sm">
                <span className="text-primary-foreground/70">{t(`days.${dayKeys[wh.day]}`)}</span>
                {wh.isClosed ? (
                  <span className="text-destructive font-medium">{t("footer.closed")}</span>
                ) : (
                  <span className="font-medium text-primary-foreground">
                    {wh.open} - {wh.close}
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
                className="flex items-center gap-2 rounded-full bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <CalendarDays className="w-4 h-4" />
                <span>{t("reservation.button")}</span>
              </Button>
            )}
            <Button
              onClick={() => setIsSurveyOpen(true)}
              variant="outline"
              className="flex items-center gap-2 rounded-full bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Star className="w-4 h-4" />
              <span>{t("survey.button")}</span>
            </Button>
          </div>
        </div>

        {/* Contact Icons */}
        <div className="flex justify-center gap-4 mt-6">
          <a
            href={`tel:${restaurant.phoneNumber}`}
            className="w-[36px] h-[36px] rounded-full border border-primary-foreground/40 hover:bg-primary-foreground/20 transition-colors flex items-center justify-center"
            aria-label="Phone"
          >
            <Phone className="w-5 h-5" />
          </a>
          <a
            href={`https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-[36px] h-[36px] rounded-full border border-primary-foreground/40 hover:bg-primary-foreground/20 transition-colors flex items-center justify-center"
            aria-label="Location"
          >
            <MapPin className="w-5 h-5" />
          </a>
        </div>

        {/* Restaurant Info */}
        <div className="mt-6 text-center text-sm text-primary-foreground/60">
          <p className="font-semibold text-primary-foreground text-lg mb-1">{restaurant.name}</p>
          {restaurant.slogan2 && <p className="italic mb-2 text-primary-foreground/80">{restaurant.slogan2}</p>}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary-foreground/90 transition-colors"
          >
            {restaurant.address}
          </a>
          <p className="mt-1">{restaurant.phoneNumber}</p>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-primary-foreground/20 text-center text-xs text-primary-foreground/50">
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
