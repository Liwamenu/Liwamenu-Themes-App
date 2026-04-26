import { lazy, Suspense, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";
import { useInitializeRestaurant, useRestaurantStore } from "@/hooks/useRestaurant";
import { initializeFirebaseMessaging } from "@/hooks/useFirebaseMessaging";

/**
 * Theme Registry
 * 
 * Each theme is lazy-loaded to keep the bundle small.
 * To add a new theme:
 * 1. Create src/themes/theme-N/index.tsx (must export default component)
 * 2. Add an entry here: N: lazy(() => import("./theme-N"))
 */
const themeComponents: Record<number, React.LazyExoticComponent<React.ComponentType>> = {
  0: lazy(() => import("./theme-1")),
  1: lazy(() => import("./theme-2")),
  2: lazy(() => import("./theme-3")),
  3: lazy(() => import("./theme-4")),
  4: lazy(() => import("./theme-5")),
};

const DEFAULT_THEME_ID = 0;

const HIDDEN_MESSAGES: Record<string, { title: string; desc: string }> = {
  tr: { title: "Menü Şu Anda Kullanılamıyor", desc: "Bu restoranın menüsü şu anda kullanıma kapalıdır. Lütfen daha sonra tekrar deneyin." },
  en: { title: "Menu Unavailable", desc: "This restaurant's menu is currently unavailable. Please check back later." },
  de: { title: "Menü Nicht Verfügbar", desc: "Das Menü dieses Restaurants ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut." },
  fr: { title: "Menu Indisponible", desc: "Le menu de ce restaurant est actuellement indisponible. Veuillez réessayer plus tard." },
  it: { title: "Menu Non Disponibile", desc: "Il menu di questo ristorante non è attualmente disponibile. Si prega di riprovare più tardi." },
  es: { title: "Menú No Disponible", desc: "El menú de este restaurante no está disponible en este momento. Por favor, inténtelo más tarde." },
  ar: { title: "القائمة غير متوفرة", desc: "قائمة هذا المطعم غير متوفرة حاليًا. يرجى المحاولة لاحقًا." },
  az: { title: "Menyu Əlçatan Deyil", desc: "Bu restoranın menyusu hazırda əlçatan deyil. Zəhmət olmasa daha sonra yenidən cəhd edin." },
  ru: { title: "Меню Недоступно", desc: "Меню этого ресторана в настоящее время недоступно. Пожалуйста, зайдите позже." },
  el: { title: "Το Μενού Δεν Είναι Διαθέσιμο", desc: "Το μενού αυτού του εστιατορίου δεν είναι διαθέσιμο αυτή τη στιγμή. Παρακαλώ δοκιμάστε ξανά αργότερα." },
  zh: { title: "菜单不可用", desc: "该餐厅的菜单目前不可用。请稍后再试。" },
};

function HiddenRestaurantFallback({ menuLang }: { menuLang?: string }) {
  const browserLang = (typeof navigator !== "undefined" ? navigator.language : "").slice(0, 2).toLowerCase();
  const fallbackLang = (menuLang ?? "tr").toLowerCase();
  const msg =
    HIDDEN_MESSAGES[browserLang] ?? HIDDEN_MESSAGES[fallbackLang] ?? HIDDEN_MESSAGES.en;
  const dir = browserLang === "ar" ? "rtl" : "ltr";
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" dir={dir}>
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl">🚫</div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">{msg.title}</h1>
          <p className="text-muted-foreground text-sm">{msg.desc}</p>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">{t("common.loading", "Loading...")}</p>
      </div>
    </div>
  );
}

function ErrorFallback({ error }: { error: string }) {
  const { t } = useTranslation();
  const isInvalidTenant = error === 'INVALID_TENANT';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl">
          {isInvalidTenant ? '🔍' : '⚠️'}
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            {isInvalidTenant
              ? t("errors.invalidTenant", "Restaurant Not Found")
              : t("errors.loadFailed", "Something went wrong")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isInvalidTenant
              ? t("errors.invalidTenantDesc", "The restaurant you're looking for doesn't exist or is no longer available.")
              : error}
          </p>
        </div>
        {!isInvalidTenant && (
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
          >
            {t("common.retry", "Retry")}
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyMenuFallback() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl">🍽️</div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            {t("errors.noProducts", "Menu Not Available")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("errors.noProductsDesc", "This restaurant hasn't added any products to their menu yet. Please check back later.")}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ThemeRouter() {
  const { isLoading, error } = useInitializeRestaurant();
  const { themeId, products, hide, menuLang, isActive, licenseIsActive, userIsActive } =
    useRestaurantStore(
      useShallow((s) => ({
        themeId: s.restaurantData.themeId,
        products: s.restaurantData.products,
        hide: s.restaurantData.hide,
        menuLang: s.restaurantData.menuLang,
        isActive: s.restaurantData.isActive,
        licenseIsActive: s.restaurantData.licenseIsActive,
        userIsActive: s.restaurantData.userIsActive,
      }))
    );

  // Initialize Firebase messaging once restaurant data is loaded
  useEffect(() => {
    if (!isLoading && !error) {
      initializeFirebaseMessaging();
    }
  }, [isLoading, error]);

  if (isLoading) return <LoadingFallback />;
  if (error) return <ErrorFallback error={error} />;
  const isBlocked =
    hide ||
    isActive === false ||
    licenseIsActive === false ||
    userIsActive === false;
  if (isBlocked) return <HiddenRestaurantFallback menuLang={menuLang} />;
  if (!products || products.length === 0) return <EmptyMenuFallback />;

  const resolvedThemeId = themeId ?? DEFAULT_THEME_ID;
  const ThemeComponent = themeComponents[resolvedThemeId];

  if (!ThemeComponent) {
    console.warn(`Theme ${resolvedThemeId} not found, falling back to theme ${DEFAULT_THEME_ID}`);
    const FallbackTheme = themeComponents[DEFAULT_THEME_ID];
    return (
      <Suspense fallback={<LoadingFallback />}>
        <FallbackTheme />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ThemeComponent />
    </Suspense>
  );
}
