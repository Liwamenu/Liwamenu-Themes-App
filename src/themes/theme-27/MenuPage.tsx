import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Bell, Star, ArrowLeft } from "lucide-react";
import { RestaurantHeader } from "./RestaurantHeader";
import { ProductCard } from "./ProductCard";
import { getProductImageSrc, handleProductImageError } from "@/lib/productImage";
import { ProductDetailModal } from "./ProductDetailModal";
import { CartDrawer, CartButton } from "./CartDrawer";
import { CheckoutModal } from "./CheckoutModal";
import { OrderReceipt } from "./OrderReceipt";
import { Footer } from "./Footer";
import { SoundPermissionModal } from "./SoundPermissionModal";
import { CallWaiterModal } from "./CallWaiterModal";
import { ScrollToTop } from "@/components/menu/ScrollToTop";
import { LiwaMenuFooter } from "@/components/menu/LiwaMenuFooter";
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
  const { orders } = useOrder();
  const { isVisible: isFlyingEmojiVisible, startPosition: flyingEmojiPosition, hideFlyingEmoji } = useFlyingEmoji();
  // Category-First navigation: when null, we render the colored
  // category-card grid (home screen). When set, we render only that
  // category's products with a back arrow header.
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
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

  const CAMPAIGN_CATEGORY_ID = "__campaign__";

  // Drill into a specific category and jump back to the top of the
  // viewport. This replaces the old scroll-spy behavior — the screen
  // now toggles between "all categories" and "one category's products"
  // instead of scrolling through every section.
  const openCategory = useCallback((categoryId: string) => {
    setSelectedCategoryId(categoryId);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const closeCategory = useCallback(() => {
    setSelectedCategoryId(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  /* ------------------------------------------------------------------
   *  Image preload: hold the fold-in animation back until every
   *  category photo has finished decoding. Without this the cards
   *  would fold open onto empty placeholder boxes and pop in their
   *  images afterwards, which kills the polished feel.
   *
   *  We track this with a ref guard so the loader only shows on the
   *  very first arrival on the home view — when the user navigates
   *  back from a category detail the images are already in the HTTP
   *  cache and we want the fold animation to re-play immediately,
   *  not flash the "Menü Hazırlanıyor..." text again.
   * ------------------------------------------------------------------ */
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const preloadStartedRef = useRef(false);

  /* ------------------------------------------------------------------
   *  Scroll-triggered fold animation
   *
   *  Cards stay paused (CSS: `animation-play-state: paused`) until
   *  they intersect the viewport. The very first batch of observed
   *  cards — those already on screen when the user lands — gets a
   *  staggered delay so they feel like a deal of cards. Anything
   *  scrolled into view later animates with 0 delay so it doesn't
   *  sit idle waiting.
   *
   *  We re-run this every time the home view becomes visible (when
   *  `imagesLoaded` flips, or after returning from a category
   *  detail) by keying off `selectedCategoryId`. The observer is
   *  reattached and the stagger counter resets to 0.
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!imagesLoaded) return;
    // Only attach the observer while the home view is rendered.
    if (selectedCategoryId !== null) return;

    let isFirstBatch = true;
    let frameQueued = false;

    const observer = new IntersectionObserver(
      (entries) => {
        // Collect visible entries from this callback so we can stagger
        // them as a group. Subsequent callbacks (scroll-triggered) use
        // 0 delay so cards don't sit idle as they slide into view.
        const visibleNow = entries.filter((e) => e.isIntersecting);
        let i = 0;
        visibleNow.forEach((entry) => {
          const target = entry.target as HTMLElement;
          const delaySec = isFirstBatch ? i * 0.18 : 0;
          target.style.setProperty("--cat-delay", `${delaySec}s`);
          // Force a reflow before adding the class so the browser
          // commits the new delay before the animation starts. Without
          // this, some engines batch the style change with the class
          // add and the delay gets observed as 0.
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          target.offsetWidth;
          target.classList.add("is-visible");
          observer.unobserve(target);
          i += 1;
        });
        if (visibleNow.length > 0 && isFirstBatch) {
          // Mark first batch consumed on the next frame — any entries
          // that intersect in subsequent callbacks are "scrolled-in".
          if (!frameQueued) {
            frameQueued = true;
            requestAnimationFrame(() => {
              isFirstBatch = false;
              frameQueued = false;
            });
          }
        }
      },
      {
        threshold: 0.12,
        // Trigger slightly before the card fully enters viewport so
        // the fold finishes by the time it's centered.
        rootMargin: "0px 0px -8% 0px",
      },
    );

    const cards = document.querySelectorAll<HTMLElement>(".theme-27 .cat-card");
    cards.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [imagesLoaded, selectedCategoryId, categories]);

  useEffect(() => {
    if (preloadStartedRef.current) return;
    // Wait until restaurant data has actually populated categories —
    // we kick off this effect on EVERY categories change but only
    // start preloading once a non-empty list is available.
    if (categories.length === 0) return;
    preloadStartedRef.current = true;

    const imageUrls = categories
      .map((c) => c.image)
      .filter((url): url is string => typeof url === "string" && url.length > 0);

    if (imageUrls.length === 0) {
      setImagesLoaded(true);
      return;
    }

    let loadedCount = 0;
    let cancelled = false;
    const onSettled = () => {
      if (cancelled) return;
      loadedCount += 1;
      if (loadedCount >= imageUrls.length) setImagesLoaded(true);
    };

    imageUrls.forEach((url) => {
      const img = new Image();
      img.src = url;
      img.onload = onSettled;
      img.onerror = onSettled; // fail-open so a broken URL doesn't hang the loader
    });

    return () => {
      cancelled = true;
    };
  }, [categories]);

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
      <div className="theme-27">
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
    <div className="theme-27 min-h-screen bg-background">
      <RestaurantHeader orders={orders} onViewOrder={handleViewOrder} />

      {/* Search Bar — sticky search row with the Call Waiter button on the
          left (sushi-house green) and the brush-stroke category nav below. */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container px-4 py-3">
          <div className="flex gap-2 items-center">
            {restaurant.showWaiterCallButton !== false && (
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
            )}

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
      </div>

      {/* Recommended Products — horizontal carousel of circular photos.
          Only on the home view (no search, no selected category) and
          only once the image preload is done so the fold animation
          isn't competing with carousel image loads. */}
      {!searchQuery && !selectedCategoryId && imagesLoaded && recommendedProducts.length > 0 && (
        <section className="recommended-section">
          <div className="container px-4">
            <h2 className="recommended-title">
              <Star className="w-4 h-4" />
              {t("menu.recommended")}
            </h2>
            <div className="recommended-list">
              {recommendedProducts.slice(0, 8).map((product) => (
                <motion.div
                  key={product.id}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ y: -3 }}
                  onClick={() => handleSelectProduct(product)}
                  className="recommended-item"
                >
                  <div className="recommended-img">
                    <img
                      src={getProductImageSrc(product.imageURL)}
                      onError={handleProductImageError}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p className="recommended-name">{product.name}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Body — three mutually exclusive states:
            1. searchQuery  → flat list of matching products
            2. selectedCategoryId !== null → that category's product rows
            3. otherwise → the colored category-card grid (home) */}
      <div className="container px-4 py-5 pb-24">
        {/* (1) SEARCH RESULTS */}
        {searchQuery && (
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {filteredCategories.flatMap((cat) =>
                cat.products.map((product) => (
                  <ProductCard
                    key={`search-${cat.id}-${product.id}`}
                    product={product}
                    onSelect={handleSelectProduct}
                    isSpecialPriceActive={restaurant.isSpecialPriceActive}
                    specialPriceName={restaurant.specialPriceName}
                    formatPrice={formatPrice}
                  />
                )),
              )}
            </AnimatePresence>
            {filteredCategories.length === 0 && (
              <div className="text-center py-12 rounded-2xl bg-secondary/30">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-lg text-muted-foreground">{t("menu.noResults", { query: searchQuery })}</p>
              </div>
            )}
          </div>
        )}

        {/* (2) CATEGORY DETAIL */}
        {!searchQuery && selectedCategoryId && (() => {
          const isCampaignView = selectedCategoryId === CAMPAIGN_CATEGORY_ID;
          const category = isCampaignView ? null : categories.find((c) => c.id === selectedCategoryId);
          const products = isCampaignView ? campaignProducts : category?.products || [];
          const headerName = isCampaignView ? t("menu.campaignProducts") : category?.name || "";
          const visibleProducts = isCampaignView
            ? products
            : subFilter.filter(category!.id, products);

          return (
            <section>
              <div className="cat-detail-header">
                <button
                  type="button"
                  onClick={closeCategory}
                  aria-label={t("common.back", { defaultValue: "Back" })}
                  className="cat-detail-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2>{headerName}</h2>
              </div>

              {!isCampaignView && category && (
                <SubcategoryButtons
                  categoryId={category.id}
                  products={category.products}
                  activeSub={subFilter.getActive(category.id)}
                  onToggle={(subId) => subFilter.toggle(category.id, subId)}
                  hideImages
                />
              )}

              <div className="flex flex-col gap-3">
                <AnimatePresence mode="popLayout">
                  {visibleProducts.map((product) => (
                    <ProductCard
                      key={`${isCampaignView ? "campaign-" : ""}${product.id}`}
                      product={product}
                      onSelect={handleSelectProduct}
                      isSpecialPriceActive={restaurant.isSpecialPriceActive}
                      specialPriceName={restaurant.specialPriceName}
                      formatPrice={formatPrice}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Bottom "back to categories" button — mirrors the
                  top-left arrow so users don't have to scroll back up
                  after browsing a long category. */}
              {visibleProducts.length > 0 && (
                <button
                  type="button"
                  onClick={closeCategory}
                  className="cat-detail-back-bottom"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t("menu.backToCategories")}</span>
                </button>
              )}
            </section>
          );
        })()}

        {/* (3) HOME — Category-First grid */}
        {!searchQuery && !selectedCategoryId && (
          <section className="cat-grid">
            {!imagesLoaded ? (
              /* Preload gate — replaces the cards until every category
                 image has finished decoding. Prevents the fold-in
                 animation from running on empty boxes. */
              <div className="cat-preload">
                <p>{t("menu.preparing", { defaultValue: "Menü Hazırlanıyor..." })}</p>
              </div>
            ) : (
              <>
                {campaignProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => openCategory(CAMPAIGN_CATEGORY_ID)}
                    className="cat-card cat-card--campaign cat-card--right"
                  >
                    <div className="cat-card-text">
                      <h2>{t("menu.campaignProducts")}</h2>
                    </div>
                    <div className="cat-card-img cat-card-img--placeholder">
                      <Star className="w-9 h-9" style={{ color: "hsl(28 35% 22%)", fill: "hsl(28 35% 22%)", opacity: 0.55 }} />
                    </div>
                  </button>
                )}

                {categories.map((category, idx) => {
                  // 7-tone muted-pastel cycle. Hex values live in theme.css
                  // under `.cat-card--<tone>`. Order matters — the user
                  // specified this exact sequence.
                  const palette = [
                    "rose",        // Koyu Gül Kurusu     #C58C91
                    "sage",        // Koyu Adaçayı Yeşili #8AA38B
                    "mustard",     // Koyu Hardal         #CAA161
                    "steel",       // Koyu Çelik Mavisi   #7995AA
                    "plum",        // Koyu Mürdüm         #A58099
                    "terracotta",  // Koyu Şeftali        #C28A74
                    "teal",        // Koyu Su Yeşili      #75A6A1
                  ] as const;
                  const tone = palette[idx % palette.length];
                  // Image side alternates every row.
                  const imgOnRight = idx % 2 === 0;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => openCategory(category.id)}
                      className={`cat-card cat-card--${tone} ${imgOnRight ? "cat-card--right" : "cat-card--left"}`}
                    >
                      <div className="cat-card-text">
                        <h2>{category.name}</h2>
                      </div>
                      <div
                        className={`cat-card-img ${category.image ? "" : "cat-card-img--placeholder"}`}
                        style={category.image ? { backgroundImage: `url(${category.image})` } : undefined}
                      />
                    </button>
                  );
                })}
              </>
            )}
          </section>
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
