import { useState, useEffect } from "react";
import type { Country } from "react-phone-number-input";
import { getCountryCallingCode } from "react-phone-number-input";
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
import { API_URLS, isTurkishPhone, apiFetch, createReservation, verifyReservation as apiVerifyReservation, getResponseData, getReservationAvailability, type ReservationAvailability } from "@/lib/api";
import { format } from "date-fns";
import { tr, enUS, de, fr, it, es, ar, az, ru, el, zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { buildE164Phone, sanitizeSubscriberDigits, validatePhoneForCountry, getMaxSubscriberDigits, getDefaultPhoneCountry } from "@/lib/phoneValidation";
import { Phone10Field } from "@/components/phone/Phone10Field";

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Inline/iframe mode: render the form WITHOUT the modal overlay,
   *  backdrop, body scroll-lock, or close button. Used by the standalone
   *  /reservation page that restaurants embed on their own websites. */
  embedded?: boolean;
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

/**
 * Detect the verify-time capacity-race error: between create (SMS sent) and
 * verify, another booking consumed the day's remaining MaxGuests, so the
 * backend rejects the verify call and marks the reservation Expired.
 *
 * Backend signals (in priority order):
 *   1. A structured `code` / `errorCode` containing "CAPACITY" — preferred.
 *   2. HTTP 409 Conflict — typical REST signal for this kind of race.
 *   3. Substring match on the localized message ("kapasite" / "capacity") —
 *      this catch path only runs on verify failures, and the only verify
 *      error mentioning kapasite is the race scenario (create-time capacity
 *      errors never reach the verify endpoint).
 */
const isCapacityRaceError = (error: unknown): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err = error as any;
  const body = err?.data ?? {};
  const code = body.code || body.errorCode || body.Code;
  if (typeof code === "string" && /CAPACITY/i.test(code)) return true;
  if (err?.status === 409) return true;
  const haystack = `${body.message_TR ?? ""} ${body.message_EN ?? ""} ${err?.message ?? ""}`.toLowerCase();
  return haystack.includes("kapasite") || haystack.includes("capacity");
};

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

export function ReservationModal({ isOpen, onClose, embedded = false }: ReservationModalProps) {
  const { t, i18n } = useTranslation();
  const { restaurant } = useRestaurant();
  
  // Get reservation settings from restaurant data with fallbacks
  const reservationSettings = {
    startTime: restaurant.reservationSettings?.startTime || "08:00",
    endTime: restaurant.reservationSettings?.endTime || "23:00",
    intervalMinutes: restaurant.reservationSettings?.intervalMinutes || 30,
    maxGuests: restaurant.reservationSettings?.maxGuests || 50,
    isActive: restaurant.reservationSettings?.isActive ?? false,
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
  // Set when verify-time capacity race rejects this reservation (the day's
  // MaxGuests was consumed by another booking between create+verify). We
  // bounce the user back to the form, clear the date, and surface an inline
  // banner so they pick a different day instead of just seeing a toast.
  const [capacityFullForDate, setCapacityFullForDate] = useState<Date | null>(null);

  // Daily reservation capacity for the currently-selected date. Null until a
  // date is picked (or if the lookup fails — in which case we fall back to the
  // static maxGuests bound and let the backend enforce the cap on Create).
  const [availability, setAvailability] = useState<ReservationAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // Phone is split into two parts: country + 10-digit subscriber number.
  // The default country comes from the restaurant's own contact number so
  // the prefix matches the restaurant's locale instead of always +90.
  const defaultPhoneCountry = getDefaultPhoneCountry(restaurant.phoneNumber);
  const [phoneCountry, setPhoneCountry] = useState<Country>(defaultPhoneCountry);
  const [phoneSubscriber, setPhoneSubscriber] = useState("");

  const [formData, setFormData] = useState<ReservationFormData>({
    fullName: "",
    phone: buildE164Phone(defaultPhoneCountry, ""),
    email: "",
    date: undefined,
    time: "",
    guests: 0,
    notes: "",
  });

  // Lock body + html scroll when modal is open (html-level lock is needed because
  // body{overflow:hidden} alone doesn't prevent the viewport from scrolling on modern browsers)
  useEffect(() => {
    // Inline embed must NOT lock the host page's scroll.
    if (embedded) return;
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen, embedded]);

  // The phone-country default has to follow the restaurant's own contact
  // number, but this modal stays mounted from page load and the restaurant
  // data arrives asynchronously — so the useState initializer above runs
  // against the bundled fallback (a +90 number) before the real tenant data
  // lands, freezing the country to TR. Re-derive it whenever the modal opens
  // (data is loaded by then) or the contact number changes, but only while
  // the field is still pristine so we never clobber a number the guest is
  // typing.
  useEffect(() => {
    if (!isOpen || phoneSubscriber) return;
    const next = getDefaultPhoneCountry(restaurant.phoneNumber);
    setPhoneCountry(next);
    setFormData((prev) => ({ ...prev, phone: buildE164Phone(next, "") }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, restaurant.phoneNumber]);

  // Only Turkish phone numbers (+90) can receive SMS
  const isTurkish = phoneCountry === "TR";

  // Whenever the selected date changes, look up the remaining daily capacity
  // so the guest selector can be bounded to what's actually left and a fully
  // booked day can refuse new reservations up front.
  useEffect(() => {
    if (!formData.date) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    const dateStr = format(formData.date, "yyyy-MM-dd");
    setAvailabilityLoading(true);
    getReservationAvailability(dateStr)
      .then((data) => {
        if (cancelled || !data) return;
        const remaining = Math.max(0, Number(data.remaining ?? 0));
        const next: ReservationAvailability = {
          date: data.date ?? dateStr,
          maxGuests: Number(data.maxGuests ?? reservationSettings.maxGuests),
          booked: Number(data.booked ?? 0),
          remaining,
          isFull: Boolean(data.isFull ?? remaining <= 0),
        };
        setAvailability(next);
        // Clamp an already-entered guest count down to what's still available.
        setFormData((prev) =>
          prev.guests > next.remaining ? { ...prev, guests: next.remaining } : prev
        );
      })
      .catch(() => {
        // Don't hard-block on a lookup failure — fall back to the static bound;
        // the backend still re-validates capacity when the reservation is created.
        if (!cancelled) setAvailability(null);
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.date]);

  // Effective upper bound for the guest selector: the remaining daily capacity
  // once known, otherwise the restaurant's static per-reservation max.
  const effectiveMaxGuests = availability ? availability.remaining : reservationSettings.maxGuests;
  // A fully booked day cannot accept any new reservation.
  const isDateFull = availability?.isFull ?? false;

  const handleInputChange = (field: keyof ReservationFormData, value: string | number | Date | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isPhoneValid = validatePhoneForCountry(buildE164Phone(phoneCountry, phoneSubscriber), phoneCountry);

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
    // Daily capacity guards (backend re-validates on Create as a backstop).
    if (isDateFull) {
      toast.error(t("reservation.dateFull"));
      return false;
    }
    if (availability && formData.guests > availability.remaining) {
      toast.error(t("reservation.remainingCapacity", { count: availability.remaining }));
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
      const res = await createReservation({
        restaurantId: restaurant.restaurantId,
        fullName: formData.fullName,
        phoneCountryCode: `+${getCountryCallingCode(phoneCountry)}`,
        phoneNumber: phoneSubscriber,
        email: formData.email,
        reservationDate: formData.date ? format(formData.date, "yyyy-MM-dd") : "",
        reservationTime: formData.time + ":00",
        guestCount: formData.guests,
        specialNotes: formData.notes,
        language: i18n.language,
      });
      const data = getResponseData(res);
      const reservation = data?.reservation || data?.Reservation;
      const id = reservation?.id || reservation?.Id || data?.reservationId || data?.id;
      if (id) setReservationId(id);

      toast.success(t(isTurkish ? "reservation.codeSentSMS" : "reservation.codeSentEmail"));
      setStep("code");
    } catch (error: any) {
      // apiFetch throws ApiError carrying the parsed ResponsBase body in
      // `error.data` ({ message_TR, message_EN, statusCode, data }) and
      // promotes message_TR to `error.message`. Read the locale field
      // from the body, then fall back to the other locale, then the
      // promoted message, then a generic string.
      const body = error?.data ?? {};

      // The per-phone cooldown error (RESERVATION_TOO_FREQUENT) is returned by
      // the backend as a hard-coded English string ("Reservation limit reached
      // for this phone number") without a localized message_TR, so it always
      // showed in English. Detect it — by errorCode or the known English
      // phrasing — and render our own copy in the user's selected language.
      const errorCode = String(body.errorCode || body.code || body.ErrorCode || "").toUpperCase();
      const rawMsg = String(
        body.message_EN || body.message_TR || body.message || error?.message || ""
      ).toLowerCase();
      const isTooFrequent =
        errorCode.includes("FREQUENT") ||
        /reservation limit reached|limit reached for this phone|too frequent|recently made|too many reservation/.test(rawMsg);

      const errorMessage = isTooFrequent
        ? t("reservation.tooFrequent")
        : (i18n.language === "tr" ? body.message_TR : body.message_EN) ||
          body.message_TR ||
          body.message_EN ||
          error?.message ||
          t("reservation.codeSendError");
      toast.error(errorMessage);
    } finally {
      setIsSendingCode(false);
    }
  };

  const navigateToReceipt = (code: string) => {
    const params = new URLSearchParams({
      restaurantName: restaurant.name ?? "",
      restaurantAddress: restaurant.address ?? "",
      restaurantPhone: restaurant.phoneNumber ?? "",
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
      const res = await apiVerifyReservation({
        reservationId: reservationId,
        verificationCode: verificationCode,
      });
      const data = getResponseData(res);
      const reservation = data?.reservation || data?.Reservation || data;
      const fallbackCode = `#${Array.from(crypto.getRandomValues(new Uint8Array(4))).map(b => b.toString(36)).join('').slice(0, 8).toUpperCase()}`;
      const code = reservation?.confirmationCode || reservation?.id || reservationId || fallbackCode;

      toast.success(t("reservation.success"));
      navigateToReceipt(code);
    } catch (error: any) {
      // Capacity-race: the day's MaxGuests filled up between create and
      // verify. Bounce back to the form with the date cleared and an
      // inline banner — much clearer than a toast disappearing while the
      // user stares at a now-meaningless code input.
      if (isCapacityRaceError(error)) {
        const fullDate = formData.date ?? null;
        setStep("form");
        setVerificationCode("");
        setReservationId("");
        setFormData((prev) => ({ ...prev, date: undefined }));
        setCapacityFullForDate(fullDate);
        return;
      }

      // Same shape as handleSendCode: prefer the backend's localized
      // message (error.data.message_TR / _EN), else map the legacy
      // INVALID_CODE sentinel, else a generic error.
      const body = error?.data ?? {};
      const localized =
        (i18n.language === "tr" ? body.message_TR : body.message_EN) ||
        body.message_TR ||
        body.message_EN;
      const isInvalidCode =
        (typeof error?.message === "string" && error.message.includes("INVALID_CODE")) ||
        JSON.stringify(body).includes("INVALID_CODE");
      const errorMessage =
        localized ||
        (isInvalidCode ? t("reservation.invalidCode") : error?.message || t("reservation.error"));
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep("form");
    setVerificationCode("");
    setReservationId("");
    setPhoneCountry(defaultPhoneCountry);
    setPhoneSubscriber("");
    setCapacityFullForDate(null);
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
    // Preserve form data when closing so user doesn't lose what they typed.
    // Only return to the form step if they were mid-verification.
    setStep("form");
    setVerificationCode("");
    onClose();
  };

  // Map the active UI language to a date-fns locale so the day name
  // (and English month abbrev.) render in the menu language instead of
  // always defaulting to English. Turkish is the app fallback.
  const dfLocale =
    ({ tr, en: enUS, de, fr, it, es, ar, az, ru, el, zh: zhCN } as Record<string, typeof tr>)[
      i18n.language
    ] || tr;

  const formatDisplayDate = (date: Date | undefined): string => {
    if (!date) return "";
    return format(date, i18n.language === "en" ? "MMM dd, yyyy" : "dd.MM.yyyy", {
      locale: dfLocale,
    });
  };

  const getDayName = (date: Date | undefined): string => {
    if (!date) return "";
    return format(date, "EEEE", { locale: dfLocale });
  };

  if (!isOpen) return null;

  const inner = (
    <>
          {/* Header */}
          <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">
              {step === "form" && t("reservation.title")}
              {step === "verify" && t("reservation.verifyTitle")}
              {step === "code" && t("reservation.enterCodeTitle")}
            </h2>
            {!embedded && (
              <button onClick={handleClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
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
                    const subscriber = sanitizeSubscriberDigits(next.subscriber, getMaxSubscriberDigits(next.country));
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

              {capacityFullForDate && (
                <div
                  role="alert"
                  className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 p-3 space-y-1"
                >
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {t("reservation.dateFull", { date: formatDisplayDate(capacityFullForDate) })}
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    {t("reservation.dateFullDesc")}
                  </p>
                </div>
              )}

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
                          // Picking any new date clears the capacity-full
                          // warning — the user has acknowledged it by acting.
                          setCapacityFullForDate(null);
                          setDatePickerOpen(false);
                        }}
                        disabled={(date) => {
                          // Past dates are never bookable.
                          if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
                          // Disable weekdays the restaurant is closed.
                          // workingHours[].day is ISO-numbered (Mon=1..Sun=7);
                          // JS getDay() is Sun=0..Sat=6, so map Sunday 0 -> 7.
                          const iso = date.getDay() === 0 ? 7 : date.getDay();
                          const wh = restaurant.workingHours?.find((w) => w.day === iso);
                          return wh?.isClosed ?? false;
                        }}
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
                  {t("reservation.guests")} ({t("common.max")} {effectiveMaxGuests})
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.guests === 0 ? "" : formData.guests.toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      handleInputChange("guests", 0);
                    } else {
                      const num = parseInt(val);
                      if (!isNaN(num) && num >= 0 && num <= effectiveMaxGuests) {
                        handleInputChange("guests", num);
                      }
                    }
                  }}
                  disabled={isDateFull}
                  className="h-12 leading-normal"
                />
                {/* Daily-capacity feedback for the selected date. */}
                {formData.date && availability && (
                  isDateFull ? (
                    <p className="text-sm text-destructive flex items-start gap-1.5">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{t("reservation.dateFull")}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("reservation.remainingCapacity", { count: availability.remaining })}
                    </p>
                  )
                )}
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

              <Button
                onClick={handleContinue}
                disabled={isDateFull || availabilityLoading}
                className="w-full h-12 text-base font-medium"
              >
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
    </>
  );

  // Embedded (iframe) mode: render the card inline — no overlay, no
  // backdrop, no animation, no close button. The standalone /reservation
  // page (which restaurants iframe-embed on their own sites) uses this.
  if (embedded) {
    return (
      <div className="w-full">
        <div className="relative w-full max-w-md mx-auto bg-card rounded-2xl border border-border shadow-sm">
          {inner}
        </div>
      </div>
    );
  }

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
          {inner}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
