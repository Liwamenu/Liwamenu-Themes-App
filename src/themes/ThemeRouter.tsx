import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useInitializeRestaurant, useRestaurantStore } from "@/hooks/useRestaurant";

/**
 * Theme Registry
 * 
 * Each theme is lazy-loaded to keep the bundle small.
 * To add a new theme:
 * 1. Create src/themes/theme-N/index.tsx (must export default component)
 * 2. Add an entry here: N: lazy(() => import("./theme-N"))
 */
const themeComponents: Record<number, React.LazyExoticComponent<React.ComponentType>> = {
  1: lazy(() => import("./theme-1")),
  // 2: lazy(() => import("./theme-2")),
  // 3: lazy(() => import("./theme-3")),
};

const DEFAULT_THEME_ID = 1;

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
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <p className="text-destructive font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
        >
          {t("common.retry", "Retry")}
        </button>
      </div>
    </div>
  );
}

export function ThemeRouter() {
  const { isLoading, error } = useInitializeRestaurant();
  const themeId = useRestaurantStore((s) => s.restaurantData.themeId);

  if (isLoading) return <LoadingFallback />;
  if (error) return <ErrorFallback error={error} />;

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
