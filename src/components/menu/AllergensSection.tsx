import { useTranslation } from "react-i18next";
import type { Product } from "@/types/restaurant";
import { ALLERGEN_BY_CODE } from "@/lib/allergens";

/**
 * Renders the EU/Türk Gıda Kodeksi 14-allergen disclosure for a product.
 * Splits the list into "Contains" and "May contain" groups for clarity.
 */
export function AllergensSection({ product }: { product: Product }) {
  const { t } = useTranslation();
  const list = product.allergens ?? [];
  const contains = list.filter((a) => a.presence === "contains");
  const mayContain = list.filter((a) => a.presence === "mayContain");

  return (
    <div className="mb-4">
      <h3 className="font-semibold text-foreground mb-3">{t("allergens.title")}</h3>
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{t("allergens.none")}</p>
      ) : (
        <div className="space-y-3">
          {contains.length > 0 && (
            <div>
              <div className="text-xs font-medium text-destructive uppercase tracking-wide mb-2">
                {t("allergens.contains")}
              </div>
              <div className="flex flex-wrap gap-2">
                {contains.map((a) => {
                  const info = ALLERGEN_BY_CODE[a.code];
                  if (!info) return null;
                  return (
                    <span
                      key={a.code}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive border border-destructive/30 rounded-full text-xs font-medium"
                    >
                      <span className="text-base">{info.icon}</span>
                      <span>{t(info.i18nKey)}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {mayContain.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {t("allergens.mayContain")}
              </div>
              <div className="flex flex-wrap gap-2">
                {mayContain.map((a) => {
                  const info = ALLERGEN_BY_CODE[a.code];
                  if (!info) return null;
                  return (
                    <span
                      key={a.code}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground border border-border rounded-full text-xs"
                    >
                      <span className="text-base">{info.icon}</span>
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
  );
}
