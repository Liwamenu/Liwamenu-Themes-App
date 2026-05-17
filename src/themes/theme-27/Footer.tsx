import { useTranslation } from "react-i18next";
import { Facebook, Instagram, Youtube, MessageCircle } from "lucide-react";
import { TikTok } from "@/components/icons/TikTok";
import { useRestaurant } from "@/hooks/useRestaurant";

/**
 * Kiosk footer — minimal. Just social links + restaurant name.
 * Kiosk screens don't need working-hours tables or reservation buttons.
 */
export function Footer() {
  const { t } = useTranslation();
  const { restaurant } = useRestaurant();
  const { socialLinks: SocialLinks } = restaurant;

  const socialLinks = [
    { url: SocialLinks.facebookUrl, icon: Facebook, label: "Facebook" },
    { url: SocialLinks.instagramUrl, icon: Instagram, label: "Instagram" },
    { url: SocialLinks.tiktokUrl, icon: TikTok, label: "TikTok" },
    { url: SocialLinks.youtubeUrl, icon: Youtube, label: "YouTube" },
    { url: SocialLinks.whatsappUrl, icon: MessageCircle, label: "WhatsApp" },
  ].filter((link) => link.url);

  return (
    <footer className="border-t border-[hsl(var(--border))] mt-8 py-8 px-6">
      {socialLinks.length > 0 && (
        <div className="flex justify-center gap-3 mb-6">
          {socialLinks.map((link, index) => (
            <a
              key={index}
              href={link.url!}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-[hsla(0,0%,100%,0.06)] flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--kiosk-gold))] hover:bg-[hsla(var(--kiosk-gold),0.1)] transition-all"
              aria-label={link.label}
            >
              <link.icon className="w-5 h-5" />
            </a>
          ))}
        </div>
      )}

      <div className="text-center">
        <p className="font-semibold text-[hsl(var(--foreground))] text-sm">{restaurant.name}</p>
        {restaurant.slogan2 && (
          <p className="text-xs text-[hsl(var(--muted-foreground))] italic mt-1">{restaurant.slogan2}</p>
        )}
        <p className="text-xs text-[hsl(var(--muted-foreground))]/50 mt-3">
          &copy; {new Date().getFullYear()} {restaurant.name}
        </p>
      </div>
    </footer>
  );
}
