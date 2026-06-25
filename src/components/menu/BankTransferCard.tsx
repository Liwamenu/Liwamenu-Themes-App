import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, Landmark, CopyCheck } from "lucide-react";
import type { RestaurantData } from "@/types/restaurant";

/**
 * Synthetic payment-method id for "Bankaya Transfer". Bank transfer isn't one
 * of the backend's `paymentMethods` entries — it's a separate restaurant
 * feature (bankTransferEnabled + bank fields) — so checkout represents it with
 * this stable client-side sentinel. Both the CheckoutModal option and the
 * OrderReceipt key off this value.
 */
export const BANK_TRANSFER_PAYMENT_ID = "bank-transfer";

/**
 * Whether the restaurant has Bank Transfer configured and usable. Requires the
 * flag plus at least an IBAN or bank name to show (so an enabled-but-empty
 * config doesn't render a blank card).
 */
export function isBankTransferAvailable(
  r: Pick<RestaurantData, "bankTransferEnabled" | "iban" | "bankName"> | null | undefined,
): boolean {
  return !!r?.bankTransferEnabled && !!(r.iban || r.bankName);
}

/** Copy text to the clipboard, with a fallback for older / non-secure contexts. */
async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch {
      /* give up silently — the value is still visible to copy by hand */
    }
    ta.remove();
  }
}

/** Local "copied ✓" feedback state + handler shared by the field & copy-all buttons. */
function useCopyFeedback(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    void writeClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return [copied, copy];
}

function CopyableField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const { t } = useTranslation();
  const [copied, copy] = useCopyFeedback();

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-stone-500">{label}</div>
        <div className={`text-sm text-stone-900 break-all ${mono ? "font-mono" : "font-medium"}`}>
          {value}
        </div>
      </div>
      <button
        type="button"
        onClick={() => copy(value)}
        aria-label={`${t("order.copy")} — ${label}`}
        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-medium transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? t("order.copied") : t("order.copy")}
      </button>
    </div>
  );
}

/**
 * Bank-transfer details card with copy-to-clipboard rows. Rendered on the
 * checkout confirm step and the order receipt.
 *
 * Built on a fixed `bg-stone-100` surface with stone/amber text tokens (not
 * theme-aware foreground) so the account details stay readable in every theme
 * and in both light/dark — and so theme-25's dark-dialog text override (which
 * excludes bg-stone-100 / bg-white / bg-amber) leaves the copy untouched.
 */
export function BankTransferCard({
  restaurant,
  className,
}: {
  restaurant: Pick<RestaurantData, "bankName" | "bankAccountHolder" | "iban" | "bankTransferNote">;
  className?: string;
}) {
  const { t } = useTranslation();
  const { bankName, bankAccountHolder, iban, bankTransferNote } = restaurant;
  const [copiedAll, copyAll] = useCopyFeedback();

  // One labelled block with every detail, for the "copy all" button.
  const allText = [
    bankName && `${t("order.bankName")}: ${bankName}`,
    bankAccountHolder && `${t("order.accountHolder")}: ${bankAccountHolder}`,
    iban && `${t("order.iban")}: ${iban}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className={`bg-stone-100 rounded-2xl p-4 space-y-3 text-stone-800 ${className ?? ""}`}>
      <div className="flex items-center gap-2 text-stone-900">
        <Landmark className="w-5 h-5" />
        <span className="font-semibold">{t("order.bankTransfer")}</span>
      </div>
      <p className="text-xs text-stone-600">{t("order.bankTransferInstruction")}</p>

      <div className="space-y-3 rounded-xl bg-white border border-stone-200 p-3">
        {bankName ? <CopyableField label={t("order.bankName")} value={bankName} /> : null}
        {bankAccountHolder ? (
          <CopyableField label={t("order.accountHolder")} value={bankAccountHolder} />
        ) : null}
        {iban ? <CopyableField label={t("order.iban")} value={iban} mono /> : null}
      </div>

      {/* Copy every detail at once. */}
      <button
        type="button"
        onClick={() => copyAll(allText)}
        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-stone-800 text-white text-sm font-semibold hover:bg-stone-700 active:scale-[0.99] transition-all"
      >
        {copiedAll ? <CopyCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copiedAll ? t("order.copied") : t("order.copyAll")}
      </button>

      {bankTransferNote ? (
        <p className="text-xs text-stone-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          {bankTransferNote}
        </p>
      ) : null}
    </div>
  );
}
