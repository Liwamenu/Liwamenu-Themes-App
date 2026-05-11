import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Bell, Star, ChevronDown } from "lucide-react";
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
import { groupBySubcategory } from "@/lib/groupBySubcategory";
import { SubcategoryButtons, useSubcategoryFilter } from "@/components/menu/SubcategoryButtons";

type View = "menu" | "order";

const EXTERNAL_PAGE_ID = "__external__";

function throttle<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let lastCall = 0;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}

export function MenuPage() {
  const { t } = useTranslation();
  const {
    categories,
    recommendedProducts,
    campaignProducts,
    isRestaurantActive,
    isCurrentlyOpen,
    restaurant,
    formatPrice,
    setTableNumber,
  } = useRestaurant();
  const { currentOrder, orders, setCurrentOrder } = useOrder();
  const { isVisible: isFlyingEmojiVisible, startPosition: flyingEmojiPosition, hideFlyingEmoji } = useFlyingEmoji();
  /* Accordion expand state — `null` means every category is collapsed
   *  (the menu opens that way by user request). Opening one category
   *  closes any other; clicking the open category collapses it again.
   *  When this changes from null → id we want every product in the
   *  newly-opened category to start the pen-writing animation in
   *  unison — that's wired through ProductCard's `writeImmediately`
   *  prop further down. */
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const toggleCategoryExpand = useCallback((id: string) => {
    setExpandedCategoryId((prev) => (prev === id ? null : id));
  }, []);
  const subFilter = useSubcategoryFilter();
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

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  /* Mirror the `theme-26` class onto <html> so portal-rendered Radix
   *  modals (Survey, Reservation, Dialog, Drawer, etc.) get picked up
   *  by our scoped CSS too. Without this, theme-26 overrides only
   *  apply inside the wrapper div and miss anything React.createPortal'd
   *  to document.body. */
  useEffect(() => {
    document.documentElement.classList.add("theme-26");
    return () => document.documentElement.classList.remove("theme-26");
  }, []);

  useEffect(() => {
    const announcementSettings = restaurant.announcementSettings;
    if (!announcementSettings?.enabled) return;
    const timer = setTimeout(() => {
      setShowAnnouncement(true);
    }, announcementSettings.delayMs * 1000);
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

  /* The scroll-spy that used to live here updated `activeCategory`
   *  whenever the user scrolled past a category section. With the
   *  accordion model only one section is on screen at a time and the
   *  active tab is now driven by expand-state, so the scroll handler
   *  would either be a no-op or fight the accordion logic. Removed. */

  const CAMPAIGN_CATEGORY_ID = "__campaign__";

  const scrollToCategory = useCallback(
    (categoryId: string) => {
      if (categoryId === EXTERNAL_PAGE_ID) {
        // Old single-page trigger — fall back to the first published
        // external page so legacy callers (if any) still work.
        const first = restaurant.externalPages?.[0];
        if (first) setSelectedExternalPage(first);
        return;
      }
      if (categoryId === CAMPAIGN_CATEGORY_ID) {
        setExpandedCategoryId(CAMPAIGN_CATEGORY_ID);
        // Scroll to the section after the expand has had a frame to
        // render — otherwise we scroll to its collapsed (short) Y.
        requestAnimationFrame(() => {
          const element = categoryRefs.current[CAMPAIGN_CATEGORY_ID];
          if (element) {
            window.scrollTo({ top: element.offsetTop - 100, behavior: "smooth" });
          }
        });
        return;
      }
      setExpandedCategoryId(categoryId);
      requestAnimationFrame(() => {
        const element = categoryRefs.current[categoryId];
        if (element) {
          window.scrollTo({ top: element.offsetTop - 100, behavior: "smooth" });
        }
      });
    },
    [CAMPAIGN_CATEGORY_ID, restaurant.externalPages],
  );

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const lowerQuery = String(searchQuery ?? "").toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        products: cat.products.filter(
          (p) =>
            String(p.name ?? "")
              .toLowerCase()
              .includes(lowerQuery) ||
            String(p.description ?? "")
              .toLowerCase()
              .includes(lowerQuery),
        ),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [categories, searchQuery]);

  const canOrder = isRestaurantActive && isCurrentlyOpen;

  const handleOrderComplete = useCallback((order: Order, orderType: "inPerson" | "online") => {
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

  const handleOpenCallWaiter = useCallback(() => {
    if (!isCurrentlyOpen) {
      toast.error(t("common.closedHours"));
      return;
    }
    setIsCartOpen(false);
    setShowCallWaiter(true);
  }, [isCurrentlyOpen, t]);

  const handleCloseCallWaiter = useCallback(() => setShowCallWaiter(false), []);

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
      <div className="theme-26">
        <OrderReceipt
          orderId={viewingOrder.id}
          onBack={handleBackToMenu}
          waiterCooldown={waiterCooldown}
          onWaiterSuccess={handleWaiterSuccess}
        />
      </div>
    );
  }

  return (
    <div className="theme-26 min-h-screen bg-background">
      <RestaurantHeader orders={orders} onViewOrder={handleViewOrder} />

      {/* Search Bar — sticky search row with the Call Waiter button on the
          left (sushi-house green) and the brush-stroke category nav below. */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container px-4 py-3">
          <div className="flex gap-2 items-center">
            <button
              onClick={handleOpenCallWaiterFloating}
              disabled={waiterCooldown > 0}
              aria-label={t("waiter.title")}
              className={`shrink-0 h-11 px-3 rounded-full flex items-center gap-1.5 text-sm font-bold transition-all ${
                waiterCooldown > 0
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-success text-black shadow-md hover:bg-success/90"
              }`}
            >
              <Bell className="w-4 h-4 shrink-0" />
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
                className="h-11 pl-11 pr-11 rounded-full border-2 border-[hsl(var(--brand-green))]/15 bg-secondary text-sm focus:border-[hsl(var(--brand-green))] transition-all"
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
        {/* CategoryTabs were removed in favor of the accordion-style
         *  category headers below — the user navigates by tapping a
         *  category row open/closed, so a separate horizontal-scroll
         *  tab strip duplicated the same action. */}
      </div>

      {/* Recommended Products — circular photo carousel */}
      {!searchQuery && recommendedProducts.length > 0 && (
        <section className="container px-4 pt-5 pb-2">
          <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-[hsl(var(--brand-green))] fill-[hsl(var(--brand-green))]" />
            {t("menu.recommended")}
          </h2>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {recommendedProducts.slice(0, 8).map((product) => (
              <motion.div
                key={product.id}
                whileTap={{ scale: 0.97 }}
                whileHover={{ y: -3 }}
                onClick={() => handleSelectProduct(product)}
                className="flex-shrink-0 w-32 cursor-pointer"
              >
                <div className="relative aspect-square rounded-full overflow-hidden bg-[hsl(var(--brand-green-soft))] shadow-md ring-2 ring-[hsl(var(--brand-green))]/20">
                  <img
                    src={getProductImageSrc(product.imageURL)}
                    onError={handleProductImageError}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <p className="text-sm font-semibold text-foreground mt-2 line-clamp-2 leading-tight text-center">
                  {product.name}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Menu Categories — accordion. Each category header is a button
       *  that toggles expand; only one section is open at a time. When
       *  a search query is set we bypass the accordion entirely and
       *  expand every matching category so results stay visible.
       *
       *  When a section opens we pass `writeImmediately={true}` to
       *  every ProductCard inside it — that bypasses the per-card
       *  IntersectionObserver and fires the pen-writing animation for
       *  all products in unison, exactly when the user opens the row.
       */}
      <div className="container px-4 py-6 pb-24">
        {!searchQuery && campaignProducts.length > 0 && (
          <section
            ref={(el) => (categoryRefs.current[CAMPAIGN_CATEGORY_ID] = el)}
            className="mb-3"
          >
            <button
              type="button"
              onClick={() => toggleCategoryExpand(CAMPAIGN_CATEGORY_ID)}
              className="cat-banner w-full text-left cursor-pointer"
              aria-expanded={expandedCategoryId === CAMPAIGN_CATEGORY_ID}
            >
              <div className="cat-banner-inner flex items-center justify-between">
                <div className="menu-section-title m-0">
                  <h2>{t("menu.campaignProducts")}</h2>
                </div>
                <ChevronDown
                  className="w-5 h-5 transition-transform duration-300"
                  style={{
                    transform:
                      expandedCategoryId === CAMPAIGN_CATEGORY_ID ? "rotate(180deg)" : "none",
                    color: "hsl(var(--walnut-mid))",
                  }}
                  aria-hidden="true"
                />
              </div>
            </button>
            <AnimatePresence initial={false}>
              {expandedCategoryId === CAMPAIGN_CATEGORY_ID && (
                <motion.div
                  key="campaign-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="grid grid-cols-1 gap-1 mt-2">
                    {campaignProducts.map((product) => (
                      <ProductCard
                        key={`campaign-${product.id}`}
                        product={product}
                        onSelect={handleSelectProduct}
                        isSpecialPriceActive={restaurant.isSpecialPriceActive}
                        specialPriceName={restaurant.specialPriceName}
                        formatPrice={formatPrice}
                        writeImmediately
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {filteredCategories.map((category) => {
          const isExpanded = !!searchQuery || expandedCategoryId === category.id;
          return (
            <section
              key={category.id}
              ref={(el) => (categoryRefs.current[category.id] = el)}
              className="mb-3"
            >
              <button
                type="button"
                onClick={() => toggleCategoryExpand(category.id)}
                className="cat-banner w-full text-left cursor-pointer"
                aria-expanded={isExpanded}
              >
                <div className="cat-banner-inner flex items-center justify-between">
                  <div className="menu-section-title m-0">
                    <h2>{category.name}</h2>
                  </div>
                  <ChevronDown
                    className="w-5 h-5 transition-transform duration-300"
                    style={{
                      transform: isExpanded ? "rotate(180deg)" : "none",
                      color: "hsl(var(--walnut-mid))",
                    }}
                    aria-hidden="true"
                  />
                </div>
              </button>
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key={`${category.id}-body`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <SubcategoryButtons
                      categoryId={category.id}
                      products={category.products}
                      activeSub={subFilter.getActive(category.id)}
                      onToggle={(subId) => subFilter.toggle(category.id, subId)}
                      hideImages
                    />
                    <div className="grid grid-cols-1 gap-1">
                      {subFilter.filter(category.id, category.products).map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onSelect={handleSelectProduct}
                          isSpecialPriceActive={restaurant.isSpecialPriceActive}
                          specialPriceName={restaurant.specialPriceName}
                          formatPrice={formatPrice}
                          writeImmediately
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          );
        })}

        {filteredCategories.length === 0 && searchQuery && (
          <div className="text-center py-12 rounded-2xl bg-secondary/30">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-lg text-muted-foreground">{t("menu.noResults", { query: searchQuery })}</p>
          </div>
        )}

        {/* External Page Buttons — one per admin-published page,
            rendered in sortOrder ascending. */}
        {!searchQuery && restaurant.externalPages && restaurant.externalPages.length > 0 && (
          <section className="mb-8 space-y-2">
            {[...restaurant.externalPages]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((page) => (
                <button
                  key={page.id}
                  onClick={() => setSelectedExternalPage(page)}
                  className="w-full text-center"
                >
                  <h2 className="text-lg font-bold text-[hsl(var(--brand-green))] hover:text-[hsl(var(--brand-green-bright))] transition-colors">
                    {page.buttonName}
                  </h2>
                </button>
              ))}
          </section>
        )}
      </div>

      <Footer />

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

      <ScrollToTop />
      <LiwaMenuFooter />
    </div>
  );
}
