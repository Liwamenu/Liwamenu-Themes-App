import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Product } from "@/types/restaurant";
import { ALLERGEN_BY_CODE } from "@/lib/allergens";

/**
 * Renders the EU/Türk Gıda Kodeksi 14-allergen disclosure for a
 * product. Splits the list into "Contains" and "May contain" groups
 * for clarity.
 *
 * Collapsed by default — most customers don't have allergies and a
 * row of red chips on every product card adds visual noise. The
 * header doubles as the toggle and shows a count badge so customers
 * who DO care can tell at a glance whether anything's declared.
 */
export function AllergensSection({ product }: { product: Product }) {
  const { t } = useTranslation();
  const list = product.allergens ?? [];
  const contains = list.filter((a) => a.presence === "contains");
  const mayContain = list.filter((a) => a.presence === "mayContain");
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 py-2 text-left"
      >
        <span className="flex items-center gap-2 font-semibold text-foreground">
          {t("allergens.title")}
          {list.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold">
              {list.length}
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-2">
          {list.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              {t("allergens.none")}
            </p>
          ) : (
            <div className="space-y-3">
              {contains.length > 0 && (
                <div>
                  <div className="text-[10px] font-medium text-destructive uppercase tracking-wide mb-1.5">
                    {t("allergens.contains")}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {contains.map((a) => {
                      const info = ALLERGEN_BY_CODE[a.code];
                      if (!info) return null;
                      return (
                        <span
                          key={a.code}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive border border-destructive/30 rounded-full text-[11px] font-medium"
                        >
                          <span className="text-xs">{info.icon}</span>
                          <span>{t(info.i18nKey)}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {mayContain.length > 0 && (
                <div>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    {t("allergens.mayContain")}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {mayContain.map((a) => {
                      const info = ALLERGEN_BY_CODE[a.code];
                      if (!info) return null;
                      return (
                        <span
                          key={a.code}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary text-secondary-foreground border border-border rounded-full text-[11px]"
                        >
                          <span className="text-xs">{info.icon}</span>
                          <span>{t(info.i18nKey)}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground/70 italic mt-2">
                {t("allergens.disclaimer")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
