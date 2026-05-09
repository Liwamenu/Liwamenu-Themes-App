import type { AllergenCode } from "@/types/restaurant";

/**
 * EU 14 major allergen catalog.
 *
 * Reference:
 *  - EU Reg. 1169/2011 Annex II (Food Information to Consumers Regulation)
 *  - Türk Gıda Kodeksi Etiketleme ve Tüketicileri Bilgilendirme Yönetmeliği — Ek-2
 *
 * Both lists are identical — these 14 allergens are the legally mandated set
 * that every food business must declare in EU and Turkey.
 *
 * `i18nKey` resolves through the global locale files (allergens.<code>).
 * `icon` is a unicode emoji used as a quick visual marker.
 */
export interface AllergenInfo {
  code: AllergenCode;
  i18nKey: string;
  icon: string;
}

/**
 * Resmi alt kategori örnekleri (Türk Gıda Kodeksi & EU Annex II).
 * Admin paneli üretimi sırasında bu örnekler tooltip / açıklama olarak
 * gösterilebilir — restoran personeli "treeNuts" işaretlerken hangi
 * yemişlerin dahil olduğunu görür.
 *
 * NOT: Bunlar bilgilendirme amaçlıdır; mevzuata göre tek `code` etiketi
 * tüm alt kategorileri zaten kapsar.
 */
export const ALLERGEN_INCLUDES: Record<AllergenCode, string[]> = {
  gluten:      ["Buğday", "Çavdar", "Arpa", "Yulaf", "Kılçıksız Buğday (spelt)", "Kamut", "Hibrit Türleri"],
  crustaceans: ["Karides", "Yengeç", "Istakoz", "Kerevit"],
  eggs:        ["Tüm tavuk yumurtası ürünleri"],
  fish:        ["Tüm balık türleri ve ürünleri"],
  peanuts:     ["Yerfıstığı ve ürünleri"],
  soybeans:    ["Soya fasulyesi ve ürünleri"],
  milk:        ["İnek, koyun, keçi sütü", "Laktoz", "Tereyağı, peynir, yoğurt"],
  treeNuts:    ["Badem", "Fındık", "Ceviz", "Kaju", "Pekan cevizi", "Brezilya cevizi", "Antep fıstığı", "Macadamia"],
  celery:      ["Kereviz ve ürünleri"],
  mustard:     ["Hardal ve ürünleri"],
  sesame:      ["Susam tohumu ve ürünleri"],
  sulphites:   ["Kükürt dioksit ve sülfitler — yalnızca >10 mg/kg veya >10 mg/L konsantrasyonda"],
  lupin:       ["Acı bakla ve ürünleri"],
  molluscs:    ["Midye", "İstiridye", "Kalamar", "Ahtapot", "Salyangoz"],
};

export const ALLERGENS: AllergenInfo[] = [
  { code: "gluten",      i18nKey: "allergens.gluten",      icon: "🌾" },
  { code: "crustaceans", i18nKey: "allergens.crustaceans", icon: "🦐" },
  { code: "eggs",        i18nKey: "allergens.eggs",        icon: "🥚" },
  { code: "fish",        i18nKey: "allergens.fish",        icon: "🐟" },
  { code: "peanuts",     i18nKey: "allergens.peanuts",     icon: "🥜" },
  { code: "soybeans",    i18nKey: "allergens.soybeans",    icon: "🌱" },
  { code: "milk",        i18nKey: "allergens.milk",        icon: "🥛" },
  { code: "treeNuts",    i18nKey: "allergens.treeNuts",    icon: "🌰" },
  { code: "celery",      i18nKey: "allergens.celery",      icon: "🥬" },
  { code: "mustard",     i18nKey: "allergens.mustard",     icon: "🟡" },
  { code: "sesame",      i18nKey: "allergens.sesame",      icon: "•" },
  { code: "sulphites",   i18nKey: "allergens.sulphites",   icon: "🍷" },
  { code: "lupin",       i18nKey: "allergens.lupin",       icon: "🌼" },
  { code: "molluscs",    i18nKey: "allergens.molluscs",    icon: "🦪" },
];

export const ALLERGEN_BY_CODE = Object.fromEntries(
  ALLERGENS.map((a) => [a.code, a])
) as Record<AllergenCode, AllergenInfo>;
