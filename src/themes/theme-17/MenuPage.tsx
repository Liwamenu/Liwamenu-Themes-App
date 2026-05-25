import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Search,
  ShoppingBag,
  ChevronDown,
  Clock,
  Wifi,
  MapPin,
  MessageSquare,
  Instagram,
  Facebook,
  ArrowLeft,
  X,
} from "lucide-react";
import { ProductCard } from "./ProductCard";
import { ProductDetailModal } from "./ProductDetailModal";
import { CartDrawer } from "./CartDrawer";
import { CheckoutModal } from "./CheckoutModal";
import { OrderReceipt } from "./OrderReceipt";
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
import { SubcategoryButtons, useSubcategoryFilter } from "@/components/menu/SubcategoryButtons";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useOrder } from "@/hooks/useOrder";
import { useFlyingEmoji } from "@/hooks/useFlyingEmoji";
import { useCart } from "@/hooks/useCart";
import { Product, Order, ExternalPage } from "@/types/restaurant";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { SurveyModal } from "./SurveyModal";
import { cn } from "@/lib/utils";

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
    formatPriceWithSign,
    setTableNumber,
    getCurrentWorkingHour,
  } = useRestaurant();
  const { orders } = useOrder();
  const { items: cartItems } = useCart();
  const { isVisible: isFlyingEmojiVisible, startPosition: flyingEmojiPosition, hideFlyingEmoji } = useFlyingEmoji();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const subFilter = useSubcategoryFilter();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
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
    showAnnouncement ||
    isSurveyOpen;
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

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
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
      <div className="theme-17">
        <OrderReceipt
          orderId={viewingOrder.id}
          onBack={handleBackToMenu}
          waiterCooldown={waiterCooldown}
          onWaiterSuccess={handleWaiterSuccess}
        />
      </div>
    );
  }

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const heroImage = restaurant.heroImageUrl || restaurant.imageAbsoluteUrl || "";
  const logoImage = restaurant.logoImageUrl || restaurant.imageAbsoluteUrl || "";
  const workingHour = getCurrentWorkingHour;

  const activeCategory = selectedCategoryId
    ? selectedCategoryId === CAMPAIGN_CATEGORY_ID
      ? { id: CAMPAIGN_CATEGORY_ID, name: t("menu.campaignProducts"), products: campaignProducts, image: "" }
      : categories.find((c) => c.id === selectedCategoryId)
    : null;

  return (
    <div className="theme-17 min-h-screen bg-background">
      {/* HERO with bg image */}
      <div className="relative">
        <img
          src={heroImage}
          alt={restaurant.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative px-5 pt-6 pb-10">
          {/* Top pill row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2 items-center">
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
            <div className="flex gap-2 items-center">
              {restaurant.showWaiterCallButton !== false && (
                <button
                onClick={handleOpenCallWaiterFloating}
                disabled={waiterCooldown > 0}
                className="cafe-pill"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{waiterCooldown > 0 ? `${waiterCooldown}s` : t("waiter.button")}</span>
              </button>
              )}
              <button
                onClick={() => setIsSearchOpen((v) => !v)}
                className="cafe-pill cafe-pill-icon"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                onClick={handleOpenCart}
                className="cafe-pill cafe-pill-icon relative"
                aria-label="Cart"
              >
                <ShoppingBag className="w-4 h-4" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[hsl(var(--gold))] text-black text-[10px] font-bold flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Brand row */}
          <div className="mt-7 flex items-center gap-4">
            {logoImage && (
              <img
                src={logoImage}
                alt={restaurant.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-white text-3xl font-bold tracking-tight truncate">
                {restaurant.name}
              </h1>
              {restaurant.slogan1 && (
                <p className="text-white/85 italic text-sm mt-1 line-clamp-1">{restaurant.slogan1}</p>
              )}
            </div>
          </div>

          {/* Info pills */}
          <div className="mt-6 flex gap-2 flex-wrap">
            {workingHour && (
              <span className="cafe-pill" style={{ background: "hsla(0,0%,100%,0.15)" }}>
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                {workingHour.open} - {workingHour.close}
              </span>
            )}
            {restaurant.wifiPassword && (
              <span className="cafe-pill">
                <Wifi className="w-3.5 h-3.5" /> Wifi
              </span>
            )}
            {(restaurant.latitude && restaurant.longitude) && (
              <a
                href={`https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cafe-pill"
              >
                <MapPin className="w-3.5 h-3.5" /> Konum
              </a>
            )}
          </div>

          {/* Socials + reservation/survey */}
          <div className="mt-5 flex items-center gap-2 flex-wrap">
            {restaurant.instagram && (
              <a
                href={restaurant.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-400 flex items-center justify-center text-white"
              >
                <Instagram className="w-5 h-5" />
              </a>
            )}
            {restaurant.facebook && (
              <a
                href={restaurant.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white"
              >
                <Facebook className="w-5 h-5 fill-white" />
              </a>
            )}
            {restaurant.phoneNumber && (
              <a
                href={`tel:${restaurant.phoneNumber}`}
                className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white text-base"
              >
                ✆
              </a>
            )}
            {restaurant.reservationSettings?.isActive && (
              <button onClick={() => setShowReservation(true)} className="cafe-pill">
                {t("reservation.button")}
              </button>
            )}
            <button onClick={() => setIsSurveyOpen(true)} className="cafe-pill">
              <MessageSquare className="w-3.5 h-3.5" /> {t("survey.button")}
            </button>
          </div>
        </div>
      </div>

      {/* Search bar (collapsible) */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-card border-b border-border"
          >
            <div className="px-5 py-4 relative">
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                type="text"
                placeholder={t("menu.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-11 pr-11 rounded-full border-border bg-secondary text-sm focus:border-primary"
              />
              {(searchQuery || isSearchOpen) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-7 top-1/2 -translate-y-1/2 hover:text-primary transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MENU SECTION (white rounded-top surface, lifts above hero) */}
      <div className="bg-card rounded-t-[32px] -mt-6 relative px-5 pt-7 pb-24 min-h-[60vh]">
        {searchQuery ? (
          /* SEARCH RESULTS */
          <div>
            <h2 className="font-display text-2xl font-bold mb-4 text-foreground">
              {t("menu.searchResults", "Arama Sonuçları")}
              <span className="text-sm font-normal text-muted-foreground ml-2">({filteredProducts.length})</span>
            </h2>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🔍</div>
                <p className="text-muted-foreground">{t("menu.noResults", { query: searchQuery })}</p>
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
          /* CATEGORY GRID */
          <>
            {/* Chef Recommended — horizontal carousel.
             *  Gated by !searchQuery + !activeCategory so it only shows on
             *  the landing view. Square photos with a gold-accent name +
             *  price plate underneath, matching the cafe's Playfair/gold
             *  vocabulary. */}
            {recommendedProducts.length > 0 && (
              <section className="mb-7">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    <span className="mr-1">✨</span>
                    {t("menu.recommended")}
                  </h2>
                  <span className="gold-divider" />
                </div>
                <div className="flex gap-3 overflow-x-auto hide-scrollbar scroll-fade-x pb-2 -mx-5 px-5">
                  {/* Reuse the theme's real ProductCard so the recommended
                   *  carousel items match the cards in the main grid — the
                   *  previous custom mini-card markup made them look like
                   *  category tiles instead of products. Wrapping in
                   *  shrink-0 w-44 gives each card a fixed horizontal slot
                   *  inside the flex carousel. */}
                  {recommendedProducts.slice(0, 8).map((product) => (
                    <div key={product.id} className="shrink-0 w-44">
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

            <h2 className="text-muted-foreground tracking-[0.25em] text-xs font-semibold mb-4">
              MENÜLER
            </h2>
            <div className="grid grid-cols-2 gap-3.5">
              {campaignProducts.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedCategoryId(CAMPAIGN_CATEGORY_ID);
                    // Land at the top of the product list rather than
                    // wherever the category tile happened to sit.
                    window.scrollTo({ top: 0, behavior: "auto" });
                  }}
                  className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md group"
                >
                  <img
                    src={getProductImageSrc(campaignProducts[0]?.imageURL)}
                    alt={t("menu.campaignProducts")}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={handleProductImageError}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[hsl(var(--campaign))] text-white text-[10px] font-bold">
                    🔥
                  </span>
                  <span className="absolute inset-x-0 bottom-3 text-center text-white font-display font-bold text-lg drop-shadow-lg">
                    {t("menu.campaignProducts")}
                  </span>
                </button>
              )}

              {categories.map((category) => {
                const img = (category as unknown as { image?: string }).image || getProductImageSrc(category.products[0]?.imageURL);
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategoryId(category.id);
                      window.scrollTo({ top: 0, behavior: "auto" });
                    }}
                    className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md group"
                  >
                    <img
                      src={img}
                      alt={category.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={handleProductImageError}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute inset-x-0 bottom-3 text-center text-white font-display font-bold text-lg drop-shadow-lg px-2 leading-tight">
                      {category.name}
                    </span>
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
                      className="w-full px-4 py-3 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-center hover:bg-accent transition-colors"
                    >
                      {page.buttonName}
                    </button>
                  ))}
              </div>
            )}
          </>
        ) : (
          /* PRODUCT LIST FOR SELECTED CATEGORY.
           *  The inline "← MENÜLER" back button that used to live above
           *  the title was removed in favor of the floating bottom pill
           *  rendered after the grid — users no longer have to scroll
           *  back to the top of a long category just to leave it. */
          <div>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="font-display text-3xl font-bold text-foreground">
                {activeCategory.name}
              </h2>
              <span className="gold-divider" />
              <span className="text-xs text-muted-foreground">{activeCategory.products.length} ürün</span>
            </div>
            {selectedCategoryId !== CAMPAIGN_CATEGORY_ID && (
              <SubcategoryButtons
                categoryId={activeCategory.id}
                products={activeCategory.products}
                activeSub={subFilter.getActive(activeCategory.id)}
                onToggle={(subId) => subFilter.toggle(activeCategory.id, subId)}
              />
            )}
            <div className="grid grid-cols-2 gap-3">
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

            {/* Floating back-to-categories pill — z-30 keeps it under
             *  modals (z-50) but above page content + LiwaMenuFooter.
             *  Centered bottom so it's discoverable from any scroll
             *  position within a long category. */}
            <button
              type="button"
              onClick={() => { setSelectedCategoryId(null); window.scrollTo({ top: 0, behavior: "auto" }); }}
              aria-label={t("menu.backToCategories", "Kategorilere Dön")}
              className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 h-11 px-5 rounded-full bg-primary hover:opacity-90 text-primary-foreground text-sm font-semibold shadow-lg flex items-center gap-2 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("menu.backToCategories", "Kategorilere Dön")}</span>
            </button>
          </div>
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
      <SurveyModal isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />
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
