import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Bell, ArrowLeft } from "lucide-react";
import { RestaurantHeader } from "./RestaurantHeader";
import { ProductCard } from "./ProductCard";
import { ProductDetailModal } from "./ProductDetailModal";
import { CartDrawer, CartButton } from "./CartDrawer";
import { CheckoutModal } from "./CheckoutModal";
import { OrderReceipt } from "./OrderReceipt";
import { SoundPermissionModal } from "./SoundPermissionModal";
import { CallWaiterModal } from "./CallWaiterModal";
import { ScrollToTop } from "@/components/menu/ScrollToTop";
import { LiwaMenuFooter } from "@/components/menu/LiwaMenuFooter";
import { Footer } from "./Footer";
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

const CAMPAIGN_CATEGORY_ID = "__campaign__";

export function MenuPage() {
  const { t } = useTranslation();
  const {
    categories,
    campaignProducts,
    recommendedProducts,
    isRestaurantActive,
    isCurrentlyOpen,
    restaurant,
    formatPrice,
    setTableNumber,
  } = useRestaurant();
  const { orders } = useOrder();
  const { isVisible: isFlyingEmojiVisible, startPosition: flyingEmojiPosition, hideFlyingEmoji } = useFlyingEmoji();
  const subFilter = useSubcategoryFilter();
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
  // to remember which one the user tapped.
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

  useEffect(() => {
    const announcementSettings = restaurant.announcementSettings;
    if (!announcementSettings?.enabled) return;
    const timer = setTimeout(() => setShowAnnouncement(true), announcementSettings.delayMs * 1000);
    return () => clearTimeout(timer);
  }, [restaurant.announcementSettings]);

  useEffect(() => {
    if (waiterCooldown <= 0) {
      localStorage.removeItem("waiterCooldownEnd");
      return;
    }
    const timer = setInterval(() => setWaiterCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [waiterCooldown]);

  const handleWaiterSuccess = useCallback(() => {
    const endTime = Date.now() + 60 * 1000;
    localStorage.setItem("waiterCooldownEnd", endTime.toString());
    setWaiterCooldown(60);
  }, []);

  // When user types in search, surface flat product matches
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [] as Product[];
    const lowerQuery = searchQuery.toLowerCase();
    const all: Product[] = [];
    categories.forEach((c) => c.products.forEach((p) => all.push(p)));
    return all.filter(
      (p) =>
        String(p.name ?? "").toLowerCase().includes(lowerQuery) ||
        String(p.description ?? "").toLowerCase().includes(lowerQuery),
    );
  }, [categories, searchQuery]);

  const canOrder = isRestaurantActive && isCurrentlyOpen;

  const handleOrderComplete = useCallback((order: Order) => {
    setIsCheckoutOpen(false);
    setViewingOrder(order);
    setCurrentView("order");
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    window.scrollTo(0, 0);
  }, []);

  const handleBackToMenu = useCallback(() => {
    setCurrentView("menu");
    setViewingOrder(null);
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    window.scrollTo(0, 0);
  }, []);

  const handleViewOrder = useCallback((order: Order) => {
    setViewingOrder(order);
    setCurrentView("order");
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    window.scrollTo(0, 0);
  }, []);

  const handleSelectProduct = useCallback(
    (product: Product) => {
      setSelectedProduct(product);
    },
    [restaurant.onlineOrder, restaurant.inPersonOrder],
  );

  const handleCloseProduct = useCallback(() => setSelectedProduct(null), []);
  const handleOpenCart = useCallback(() => setIsCartOpen(true), []);
  const handleCloseCart = useCallback(() => setIsCartOpen(false), []);
  const handleOpenCheckout = useCallback(() => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  }, []);
  const handleCloseCheckout = useCallback(() => setIsCheckoutOpen(false), []);

  const handleOpenCallWaiterFloating = useCallback(() => {
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

  const handleOpenCallWaiter = useCallback(() => {
    if (!isCurrentlyOpen) {
      toast.error(t("common.closedHours"));
      return;
    }
    setIsCartOpen(false);
    setShowCallWaiter(true);
  }, [isCurrentlyOpen, t]);

  const handleCloseCallWaiter = useCallback(() => setShowCallWaiter(false), []);

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
  const handleCloseReservation = useCallback(() => setShowReservation(false), []);

  if (currentView === "order" && viewingOrder) {
    return (
      <div className="theme-19">
        <OrderReceipt
          orderId={viewingOrder.id}
          onBack={handleBackToMenu}
          waiterCooldown={waiterCooldown}
          onWaiterSuccess={handleWaiterSuccess}
        />
      </div>
    );
  }

  const activeCategory = selectedCategoryId
    ? selectedCategoryId === CAMPAIGN_CATEGORY_ID
      ? { id: CAMPAIGN_CATEGORY_ID, name: t("menu.campaignProducts"), products: campaignProducts, image: "" }
      : categories.find((c) => c.id === selectedCategoryId)
    : null;

  return (
    <div className="theme-19 min-h-screen bg-background">
      <RestaurantHeader orders={orders} onViewOrder={handleViewOrder} />

      {/* Sticky search + cart */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container px-4 py-3">
          <div className="flex gap-3 items-center">
            <button
              onClick={handleOpenCallWaiterFloating}
              disabled={waiterCooldown > 0}
              aria-label={t("waiter.title")}
              className={`shrink-0 h-10 px-3 rounded-full shadow-md flex items-center gap-2 text-xs font-medium transition-all ${
                waiterCooldown > 0
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              <Bell className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{waiterCooldown > 0 ? `${waiterCooldown}s` : t("waiter.button")}</span>
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("menu.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-11 pr-11 rounded-2xl border-border bg-secondary text-sm focus:border-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 hover:text-primary transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>
            {canOrder && !isCartOpen && !selectedProduct && !showCallWaiter && !isCheckoutOpen && !showReservation && (
              <CartButton onClick={handleOpenCart} />
            )}
          </div>
        </div>
      </div>

      <div className="container px-4 py-6 pb-24">
        {searchQuery ? (
          /* SEARCH RESULTS */
          <div className="product-zone rounded-3xl p-4">
            <h2 className="font-display text-2xl font-bold mb-4" style={{ color: "hsl(var(--surface-light-foreground))" }}>
              {t("menu.searchResults", "Arama Sonuçları")}
              <span className="text-sm font-normal product-card-muted ml-2">({filteredProducts.length})</span>
            </h2>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🔍</div>
                <p className="product-card-muted">{t("menu.noResults", { query: searchQuery })}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={handleSelectProduct}
                    isSpecialPriceActive={restaurant.isSpecialPriceActive}
                    specialPriceName={restaurant.specialPriceName}
                    formatPrice={formatPrice}
                  />
                ))}
              </div>
            )}
          </div>
        ) : !activeCategory ? (
          /* CATEGORY GRID — Zone 2 (amber tiles on plum bg) */
          <>
            {/* Chef Recommended — horizontal carousel.
             *  Sits on the plum page background between the search bar
             *  and the category bento grid. Bento-style tiles: cream
             *  surface, square photo with amber accent badge, and a
             *  burnt-orange band hosting the name + price (echoes the
             *  cat-band gradient used on the category tiles below). */}
            {recommendedProducts.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-display text-xl italic text-[hsl(var(--amber-soft))]">
                    <span className="mr-1">✨</span>
                    {t("menu.recommended")}
                  </h3>
                  <span className="flex-1 h-px bg-[hsl(var(--amber))]/40" />
                </div>
                <div className="flex gap-3 overflow-x-auto hide-scrollbar scroll-fade-x pb-2 -mx-4 px-4">
                  {/* Render the theme's actual ProductCard so the recommended
                   *  carousel items look like products, not category tiles
                   *  (the previous markup used `.cat-tile` + `.cat-band`,
                   *  which made these reads as little categories). The
                   *  shrink-0 w-40 wrapper gives each card a fixed slot
                   *  inside the horizontal flex carousel. */}
                  {recommendedProducts.slice(0, 8).map((product) => (
                    <div key={product.id} className="shrink-0 w-40">
                      <ProductCard
                        product={product}
                        onSelect={handleSelectProduct}
                        isSpecialPriceActive={restaurant.isSpecialPriceActive}
                        specialPriceName={restaurant.specialPriceName}
                        formatPrice={formatPrice}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="text-center mb-6">
              <h2 className="font-display text-3xl text-[hsl(var(--amber-soft))] italic">
                {t("menu.menuTitle", "Menümüz")}
              </h2>
              <div className="mt-3 mx-auto w-16 h-px bg-[hsl(var(--amber))]/60" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {campaignProducts.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedCategoryId(CAMPAIGN_CATEGORY_ID);
                    window.scrollTo({ top: 0, behavior: "auto" });
                  }}
                  className="cat-tile relative aspect-[16/15] rounded-[8px] overflow-hidden flex flex-col text-center"
                >
                  <div className="relative flex-1 overflow-hidden">
                    <img
                      src={getProductImageSrc(campaignProducts[0]?.imageURL)}
                      alt=""
                      onError={handleProductImageError}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[hsl(var(--campaign))] text-white text-[10px] font-bold shadow">
                      🔥
                    </span>
                  </div>
                  <div className="cat-band py-2 px-2">
                    <div className="font-display font-bold text-sm leading-tight">
                      {t("menu.campaignProducts")}
                    </div>
                    <div className="text-[10px] font-medium opacity-90 mt-0.5">
                      {t('menu.productCount', { count: campaignProducts.length })}
                    </div>
                  </div>
                </button>
              )}

              {categories.map((category) => {
                const img = (category as unknown as { image?: string }).image ||
                            getProductImageSrc(category.products[0]?.imageURL);
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategoryId(category.id);
                      // Land at the top of the product list rather than
                      // wherever the category tile happened to sit.
                      window.scrollTo({ top: 0, behavior: "auto" });
                    }}
                    className="cat-tile relative aspect-[16/15] rounded-[8px] overflow-hidden flex flex-col text-center"
                  >
                    <div className="relative flex-1 overflow-hidden">
                      {img && (
                        <img
                          src={img}
                          alt=""
                          onError={handleProductImageError}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="cat-band py-2 px-2">
                      <div className="font-display font-bold text-sm leading-tight line-clamp-1">
                        {category.name}
                      </div>
                      <div className="text-[10px] font-medium opacity-90 mt-0.5">
                        {t('menu.productCount', { count: category.products.length })}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* External Page Buttons — one per admin-published page,
                rendered in sortOrder ascending. */}
            {restaurant.externalPages && restaurant.externalPages.length > 0 && (
              <div className="mt-4 space-y-2">
                {[...restaurant.externalPages]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((page) => (
                    <button
                      key={page.id}
                      onClick={() => setSelectedExternalPage(page)}
                      className="w-full px-4 py-3 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-center hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {page.buttonName}
                    </button>
                  ))}
              </div>
            )}
          </>
        ) : (
          /* PRODUCT LIST FOR SELECTED CATEGORY — Zone 3 (cream pearl panel).
           *  The inline "Kategorilere Dön" pill that used to live above
           *  the title was removed in favor of the floating bottom pill
           *  rendered after the grid — users no longer have to scroll
           *  back to the top of a long category just to leave it. */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="product-zone rounded-3xl p-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display text-2xl font-bold italic" style={{ color: "hsl(var(--surface-light-foreground))" }}>
                {activeCategory.name}
              </h2>
              <span className="flex-1 h-px bg-[hsl(var(--surface-light-border))]" />
              <span className="text-xs product-card-muted">
                {t('menu.productCount', { count: activeCategory.products.length })}
              </span>
            </div>

            {selectedCategoryId !== CAMPAIGN_CATEGORY_ID && (
              <SubcategoryButtons
                categoryId={activeCategory.id}
                products={activeCategory.products}
                activeSub={subFilter.getActive(activeCategory.id)}
                onToggle={(subId) => subFilter.toggle(activeCategory.id, subId)}
              />
            )}

            <div className="grid grid-cols-2 gap-3 mt-3">
              <AnimatePresence mode="popLayout">
                {(selectedCategoryId === CAMPAIGN_CATEGORY_ID
                  ? activeCategory.products
                  : subFilter.filter(activeCategory.id, activeCategory.products)
                ).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={handleSelectProduct}
                    isSpecialPriceActive={restaurant.isSpecialPriceActive}
                    specialPriceName={restaurant.specialPriceName}
                    formatPrice={formatPrice}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Floating back-to-categories pill — same gradient as the
             *  removed inline button so the brand vocabulary survives,
             *  just relocated to a sticky bottom-center position so
             *  it's reachable from any scroll offset within a long
             *  category. z-30 keeps it under modals (z-50). */}
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              aria-label={t("menu.backToCategories", "Kategorilere Dön")}
              className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-2 h-11 pl-3 pr-5 rounded-full text-white font-semibold text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all"
              style={{ background: "linear-gradient(180deg, hsl(15, 80%, 38%) 0%, hsl(15, 85%, 30%) 100%)" }}
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
                <ArrowLeft className="w-3.5 h-3.5" />
              </span>
              <span>{t("menu.backToCategories", "Kategorilere Dön")}</span>
            </button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={handleCloseProduct} />}
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

      <SoundPermissionModal isOpen={showSoundPermission} onAllow={handleAllowSound} onDeny={handleDenySound} />
      <CallWaiterModal isOpen={showCallWaiter} onClose={handleCloseCallWaiter} onSuccess={handleWaiterSuccess} />
      <ReservationModal isOpen={showReservation} onClose={handleCloseReservation} />
      <ChangeTableModal
        isOpen={showTableSelection}
        onClose={() => setShowTableSelection(false)}
        onTableChange={handleTableSelected}
        currentTable={undefined}
      />

      <FlyingEmoji isVisible={isFlyingEmojiVisible} startPosition={flyingEmojiPosition} onComplete={hideFlyingEmoji} />
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

      <Footer />
      <ScrollToTop />
      <LiwaMenuFooter />
    </div>
  );
}
