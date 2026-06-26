import { lazy, Suspense } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";
import { useInitializeRestaurant, useRestaurantStore } from "@/hooks/useRestaurant";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
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
  5: lazy(() => import("./theme-6")),
  6: lazy(() => import("./theme-7")),
  7: lazy(() => import("./theme-8")),
  8: lazy(() => import("./theme-9")),
  9: lazy(() => import("./theme-10")),
  10: lazy(() => import("./theme-11")),
  11: lazy(() => import("./theme-12")),
  12: lazy(() => import("./theme-13")),
  13: lazy(() => import("./theme-14")),
  14: lazy(() => import("./theme-15")),
  15: lazy(() => import("./theme-16")),
  16: lazy(() => import("./theme-17")),
  17: lazy(() => import("./theme-18")),
  18: lazy(() => import("./theme-19")),
  19: lazy(() => import("./theme-20")),
  20: lazy(() => import("./theme-21")),
  21: lazy(() => import("./theme-22")),
  22: lazy(() => import("./theme-23")),
  23: lazy(() => import("./theme-24")),
  24: lazy(() => import("./theme-25")),
  25: lazy(() => import("./theme-26")),
  26: lazy(() => import("./theme-27")),
};

const DEFAULT_THEME_ID = 0;

const HIDDEN_MESSAGES: Record<string, { title: string; desc: string; regards: string }> = {
  tr: { title: "Şu anda hizmet veremiyoruz", desc: "Bu durumdan dolayı üzgünüz. Lütfen daha sonra tekrar deneyin.", regards: "Saygılarımızla." },
  en: { title: "We're currently unable to serve you", desc: "We apologize for the inconvenience. Please try again later.", regards: "Best regards." },
  de: { title: "Wir können Sie derzeit nicht bedienen", desc: "Wir entschuldigen uns für die Unannehmlichkeiten. Bitte versuchen Sie es später erneut.", regards: "Mit freundlichen Grüßen." },
  fr: { title: "Nous ne pouvons pas vous servir pour le moment", desc: "Nous nous excusons pour la gêne occasionnée. Veuillez réessayer plus tard.", regards: "Cordialement." },
  it: { title: "Al momento non possiamo servirvi", desc: "Ci scusiamo per il disagio. Si prega di riprovare più tardi.", regards: "Cordiali saluti." },
  es: { title: "En este momento no podemos atenderle", desc: "Lamentamos las molestias. Por favor, inténtelo de nuevo más tarde.", regards: "Atentamente." },
  ar: { title: "لا يمكننا تقديم الخدمة في الوقت الحالي", desc: "نعتذر عن الإزعاج. يرجى المحاولة مرة أخرى لاحقًا.", regards: "مع خالص التحية." },
  az: { title: "Hazırda xidmət göstərə bilmirik", desc: "Yaranan narahatçılığa görə üzr istəyirik. Zəhmət olmasa daha sonra yenidən cəhd edin.", regards: "Hörmətlə." },
  ru: { title: "В данный момент мы не можем вас обслужить", desc: "Приносим извинения за неудобства. Пожалуйста, попробуйте позже.", regards: "С уважением." },
  el: { title: "Αυτή τη στιγμή δεν μπορούμε να σας εξυπηρετήσουμε", desc: "Ζητούμε συγγνώμη για την αναστάτωση. Παρακαλώ δοκιμάστε ξανά αργότερα.", regards: "Με εκτίμηση." },
  zh: { title: "我们目前无法为您服务", desc: "对此带来的不便，我们深表歉意。请稍后再试。", regards: "此致敬礼。" },
};

function HiddenRestaurantFallback({
  menuLang,
  name,
  logoUrl,
}: {
  menuLang?: string;
  name?: string;
  logoUrl?: string;
}) {
  const browserLang = (typeof navigator !== "undefined" ? navigator.language : "").slice(0, 2).toLowerCase();
  const fallbackLang = (menuLang ?? "tr").toLowerCase();
  const msg =
    HIDDEN_MESSAGES[browserLang] ?? HIDDEN_MESSAGES[fallbackLang] ?? HIDDEN_MESSAGES.en;
  const dir = browserLang === "ar" ? "rtl" : "ltr";
  const initial = (name ?? "?").trim().charAt(0).toUpperCase();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" dir={dir}>
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card shadow-xl p-8 text-center">
        {/* Restaurant logo (falls back to the name's initial) */}
        <div className="mx-auto mb-4 w-24 h-24 rounded-full overflow-hidden border border-border bg-muted shadow-sm flex items-center justify-center">
          {logoUrl ? (
            <img src={logoUrl} alt={name ?? ""} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-muted-foreground">{initial}</span>
          )}
        </div>
        {name && <h1 className="text-xl font-bold text-foreground">{name}</h1>}
        <div className="mx-auto my-5 w-10 h-0.5 rounded-full bg-border" />
        <p className="text-base font-semibold text-foreground">{msg.title}</p>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{msg.desc}</p>
        <p className="mt-4 text-sm font-medium text-foreground/70">{msg.regards}</p>
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
  const { themeId, products, hide, menuLang, isActive, qrLicenseIsActive, userIsActive, googleAnalytics, name, logoUrl } =
    useRestaurantStore(
      useShallow((s) => ({
        themeId: s.restaurantData.themeId,
        products: s.restaurantData.products,
        hide: s.restaurantData.hide,
        menuLang: s.restaurantData.menuLang,
        isActive: s.restaurantData.isActive,
        qrLicenseIsActive: s.restaurantData.qrLicenseIsActive,
        userIsActive: s.restaurantData.userIsActive,
        googleAnalytics: s.restaurantData.googleAnalytics,
        name: s.restaurantData.name,
        logoUrl: s.restaurantData.logoImageUrl || s.restaurantData.imageAbsoluteUrl,
      }))
    );

  // Inject this restaurant's own Google Analytics (gtag.js) into the
  // customer page + track SPA route changes. No-op until a valid GA4
  // Measurement ID arrives on the DTO; safe to call on every render,
  // including the loading/blocked branches below (a hook must run
  // unconditionally — it self-guards on the id). See
  // useGoogleAnalytics for why this lives here and not the admin panel.
  useGoogleAnalytics(googleAnalytics);

  if (isLoading) return <LoadingFallback />;
  if (error) return <ErrorFallback error={error} />;
  const isBlocked =
    hide ||
    isActive === false ||
    qrLicenseIsActive === false ||
    userIsActive === false;
  if (isBlocked) return <HiddenRestaurantFallback menuLang={menuLang} name={name} logoUrl={logoUrl} />;
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
