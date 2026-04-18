import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changeLanguage } from "@/lib/i18n";

export default function ReservationReceipt() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();

  const restaurantName = searchParams.get("restaurantName") || "";
  const restaurantAddress = searchParams.get("restaurantAddress") || "";
  const restaurantPhone = searchParams.get("restaurantPhone") || "";
  const fullName = searchParams.get("fullName") || "";
  const phone = searchParams.get("phone") || "";
  const date = searchParams.get("date") || "";
  const time = searchParams.get("time") || "";
  const guests = searchParams.get("guests") || "";
  const notes = searchParams.get("notes") || "";
  const confirmationCode = searchParams.get("confirmationCode") || "";
  const createdAt = searchParams.get("createdAt") || "";
  const lang = searchParams.get("lang") || "tr";

  useEffect(() => {
    if (lang && i18n.language !== lang) {
      changeLanguage(lang);
    }
  }, [lang, i18n.language]);

  useEffect(() => {
    document.title = t("reservation.receiptTitle");
  }, [t]);

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'tr-TR', { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const getDayName = (dateStr: string): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'tr-TR', { weekday: "long" });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div
        id="receipt-content"
        className="bg-white text-black p-6 shadow-lg border border-border w-full max-w-sm print:shadow-none print:border-none print:p-0 print:max-w-none print:w-[80mm]"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        <div className="text-center">
          <h3 className="font-bold text-lg">{restaurantName}</h3>
          <p className="text-xs">{restaurantAddress}</p>
          <p className="text-xs">Tel: {restaurantPhone}</p>
        </div>

        <div className="border-t-2 border-b border-black my-3 h-1" />

        <div className="text-center font-bold text-lg">{t("reservation.newReservation")}</div>

        <div className="border-t border-dashed border-black my-3" />

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>{t("reservation.customer")}:</span>
            <span className="font-bold">{fullName}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("reservation.phone")}:</span>
            <span className="font-bold">{phone}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-black my-3" />

        <div className="space-y-1">
          <div className="flex justify-between text-base">
            <span>{t("reservation.date").toUpperCase()}:</span>
            <span className="font-bold">{formatDate(date)}</span>
          </div>
          <div className="flex justify-between text-base">
            <span>{i18n.language === 'en' ? 'DAY' : 'GÜN'}:</span>
            <span className="font-bold capitalize">{getDayName(date)}</span>
          </div>
          <div className="flex justify-between text-lg mt-1">
            <span>{t("reservation.time").toUpperCase()}:</span>
            <span className="font-bold">{time}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span>{t("common.guest")}:</span>
            <span className="font-bold">{guests} {t("common.guests")}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-black my-3" />

        <div className="text-sm">
          <span>{t("reservation.specialRequests")}:</span>
          <div className="border-2 border-black p-2 mt-1 font-bold uppercase">{notes || t("common.none")}</div>
        </div>

        <div className="border-t border-dashed border-black my-3" />

        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>{t("reservation.createdAt")}:</span>
            <span className="font-bold">{createdAt}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("reservation.confirmationCode")}:</span>
            <span className="font-bold">{confirmationCode}</span>
          </div>
        </div>

        <div className="text-center text-xs mt-5">*** {t("reservation.receiptFooter")} ***</div>
      </div>

      <div className="mt-6 w-full max-w-sm print:hidden">
        <Button onClick={handlePrint} className="w-full h-12 gap-2">
          <Printer className="w-4 h-4" />
          {t("common.print")}
        </Button>
      </div>
    </div>
  );
}
