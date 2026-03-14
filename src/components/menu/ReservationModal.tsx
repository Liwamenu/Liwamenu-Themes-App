import { useState, useEffect } from "react";
import type { Country } from "react-phone-number-input";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, Users, User, Phone, Mail, MessageSquare, AlertTriangle, Check, Edit2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRestaurant } from "@/hooks/useRestaurant";
import { toast } from "sonner";
import { API_URLS, isTurkishPhone, apiFetch, createReservation, verifyReservation as apiVerifyReservation, getResponseData } from "@/lib/api";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { buildE164Phone, sanitizeSubscriberDigits } from "@/lib/phoneValidation";
import { Phone10Field } from "@/components/phone/Phone10Field";

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReservationFormData {
  fullName: string;
  phone: string;
  email: string;
  date: Date | undefined;
  time: string;
  guests: number;
  notes: string;
}

type Step = "form" | "verify" | "code";

// Generate time slots based on settings
const generateTimeSlots = (startTime: string, endTime: string, intervalMinutes: number) => {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  
  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  while (currentMinutes <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    slots.push(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`);
    currentMinutes += intervalMinutes;
  }
  return slots;
};

export function ReservationModal({ isOpen, onClose }: ReservationModalProps) {
  const { t, i18n } = useTranslation();
  const { restaurant } = useRestaurant();
  
  // Get reservation settings from restaurant data with fallbacks
  const reservationSettings = restaurant.reservationSettings || {
    startTime: "08:00",
    endTime: "23:00",
    intervalMinutes: 30,
    maxGuests: 50,
  };
  
  const TIME_SLOTS = generateTimeSlots(
    reservationSettings.startTime,
    reservationSettings.endTime,
    reservationSettings.intervalMinutes
  );
  const [step, setStep] = useState<Step>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [reservationId, setReservationId] = useState<string>("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Phone is split into two parts: country + 10-digit subscriber number
  const [phoneCountry, setPhoneCountry] = useState<Country>("TR");
  const [phoneSubscriber, setPhoneSubscriber] = useState("");

  const [formData, setFormData] = useState<ReservationFormData>({
    fullName: "",
    phone: buildE164Phone("TR", ""),
    email: "",
    date: undefined,
    time: "",
    guests: 0,
    notes: "",
  });

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Only Turkish phone numbers (+90) can receive SMS
  const isTurkish = phoneCountry === "TR";

  const handleInputChange = (field: keyof ReservationFormData, value: string | number | Date | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isPhoneValid = phoneSubscriber.length === 10;

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      toast.error(t("validation.enterName"));
      return false;
    }
    if (!formData.phone) {
      toast.error(t("validation.enterPhone"));
      return false;
    }
    if (!isPhoneValid) {
      toast.error(t("common.phoneError"));
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      toast.error(t("validation.enterValidEmail"));
      return false;
    }
    if (!formData.date) {
      toast.error(t("validation.selectDate"));
      return false;
    }
    if (!formData.time) {
      toast.error(t("validation.selectTime"));
      return false;
    }
    if (formData.guests < 1) {
      toast.error(t("validation.enterGuests"));
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (validateForm()) {
      setStep("verify");
    }
  };

  const handleEdit = () => {
    setStep("form");
  };

  const handleSendCode = async () => {
    setIsSendingCode(true);
    try {
      const apiUrl = isTurkish ? API_URLS.sendReservationCodeSMS : API_URLS.sendReservationCodeEmail;
      
      await apiFetch(apiUrl, {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant.restaurantId,
          phone: formData.phone,
          email: formData.email,
          language: i18n.language,
        }),
      });

      toast.success(t(isTurkish ? "reservation.codeSentSMS" : "reservation.codeSentEmail"));
      setStep("code");
    } catch (error) {
      toast.error(t("reservation.codeSendError"));
    } finally {
      setIsSendingCode(false);
    }
  };

  const navigateToReceipt = (code: string) => {
    const params = new URLSearchParams({
      restaurantName: restaurant.name,
      restaurantAddress: restaurant.address,
      restaurantPhone: restaurant.phoneNumber,
      fullName: formData.fullName,
      phone: formData.phone,
      date: formData.date ? format(formData.date, "yyyy-MM-dd") : "",
      time: formData.time,
      guests: formData.guests.toString(),
      notes: formData.notes,
      confirmationCode: code,
      createdAt: new Date().toLocaleString(i18n.language === "en" ? "en-US" : "tr-TR"),
      lang: i18n.language,
    });

    resetForm();
    onClose();
    window.open(`/reservation-receipt?${params.toString()}`, "_blank");
  };

  const handleSubmit = async () => {
    if (!verificationCode.trim()) {
      toast.error(t("validation.enterCode"));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createReservation({
        restaurantId: restaurant.restaurantId,
        fullName: formData.fullName,
        phoneCountryCode: formData.phone.startsWith("+90") ? "+90" : "+1",
        phoneNumber: formData.phone.replace(/^\+\d+/, ""),
        email: formData.email,
        reservationDate: formData.date ? format(formData.date, "yyyy-MM-dd") : "",
        reservationTime: formData.time + ":00",
        guestCount: formData.guests,
        specialNotes: formData.notes,
        verificationCode: verificationCode,
        language: i18n.language,
      });
      const data = getResponseData(res);
      const reservation = data?.reservation || data?.Reservation || data;
      const code = reservation?.confirmationCode || reservation?.id || `#${Math.floor(1000 + Math.random() * 9000)}`;

      toast.success(t("reservation.success"));
      navigateToReceipt(code);
    } catch (error: any) {
      if (error?.message?.includes("INVALID_CODE")) {
        toast.error(t("reservation.invalidCode"));
      } else {
        toast.error(t("reservation.error"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep("form");
    setVerificationCode("");
    setFormData({
      fullName: "",
      phone: "",
      email: "",
      date: undefined,
      time: "",
      guests: 0,
      notes: "",
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const formatDisplayDate = (date: Date | undefined): string => {
    if (!date) return "";
    return format(date, i18n.language === "en" ? "MMM dd, yyyy" : "dd.MM.yyyy");
  };

  const getDayName = (date: Date | undefined): string => {
    if (!date) return "";
    return format(date, i18n.language === "en" ? "EEEE" : "EEEE");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-card rounded-2xl shadow-xl my-4 max-h-[calc(100vh-2rem)] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">
              {step === "form" && t("reservation.title")}
              {step === "verify" && t("reservation.verifyTitle")}
              {step === "code" && t("reservation.enterCodeTitle")}
            </h2>
            <button onClick={handleClose} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Step */}
          {step === "form" && (
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  {t("reservation.fullName")}
                </label>
                <Input
                  type="text"
                  placeholder={t("reservation.fullNamePlaceholder")}
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  className="h-12 leading-normal"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {t("reservation.phone")}
                </label>
                <Phone10Field
                  value={{ country: phoneCountry, subscriber: phoneSubscriber }}
                  onChange={(next) => {
                    const subscriber = sanitizeSubscriberDigits(next.subscriber, 10);
                    setPhoneCountry(next.country);
                    setPhoneSubscriber(subscriber);
                    handleInputChange("phone", buildE164Phone(next.country, subscriber));
                  }}
                  subscriberPlaceholder="XXXXXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  {t("reservation.email")}
                </label>
                <Input
                  type="email"
                  placeholder={t("reservation.emailPlaceholder")}
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="h-12 leading-normal"
                />
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {t("reservation.emailWarning")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {t("reservation.date")}
                  </label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-12 justify-start text-left font-normal",
                          !formData.date && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {formData.date ? formatDisplayDate(formData.date) : t("common.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={formData.date}
                        onSelect={(date) => {
                          handleInputChange("date", date);
                          setDatePickerOpen(false);
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {t("reservation.time")}
                  </label>
                  <Select
                    value={formData.time}
                    onValueChange={(value) => handleInputChange("time", value)}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder={t("common.selectTime")} />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  {t("reservation.guests")} ({t("common.max")} {reservationSettings.maxGuests})
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="2"
                  value={formData.guests === 0 ? "" : formData.guests.toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      handleInputChange("guests", 0);
                    } else {
                      const num = parseInt(val);
                      if (!isNaN(num) && num >= 0 && num <= reservationSettings.maxGuests) {
                        handleInputChange("guests", num);
                      }
                    }
                  }}
                  className="h-12 leading-normal"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  {t("reservation.notes")} ({t("common.optional")})
                </label>
                <Textarea
                  placeholder={t("reservation.notesPlaceholder")}
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={3}
                />
              </div>

              <Button onClick={handleContinue} className="w-full h-12 text-base font-medium">
                {t("common.continue")}
              </Button>
            </div>
          )}

          {/* Verify Step */}
          {step === "verify" && (
            <div className="p-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {t(isTurkish ? "reservation.verifySMSTitle" : "reservation.verifyEmailTitle")}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    {t(isTurkish ? "reservation.verifySMSDesc" : "reservation.verifyEmailDesc")}
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("reservation.fullName")}:</span>
                  <span className="font-medium">{formData.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("reservation.phone")}:</span>
                  <span className="font-medium">{formData.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("reservation.email")}:</span>
                  <span className="font-medium text-primary">{formData.email}</span>
                </div>
                <div className="border-t border-border pt-3" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("reservation.date")}:</span>
                  <span className="font-medium">
                    {formatDisplayDate(formData.date)} ({getDayName(formData.date)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("reservation.time")}:</span>
                  <span className="font-medium">{formData.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("reservation.guests")}:</span>
                  <span className="font-medium">
                    {formData.guests} {t("common.guests")}
                  </span>
                </div>
                {formData.notes && (
                  <>
                    <div className="border-t border-border pt-3" />
                    <div>
                      <span className="text-muted-foreground">{t("reservation.notes")}:</span>
                      <p className="font-medium mt-1">{formData.notes}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleEdit} className="flex-1 h-12 gap-2">
                  <Edit2 className="w-4 h-4" />
                  {t("common.edit")}
                </Button>
                <Button onClick={handleSendCode} disabled={isSendingCode} className="flex-1 h-12 gap-2">
                  {isSendingCode ? (
                    <span className="animate-pulse">{t("reservation.sendingCode")}</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {t("reservation.sendCode")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Code Entry Step */}
          {step === "code" && (
            <div className="p-4 space-y-4">
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
                <p className="text-sm font-medium text-primary">
                  {t(isTurkish ? "reservation.codeSentToPhone" : "reservation.codeSentToEmail", {
                    contact: isTurkish ? formData.phone : formData.email
                  })}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("reservation.verificationCode")}</label>
                <Input
                  type="text"
                  placeholder={t("reservation.codePlaceholder")}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="h-14 text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                />
              </div>

              <Button
                variant="link"
                onClick={handleSendCode}
                disabled={isSendingCode}
                className="w-full text-sm"
              >
                {t("reservation.resendCode")}
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full h-12 text-base font-medium"
              >
                {isSubmitting ? t("reservation.submitting") : t("common.confirm")}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
