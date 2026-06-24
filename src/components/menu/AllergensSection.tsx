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
      {/* Header keeps the theme-aware foreground colors so the
          collapsed state blends with the rest of the modal. */}
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
        // Expanded content sits on a fixed off-white card across
        // every theme/mode so customers don't mistake the allergen
        // chips for a selectable add-on group. Slate / red text
        // tokens below are theme-independent on purpose because they
        // need to stay readable on this light background.
        //
        // Uses `bg-stone-100` (not an arbitrary hex) so the card opts into
        // theme-25's "intentionally light card in dark mode" exclusion list
        // — otherwise that theme's `.bg-card p/span` override repaints this
        // slate/red copy near-white and it vanishes on the light surface.
        <div className="mt-2 bg-stone-100 rounded-xl p-3">
          {list.length === 0 ? (
            <p className="text-xs text-slate-600 italic">
              {t("allergens.none")}
            </p>
          ) : (
            <div className="space-y-3">
              {contains.length > 0 && (
                <div>
                  <div className="text-[10px] font-medium text-red-700 uppercase tracking-wide mb-1.5">
                    {t("allergens.contains")}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {contains.map((a) => {
                      const info = ALLERGEN_BY_CODE[a.code];
                      if (!info) return null;
                      return (
                        <span
                          key={a.code}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-full text-[11px] font-medium"
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
                  <div className="text-[10px] font-medium text-slate-600 uppercase tracking-wide mb-1.5">
                    {t("allergens.mayContain")}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {mayContain.map((a) => {
                      const info = ALLERGEN_BY_CODE[a.code];
                      if (!info) return null;
                      return (
                        <span
                          key={a.code}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-slate-700 border border-slate-300 rounded-full text-[11px]"
                        >
                          <span className="text-xs">{info.icon}</span>
                          <span>{t(info.i18nKey)}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-slate-600 italic mt-2">
                {t("allergens.disclaimer")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
