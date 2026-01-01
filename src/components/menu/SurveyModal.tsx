import { useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Star, Send, CheckCircle, Sparkles, UtensilsCrossed, Users, MessageSquare, SprayCan, UserCheck, X } from "lucide-react";
import PhoneInput, { Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { getE164Prefix, limitPhoneAfterCallingCode } from "@/lib/phone";
import { createLimitedPhoneInput } from "@/lib/phoneInputLimiter";
import { validatePhoneSubscriberDigits, getSubscriberDigitCount } from "@/lib/phoneValidation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRestaurant } from "@/hooks/useRestaurant";
import { API_URLS } from "@/lib/api";

interface SurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RatingCategory {
  key: string;
  icon: React.ReactNode;
  labelKey: string;
}

interface FlyingEmoji {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

const ratingCategories: RatingCategory[] = [
  { key: "food", icon: <UtensilsCrossed className="w-5 h-5" />, labelKey: "survey.categories.food" },
  { key: "service", icon: <Users className="w-5 h-5" />, labelKey: "survey.categories.service" },
  { key: "ambiance", icon: <Sparkles className="w-5 h-5" />, labelKey: "survey.categories.ambiance" },
  { key: "hygiene", icon: <SprayCan className="w-5 h-5" />, labelKey: "survey.categories.hygiene" },
  { key: "staff", icon: <UserCheck className="w-5 h-5" />, labelKey: "survey.categories.staff" },
];

// Emoji based on rating
const getRatingEmoji = (rating: number): string => {
  switch (rating) {
    case 1: return "😞";
    case 2: return "😕";
    case 3: return "😊";
    case 4: return "😃";
    case 5: return "🤩";
    default: return "⭐";
  }
};

export function SurveyModal({ isOpen, onClose }: SurveyModalProps) {
  const { t } = useTranslation();
  const { restaurant } = useRestaurant();
  
  const [step, setStep] = useState<"form" | "success">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState<Country>("TR");
  const limitedPhoneInput = useMemo(() => createLimitedPhoneInput(phoneCountry, 10), [phoneCountry]);
  
  const [ratings, setRatings] = useState<Record<string, number>>({
    food: 0,
    service: 0,
    ambiance: 0,
    hygiene: 0,
    staff: 0,
  });
  const [hoveredRating, setHoveredRating] = useState<Record<string, number>>({});
  const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmoji[]>([]);
  const emojiIdRef = useRef(0);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: getE164Prefix("TR"),
    email: "",
    feedback: "",
  });

  // Phone validation (optional field - only validate if user started entering)
  const hasPhoneInput = formData.phone && formData.phone !== getE164Prefix(phoneCountry);
  const isPhoneValid = !hasPhoneInput || validatePhoneSubscriberDigits(formData.phone, phoneCountry, 10);
  const phoneDigitCount = getSubscriberDigitCount(formData.phone, phoneCountry);
  const showPhoneError = hasPhoneInput && phoneDigitCount > 0 && !validatePhoneSubscriberDigits(formData.phone, phoneCountry, 10);

  const spawnEmojis = (rating: number, event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const modalContent = document.querySelector('[role="dialog"]');
    const modalRect = modalContent?.getBoundingClientRect() || { left: 0, top: 0 };
    
    const baseX = rect.left - modalRect.left + rect.width / 2;
    const baseY = rect.top - modalRect.top + rect.height / 2;
    
    const emoji = getRatingEmoji(rating);
    const count = Math.min(rating + 2, 7); // More emojis for higher ratings
    
    const newEmojis: FlyingEmoji[] = [];
    for (let i = 0; i < count; i++) {
      emojiIdRef.current += 1;
      newEmojis.push({
        id: emojiIdRef.current,
        emoji,
        x: baseX + (Math.random() - 0.5) * 40,
        y: baseY,
      });
    }
    
    setFlyingEmojis((prev) => [...prev, ...newEmojis]);
    
    // Remove emojis after animation
    setTimeout(() => {
      setFlyingEmojis((prev) => prev.filter((e) => !newEmojis.find((ne) => ne.id === e.id)));
    }, 1500);
  };

  const handleRatingChange = (category: string, rating: number, event: React.MouseEvent) => {
    setRatings((prev) => ({ ...prev, [category]: rating }));
    spawnEmojis(rating, event);
  };

  const handleSubmit = async () => {
    // Check if at least one rating is given
    const hasRating = Object.values(ratings).some((r) => r > 0);
    if (!hasRating) return;

    setIsSubmitting(true);

    try {
      const surveyData = {
        restaurantId: restaurant.restaurantId,
        ratings,
        feedback: formData.feedback.trim(),
        customerName: formData.name.trim() || undefined,
        customerPhone: formData.phone || undefined,
        customerEmail: formData.email.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      const response = await fetch(API_URLS.surveys, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(surveyData),
      });

      if (!response.ok) throw new Error("Survey submission failed");

      setStep("success");
    } catch (error) {
      console.error("Survey error:", error);
      // Still show success to user for better UX
      setStep("success");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset after animation
    setTimeout(() => {
      setStep("form");
      setRatings({ food: 0, service: 0, ambiance: 0, hygiene: 0, staff: 0 });
      setHoveredRating({});
      setFormData({ name: "", phone: "", email: "", feedback: "" });
      setFlyingEmojis([]);
    }, 300);
  };

  const renderStars = (category: string) => {
    const currentRating = hoveredRating[category] || ratings[category];
    
    return (
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            type="button"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onPointerEnter={() => setHoveredRating((prev) => ({ ...prev, [category]: star }))}
            onPointerLeave={() => setHoveredRating((prev) => ({ ...prev, [category]: 0 }))}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRatingChange(category, star, e as unknown as React.MouseEvent);
            }}
            className="p-1 focus:outline-none touch-manipulation cursor-pointer"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Star
              className={`w-7 h-7 sm:w-8 sm:h-8 transition-all duration-200 ${
                star <= currentRating
                  ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                  : "text-muted-foreground/30"
              }`}
            />
          </motion.button>
        ))}
      </div>
    );
  };

  const hasAnyRating = Object.values(ratings).some((r) => r > 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 overflow-x-hidden [&>button:last-child]:hidden">
        {/* Custom Close Button */}
        <DialogClose className="absolute left-4 top-8 z-50 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center opacity-100 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <X className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="sr-only">Kapat</span>
        </DialogClose>
        {/* Flying Emojis */}
        <AnimatePresence>
          {flyingEmojis.map((emoji) => (
            <motion.div
              key={emoji.id}
              initial={{ 
                x: emoji.x, 
                y: emoji.y, 
                scale: 0,
                opacity: 1 
              }}
              animate={{ 
                x: emoji.x + (Math.random() - 0.5) * 100,
                y: emoji.y - 120 - Math.random() * 60, 
                scale: [0, 1.5, 1],
                opacity: [1, 1, 0],
                rotate: (Math.random() - 0.5) * 60,
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 1.2,
                ease: "easeOut",
              }}
              className="absolute pointer-events-none text-3xl z-50"
              style={{ left: 0, top: 0 }}
            >
              {emoji.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
        
        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              {/* Header with decorative gradient */}
              <div className="relative -mx-6 -mt-6 mb-6 p-6 pb-8 bg-gradient-to-br from-primary/10 via-amber-500/10 to-orange-500/10 rounded-t-lg overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.2),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(249,115,22,0.15),transparent_50%)]" />
                
                <DialogHeader className="relative">
                  <div className="flex items-center justify-center mb-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.1 }}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25"
                    >
                      <MessageSquare className="w-8 h-8 text-white" />
                    </motion.div>
                  </div>
                  <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {t("survey.title")}
                  </DialogTitle>
                  <p className="text-center text-muted-foreground text-sm mt-2">
                    {t("survey.subtitle")}
                  </p>
                </DialogHeader>
              </div>

              <div className="space-y-6">
                {/* Rating Categories */}
                <div className="space-y-5">
                  {ratingCategories.map((category, index) => (
                    <motion.div
                      key={category.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-secondary/50 rounded-xl p-4"
                    >
                      <div className="flex flex-col items-start gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {category.icon}
                          </div>
                          <span className="font-medium">{t(category.labelKey)}</span>
                        </div>
                        {renderStars(category.key)}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Feedback textarea */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("survey.feedback")}</Label>
                  <Textarea
                    placeholder={t("survey.feedbackPlaceholder")}
                    value={formData.feedback}
                    onChange={(e) => setFormData((prev) => ({ ...prev, feedback: e.target.value }))}
                    className="min-h-[100px] resize-none leading-normal"
                  />
                </div>

                {/* Optional Contact Info */}
                <div className="space-y-4 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    {t("survey.optionalInfo")}
                  </p>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t("survey.name")}</Label>
                      <Input
                        placeholder={t("survey.namePlaceholder")}
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        className="leading-normal"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t("survey.email")}</Label>
                      <Input
                        type="email"
                        placeholder={t("survey.emailPlaceholder")}
                        value={formData.email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        className="leading-normal"
                      />
                      {formData.email && (
                        <p className="text-xs text-muted-foreground">
                          {t("survey.emailNote")}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t("survey.phone")}</Label>
                      <div className="phone-input-container">
                        <PhoneInput
                          international
                          defaultCountry="TR"
                          countryCallingCodeEditable={false}
                          limitMaxLength
                          inputComponent={limitedPhoneInput}
                          value={
                            limitPhoneAfterCallingCode(
                              formData.phone || getE164Prefix(phoneCountry),
                              phoneCountry,
                              10,
                            ) || getE164Prefix(phoneCountry)
                          }
                          onCountryChange={(c) => {
                            if (!c) return;
                            setPhoneCountry(c);
                            setFormData((prev) => ({ ...prev, phone: getE164Prefix(c) }));
                          }}
                          onChange={(value) => {
                            const next = limitPhoneAfterCallingCode(value || getE164Prefix(phoneCountry), phoneCountry, 10);
                            setFormData((prev) => ({ ...prev, phone: next || getE164Prefix(phoneCountry) }));
                          }}
                          placeholder={t("survey.phonePlaceholder")}
                        />
                      </div>
                      {showPhoneError && (
                        <p className="text-xs text-red-500 mt-1">
                          {t("common.phoneError")} ({phoneDigitCount}/10)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={!hasAnyRating || isSubmitting}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-orange-500/25 transition-all duration-300"
                >
                  {isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Send className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      {t("survey.submit")}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/25"
              >
                <CheckCircle className="w-10 h-10 text-white" />
              </motion.div>
              
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-foreground mb-2"
              >
                {t("survey.successTitle")}
              </motion.h3>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground mb-6"
              >
                {t("survey.successMessage")}
              </motion.p>

              {/* Display given ratings */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-secondary/50 rounded-xl p-4 mb-6"
              >
                <p className="text-sm font-medium mb-3">{t("survey.yourRatings")}</p>
                <div className="space-y-2">
                  {ratingCategories.map((category) => (
                    ratings[category.key] > 0 && (
                      <div key={category.key} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t(category.labelKey)}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= ratings[category.key]
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/20"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </motion.div>
              
              <Button
                onClick={handleClose}
                variant="outline"
                className="rounded-full px-8"
              >
                {t("common.close")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
