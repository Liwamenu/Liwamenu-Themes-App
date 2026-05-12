import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Bell, ArrowLeft, ChevronRight } from "lucide-react";
import { RestaurantHeader } from "./RestaurantHeader";
import { ProductCard } from "./ProductCard";
import { ProductDetailModal } from "./ProductDetailModal";
import { CartDrawer, CartButton } from "./CartDrawer";
import { CheckoutModal } from "./CheckoutModal";
import { OrderReceipt } from "./OrderReceipt";
import { Footer } from "./Footer";
import { SoundPermissionModal } from "./SoundPermissionModal";
import { CallWaiterModal } from "./CallWaiterModal";
import { ScrollToTop } from "@/components/menu/ScrollToTop";
import { LiwaMenuFooter } from "@/components/menu/LiwaMenuFooter";
import { getProductImageSrc, handleProductImageError } from "@/lib/productImage";
import { ReservationModal } from "./ReservationModal";
import { ChangeTableModal } from "./ChangeTableModal";
import { AnnouncementModal } from "./AnnouncementModal";
import { FlyingEmoji } from "./FlyingEmoji";
import { ExternalPageView } from "@/components/menu/ExternalPageView";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useOrder } from "@/hooks/useOrder";
import { useFlyingEmoji } from "@/hooks/useFlyingEmoji";
import { Product, Order, ExternalPage } from "@/types/restaurant";
import { Input } from "@/components/ui/input";
import { SubcategoryButtons, useSubcategoryFilter } from "@/components/menu/SubcategoryButtons";

type View = "menu" | "order";

/**
 * Theme-25 MenuPage — category-first drill-down layout.
 *
 * Default view shows a 2-column grid of CATEGORY CARDS (image + name +
 * product count). Tapping a category drills in to that category's
 * product grid with a back button to return. Search bypasses the
 * drill-down and shows global product results.
 *
 * No sticky CategoryTabs bar, no mega-card wrapping (those were
 * causing scroll issues in the previous iteration).
 */
export function MenuPage() {
  const { t } = useTranslation();
  const {
    categories,
    isRestaurantActive,
    isCurrentlyOpen,
    restaurant,
    formatPrice,
    setTableNumber,
  } = useRestaurant();
  const { orders } = useOrder();
  const { isVisible: isFlyingEmojiVisible, startPosition: flyingEmojiPosition, hideFlyingEmoji } =
    useFlyingEmoji();
  const subFilter = useSubcategoryFilter();

  /* Navigation state */
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentView, setCurrentView] = useState<View>("menu");
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [showSoundPermission, setShowSoundPermission] = useState(false);
  const [showCallWaiter, setShowCallWaiter] = useState(false);
  const [showReservation, setShowReservation] = useState(false);
  const [showTableSelection, setShowTableSelection] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  // Holds the currently-open external page (or null). Replaces the
  // old boolean — the API now returns an array of pages, so we need
  // to remember *which* one the user tapped.
  const [selectedExternalPage, setSelectedExternalPage] = useState<ExternalPage | null>(null);
  const showExternalPage = selectedExternalPage !== null;
  const [waiterCooldown, setWaiterCooldown] = useState(() => {
    const savedEndTime = localStorage.getItem("waiterCooldownEnd");
    if (savedEndTime) {
      const remaining = Math.ceil((parseInt(savedEndTime) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  const isAnyOverlayOpen =
    !!selectedProduct ||
    isCartOpen ||
    isCheckoutOpen ||
    showCallWaiter ||
    showReservation ||
    showTableSelection ||
    showSoundPermission ||
    showAnnouncement;
  useBodyScrollLock(currentView === "menu" && isAnyOverlayOpen);

  /* Mirror the `theme-25` class onto <html> so portal-rendered Radix
   *  modals (Dialog/Drawer/etc.) get picked up by our scoped CSS too.
   *  Without this, theme-25 overrides only apply inside the wrapper div
   *  and miss anything React.createPortal'd to document.body. */
  useEffect(() => {
    document.documentElement.classList.add("theme-25");
    return () => document.documentElement.classList.remove("theme-25");
  }, []);

  /* Announcement auto-show */
  useEffect(() => {
    const settings = restaurant.announcementSettings;
    if (!settings?.enabled) return;
    const timer = setTimeout(() => setShowAnnouncement(true), settings.delayMs * 1000);
    return () => clearTimeout(timer);
  }, [restaurant.announcementSettings]);

  /* Waiter cooldown countdown */
  useEffect(() => {
    if (waiterCooldown <= 0) {
      localStorage.removeItem("waiterCooldownEnd");
      return;
    }
    const timer = setInterval(() => setWaiterCooldown((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(timer);
  }, [waiterCooldown]);

  const handleWaiterSuccess = useCallback(() => {
    const endTime = Date.now() + 60 * 1000;
    localStorage.setItem("waiterCooldownEnd", endTime.toString());
    setWaiterCooldown(60);
  }, []);

  const canOrder = isRestaurantActive && isCurrentlyOpen;

  const handleOrderComplete = useCallback((order: Order) => {
    setIsCheckoutOpen(false);
    setViewingOrder(order);
    setCurrentView("order");
    window.scrollTo(0, 0);
  }, []);

  const handleBackToMenu = useCallback(() => {
    setCurrentView("menu");
    setViewingOrder(null);
    window.scrollTo(0, 0);
  }, []);

  const handleViewOrder = useCallback((order: Order) => {
    setViewingOrder(order);
    setCurrentView("order");
    window.scrollTo(0, 0);
  }, []);

  const handleSelectProduct = useCallback((p: Product) => setSelectedProduct(p), []);
  const handleCloseProduct = useCallback(() => setSelectedProduct(null), []);
  const handleOpenCart = useCallback(() => setIsCartOpen(true), []);
  const handleCloseCart = useCallback(() => setIsCartOpen(false), []);
  const handleOpenCheckout = useCallback(() => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  }, []);
  const handleCloseCheckout = useCallback(() => setIsCheckoutOpen(false), []);

  const handleOpenCallWaiter = useCallback(() => {
    if (!isCurrentlyOpen) {
      toast.error(t("common.closedHours"));
      return;
    }
    if (!restaurant.tableNumber) {
      setShowTableSelection(true);
      return;
    }
    setShowCallWaiter(true);
  }, [restaurant.tableNumber, isCurrentlyOpen, t]);

  const handleTableSelected = useCallback(
    (newTable: string) => {
      setTableNumber(newTable);
      toast.success(t("cart.tableChanged", { table: newTable }));
      setShowTableSelection(false);
      if (isCurrentlyOpen) setShowCallWaiter(true);
    },
    [setTableNumber, t, isCurrentlyOpen],
  );

  const handleShowSoundPermission = useCallback(() => setShowSoundPermission(true), []);
  const handleAllowSound = useCallback(() => {
    localStorage.setItem("soundPermission", "allowed");
    setShowSoundPermission(false);
  }, []);
  const handleDenySound = useCallback(() => {
    localStorage.setItem("soundPermission", "denied");
    setShowSoundPermission(false);
  }, []);

  /* Search globally across all categories */
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return categories
      .flatMap((c) => c.products)
      .filter(
        (p) =>
          String(p.name ?? "").toLowerCase().includes(q) ||
          String(p.description ?? "").toLowerCase().includes(q),
      );
  }, [searchQuery, categories]);

  /* Active category data (when drilled-in) */
  const activeCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const activeCategoryProducts = useMemo(() => {
    if (!activeCategory) return [];
    return subFilter.filter(activeCategory.id, activeCategory.products);
  }, [activeCategory, subFilter]);

  /* ---------- OrderReceipt route ---------- */
  if (currentView === "order" && viewingOrder) {
    return (
      <div className="theme-25">
        <OrderReceipt
          orderId={viewingOrder.id}
          onBack={handleBackToMenu}
          waiterCooldown={waiterCooldown}
          onWaiterSuccess={handleWaiterSuccess}
        />
      </div>
    );
  }

  /* ---------- Menu view ---------- */
  const isDrilledIn = !!activeCategory && !searchQuery;
  const isSearching = !!searchQuery.trim();

  return (
    <div className="theme-25 min-h-screen bg-background">
      <RestaurantHeader orders={orders} onViewOrder={handleViewOrder} />

      {/* Search row + Garson Çağır + cart button (frosted glass) */}
      <div className="px-3 sm:px-4 mt-3">
        <div className="rounded-2xl shadow-card p-3 bg-white/10 dark:bg-black/10 backdrop-blur-md">
          <div className="flex gap-2 items-center">
            <button
              onClick={handleOpenCallWaiter}
              disabled={waiterCooldown > 0 || !canOrder}
              aria-label={t("waiter.title")}
              className={`shrink-0 h-10 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-all ${
                waiterCooldown > 0 || !canOrder
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-[hsl(var(--brand-orange))] text-white shadow-md hover:opacity-90"
              }`}
            >
              <Bell className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">
                {waiterCooldown > 0 ? `${waiterCooldown}s` : t("waiter.button")}
              </span>
            </button>

            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("menu.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-11 pr-10 rounded-full border-0 bg-muted text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {canOrder && !isCartOpen && !selectedProduct && !showCallWaiter && !isCheckoutOpen && !showReservation && (
              <CartButton onClick={handleOpenCart} />
            )}
          </div>
        </div>
      </div>

      {/* ===== SEARCH RESULTS ===== */}
      {isSearching && (
        <div className="px-3 sm:px-4 mt-3 pb-24">
          <div className="rounded-2xl shadow-card p-4 bg-black/60 dark:bg-black/10 backdrop-blur-md">
            <h2 className="text-base font-bold mb-3">
              {t("menu.searchResults", "Sonuçlar")}{" "}
              <span className="text-muted-foreground font-medium">({searchResults.length})</span>
            </h2>
            {searchResults.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                {t("menu.noResults", { query: searchQuery })}
              </div>
            ) : (
              <div
                key={`search-${searchQuery}`}
                className="grid grid-cols-2 gap-3"
              >
                {searchResults.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={handleSelectProduct}
                    isSpecialPriceActive={restaurant.isSpecialPriceActive}
                    specialPriceName={restaurant.specialPriceName}
                    formatPrice={formatPrice}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== CATEGORY GRID (default landing view) ===== */}
      {!isSearching && !isDrilledIn && (
        <div className="px-3 sm:px-4 mt-3 pb-24">
          <div className="rounded-2xl shadow-card p-4 bg-black/60 dark:bg-black/10 backdrop-blur-md">
            <h2 className="text-lg font-bold mb-3 text-white text-center">
              {t("menu.menuTitle", "Menü")}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className="flex flex-col rounded-t-2xl rounded-b-[4px] shadow-card hover:shadow-card-hover transition-shadow overflow-hidden text-left"
                >
                  <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-[hsl(var(--brand-orange-soft))] flex items-center justify-center text-[hsl(var(--brand-orange))] text-3xl">
                        🍽
                      </div>
                    )}
                  </div>
                  {/* Category name strip — white in light mode, anthracite
                   *  in dark mode (handled via the bg-white/dark:bg-anthracite
                   *  pair). Text flips the other way: black on white,
                   *  parchment on anthracite. */}
                  <div className="p-3 text-center bg-white dark:bg-[hsl(var(--anthracite))]">
                    <h3 className="font-bold text-sm text-black dark:text-[hsl(var(--anthracite-foreground))] line-clamp-1">
                      {cat.name}
                    </h3>
                  </div>
                </button>
              ))}
            </div>

            {/* External pages — one button per admin-published page,
             *  rendered in `sortOrder` ascending so the backend has
             *  full control over ordering. */}
            {restaurant.externalPages && restaurant.externalPages.length > 0 && (
              <div className="mt-4 space-y-2">
                {[...restaurant.externalPages]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((page) => (
                    <button
                      key={page.id}
                      onClick={() => setSelectedExternalPage(page)}
                      className="w-full p-3 rounded-xl bg-[hsl(var(--brand-orange-soft))] text-[hsl(var(--brand-orange))] flex items-center justify-between hover:opacity-90 transition-opacity"
                    >
                      <span className="font-semibold text-sm">{page.buttonName}</span>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== DRILL-IN: SINGLE CATEGORY VIEW ===== */}
      {isDrilledIn && activeCategory && (
        <div className="px-3 sm:px-4 mt-3 pb-24">
          <div className="rounded-2xl shadow-card p-4 bg-black/60 dark:bg-black/10 backdrop-blur-md">
            {/* Header row: back arrow + category title */}
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setSelectedCategoryId(null)}
                aria-label={t("menu.backToCategories", "Geri")}
                className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h2 className="text-lg font-bold text-white flex-1">
                {activeCategory.name}
              </h2>
            </div>

            {/* Optional subcategory pills */}
            <SubcategoryButtons
              categoryId={activeCategory.id}
              products={activeCategory.products}
              activeSub={subFilter.getActive(activeCategory.id)}
              onToggle={(subId) => subFilter.toggle(activeCategory.id, subId)}
            />

            {/* Products grid */}
            {activeCategoryProducts.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                {t("menu.empty", "Ürün bulunamadı")}
              </div>
            ) : (
              <div
                key={`cat-${activeCategory.id}-${subFilter.getActive(activeCategory.id) ?? "all"}`}
                className="grid grid-cols-2 gap-3"
              >
                {activeCategoryProducts.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={handleSelectProduct}
                    isSpecialPriceActive={restaurant.isSpecialPriceActive}
                    specialPriceName={restaurant.specialPriceName}
                    formatPrice={formatPrice}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />

      {/* Modals */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal product={selectedProduct} onClose={handleCloseProduct} />
        )}
      </AnimatePresence>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={handleCloseCart}
        onCheckout={handleOpenCheckout}
        onCallWaiter={handleOpenCallWaiter}
        onTableRequired={() => setShowTableSelection(true)}
        waiterCooldown={waiterCooldown}
      />

      <AnimatePresence>
        {isCheckoutOpen && (
          <CheckoutModal
            onClose={handleCloseCheckout}
            onOrderComplete={handleOrderComplete}
            onShowSoundPermission={handleShowSoundPermission}
          />
        )}
      </AnimatePresence>

      <SoundPermissionModal
        isOpen={showSoundPermission}
        onAllow={handleAllowSound}
        onDeny={handleDenySound}
      />
      <CallWaiterModal
        isOpen={showCallWaiter}
        onClose={() => setShowCallWaiter(false)}
        onSuccess={handleWaiterSuccess}
      />
      <ReservationModal isOpen={showReservation} onClose={() => setShowReservation(false)} />
      <ChangeTableModal
        isOpen={showTableSelection}
        onClose={() => setShowTableSelection(false)}
        onTableChange={handleTableSelected}
        currentTable={undefined}
      />

      <FlyingEmoji
        isVisible={isFlyingEmojiVisible}
        startPosition={flyingEmojiPosition}
        onComplete={hideFlyingEmoji}
      />
      <AnnouncementModal
        isOpen={showAnnouncement}
        onClose={() => setShowAnnouncement(false)}
        htmlContent={restaurant.announcementSettings?.htmlContent || ""}
      />
      {selectedExternalPage && (
        <ExternalPageView
          html={selectedExternalPage.htmlBody}
          image={selectedExternalPage.imageURL}
          onClose={() => setSelectedExternalPage(null)}
        />
      )}

      <ScrollToTop />
      <LiwaMenuFooter />
    </div>
  );
}
