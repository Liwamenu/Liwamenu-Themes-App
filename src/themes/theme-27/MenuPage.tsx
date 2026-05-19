/**
 * Theme 27 — Kiosk Order (Dark Glass + Light) — Menu Page
 *
 * Full-screen kiosk ordering interface:
 *   - Centred logo + welcome header + flag language bar
 *   - Sticky bar: category pill tabs (no search)
 *   - Categories as centred headings with coloured backgrounds
 *   - Horizontally-scrolling product rows per category
 *   - 3D price buttons on product cards
 *   - Floating cart FAB (bottom-right)
 */

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ShoppingCart, Star, RotateCcw, ShoppingBag, Package, UtensilsCrossed } from "lucide-react";
import { RestaurantHeader } from "./RestaurantHeader";
import { ProductCard } from "./ProductCard";
import { ProductDetailModal } from "./ProductDetailModal";
import { CartDrawer } from "./CartDrawer";
import { CheckoutModal } from "./CheckoutModal";
import { OrderReceipt } from "./OrderReceipt";
import { SoundPermissionModal } from "./SoundPermissionModal";
import { CallWaiterModal } from "./CallWaiterModal";
import { ScrollToTop } from "@/components/menu/ScrollToTop";
import { LiwaMenuFooter } from "@/components/menu/LiwaMenuFooter";
import { ChangeTableModal } from "./ChangeTableModal";
import { AnnouncementModal } from "./AnnouncementModal";
import { FlyingEmoji } from "./FlyingEmoji";
import { IdleCountdownModal } from "./IdleCountdownModal";
import { OrderTypeModal, KioskOrderType } from "./OrderTypeModal";
import { ExternalPageView } from "@/components/menu/ExternalPageView";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useRestaurant } from "@/hooks/useRestaurant";
import { changeLanguage } from "@/lib/i18n";
import { useOrder } from "@/hooks/useOrder";
import { useCart } from "@/hooks/useCart";
import { useFlyingEmoji } from "@/hooks/useFlyingEmoji";
import { useKioskIdle } from "./useKioskIdle";
import { Product, Order, ExternalPage } from "@/types/restaurant";

type View = "menu" | "order";

const CAMPAIGN_CATEGORY_ID = "__campaign__";

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
    formatPriceWithSign,
    setTableNumber,
  } = useRestaurant();
  const { currentOrder, orders, setCurrentOrder } = useOrder();
  const { getItemCount, clearCart } = useCart();
  const { isVisible: isFlyingEmojiVisible, startPosition: flyingEmojiPosition, hideFlyingEmoji } = useFlyingEmoji();
  const { idleState, countdown, wake } = useKioskIdle();

  const [showSplash, setShowSplash] = useState(true);
  const [showOrderType, setShowOrderType] = useState(false);
  const [kioskOrderType, setKioskOrderType] = useState<KioskOrderType | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>("menu");
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [showSoundPermission, setShowSoundPermission] = useState(false);
  const [showCallWaiter, setShowCallWaiter] = useState(false);
  const [showTableSelection, setShowTableSelection] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [selectedExternalPage, setSelectedExternalPage] = useState<ExternalPage | null>(null);

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
    showTableSelection ||
    showSoundPermission ||
    showAnnouncement;
  useBodyScrollLock(currentView === "menu" && isAnyOverlayOpen);

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  // Announcement timer
  useEffect(() => {
    const settings = restaurant.announcementSettings;
    if (!settings?.enabled) return;
    const timer = setTimeout(() => setShowAnnouncement(true), settings.delayMs * 1000);
    return () => clearTimeout(timer);
  }, [restaurant.announcementSettings]);

  // Waiter cooldown
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

  /* ---- Idle screensaver: cleanup when screensaver activates ---- */
  useEffect(() => {
    if (idleState === "screensaver") {
      // Clear cart
      clearCart();
      // Close every open modal / overlay
      setSelectedProduct(null);
      setIsCartOpen(false);
      setIsCheckoutOpen(false);
      setShowCallWaiter(false);
      setShowTableSelection(false);
      setShowSoundPermission(false);
      setShowAnnouncement(false);
      setSelectedExternalPage(null);
      // Reset order type (user picks again after wake)
      setShowOrderType(false);
      setKioskOrderType(null);
      // Reset language to restaurant default
      const defaultLang = restaurant.menuLang?.toLowerCase() || "tr";
      changeLanguage(defaultLang);
    }
  }, [idleState, clearCart]);

  /* ---- Idle screensaver: auto-scroll animation ---- */
  useEffect(() => {
    if (idleState !== "screensaver") return;

    let animId: number;
    let verticalDir = 1;
    const vSpeed = 1; // px per frame (~60 px/s @ 60fps)
    const hSpeed = 1; // px per frame — must be >= 1 so scrollLeft rounds correctly

    // Per-row horizontal direction map (bounce left ↔ right)
    const hDirs = new Map<HTMLElement, number>();

    // Disable scroll-snap on every product row so programmatic
    // scrollLeft changes aren't yanked back to snap points.
    const rows = document.querySelectorAll<HTMLElement>(".kiosk-scroll-row");
    rows.forEach((row) => {
      row.style.scrollSnapType = "none";
      row.style.scrollBehavior = "auto";
    });

    // Start from the top
    window.scrollTo(0, 0);

    const tick = () => {
      // Vertical bounce
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY >= maxY - 1) verticalDir = -1;
      if (window.scrollY <= 1) verticalDir = 1;
      window.scrollBy(0, vSpeed * verticalDir);

      // Horizontal auto-scroll — each row bounces independently
      rows.forEach((row) => {
        let dir = hDirs.get(row) ?? 1;
        const maxScroll = row.scrollWidth - row.clientWidth;
        if (maxScroll <= 0) return; // nothing to scroll

        if (row.scrollLeft >= maxScroll - 1) dir = -1;
        if (row.scrollLeft <= 0) dir = 1;

        row.scrollLeft += hSpeed * dir;
        hDirs.set(row, dir);
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      // Restore scroll-snap & reset scroll position
      rows.forEach((row) => {
        row.style.scrollSnapType = "";
        row.style.scrollBehavior = "";
        row.scrollLeft = 0;
      });
    };
  }, [idleState]);

  /* ---- Resume from countdown — user continues where they left off ---- */
  const handleCountdownCancel = useCallback(() => {
    wake();
  }, [wake]);

  /* ---- Wake from screensaver — shows order type selection ---- */
  const handleScreensaverWake = useCallback(() => {
    wake();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowOrderType(true);
  }, [wake]);

  const canOrder = isRestaurantActive && isCurrentlyOpen;
  const itemCount = getItemCount();

  // --- Handlers ---
  const handleOrderComplete = useCallback((order: Order) => {
    setIsCheckoutOpen(false);
    setViewingOrder(order);
    setCurrentView("order");
    document.body.style.overflow = "";
    window.scrollTo(0, 0);
  }, []);

  const handleBackToMenu = useCallback(() => {
    setCurrentView("menu");
    setViewingOrder(null);
    document.body.style.overflow = "";
    window.scrollTo(0, 0);
  }, []);

  const handleViewOrder = useCallback((order: Order) => {
    setViewingOrder(order);
    setCurrentView("order");
    document.body.style.overflow = "";
    window.scrollTo(0, 0);
  }, []);

  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);

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

  // --- Fullscreen splash handler ---
  const handleStartOrder = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {
      // Fullscreen may be blocked — continue anyway
    });
    setShowSplash(false);
    setShowOrderType(true);
  }, []);

  // --- Order type selected ---
  const handleOrderTypeSelect = useCallback((type: KioskOrderType) => {
    setKioskOrderType(type);
    setShowOrderType(false);
    wake(); // reset idle timer
  }, [wake]);

  // --- Go back from order type to splash ---
  const handleOrderTypeBack = useCallback(() => {
    setShowOrderType(false);
    setShowSplash(true);
  }, []);

  // --- Restart order — clear cart, show order type selection again ---
  const handleRestartOrder = useCallback(() => {
    clearCart();
    setSelectedProduct(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    setShowOrderType(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [clearCart]);

  // --- Order receipt view ---
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
      {/* Kiosk Header — logo, name, welcome, flags, theme toggle */}
      <RestaurantHeader orders={orders} onViewOrder={handleViewOrder} />

      {/* Sticky bar — order type + restart (centred) */}
      {kioskOrderType && !showSplash && !showOrderType && (
        <div className="kiosk-sticky-bar">
          <div className="kiosk-order-type-bar">
            <div className="kiosk-order-type-badge">
              {kioskOrderType === "takeaway" && <ShoppingBag className="w-4 h-4" />}
              {kioskOrderType === "package" && <Package className="w-4 h-4" />}
              {kioskOrderType === "dineIn" && <UtensilsCrossed className="w-4 h-4" />}
              <span>
                {kioskOrderType === "takeaway" && t("kiosk.takeaway", "Gel Al")}
                {kioskOrderType === "package" && t("kiosk.package", "Paket")}
                {kioskOrderType === "dineIn" && t("kiosk.dineIn", "Masada")}
              </span>
            </div>
            <button onClick={handleRestartOrder} className="kiosk-restart-btn">
              <RotateCcw className="w-4 h-4" />
              <span>{t("kiosk.restart", "Yeniden Başla")}</span>
            </button>
          </div>
        </div>
      )}

      {/* Recommended products — horizontal scroll */}
      {recommendedProducts.length > 0 && (
        <section className="px-6 pt-6 pb-2">
          <h2 className="kiosk-category-title flex items-center gap-2 justify-center">
            <Star className="w-5 h-5 text-[hsl(var(--kiosk-gold))] fill-[hsl(var(--kiosk-gold))]" />
            {t("menu.recommended")}
          </h2>
          <div className="kiosk-scroll-row scroll-fade-x">
            {recommendedProducts.slice(0, 10).map((product) => (
              <ProductCard
                key={`rec-${product.id}`}
                product={product}
                onSelect={handleSelectProduct}
                isSpecialPriceActive={restaurant.isSpecialPriceActive}
                specialPriceName={restaurant.specialPriceName}
                formatPrice={formatPrice}
              />
            ))}
          </div>
        </section>
      )}

      {/* Main content — categories with horizontal product rows */}
      <div className="px-6 py-4 pb-28">
        {/* Campaign section */}
        {campaignProducts.length > 0 && (
          <section
            ref={(el) => (categoryRefs.current[CAMPAIGN_CATEGORY_ID] = el)}
            className="mb-8 animate-fade-in"
          >
            <div className="kiosk-category-heading">
              <h2>{t("menu.campaignProducts")}</h2>
            </div>
            <div className="kiosk-scroll-row scroll-fade-x">
              <AnimatePresence mode="popLayout">
                {campaignProducts.map((product) => (
                  <ProductCard
                    key={`campaign-${product.id}`}
                    product={product}
                    onSelect={handleSelectProduct}
                    isSpecialPriceActive={restaurant.isSpecialPriceActive}
                    specialPriceName={restaurant.specialPriceName}
                    formatPrice={formatPrice}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Category sections */}
        {categories.map((category) => (
          <section
            key={category.id}
            ref={(el) => (categoryRefs.current[category.id] = el)}
            className="mb-8"
          >
            {/* Centred category heading with bold gold strip */}
            <div className="kiosk-category-heading">
              <h2>{category.name}</h2>
            </div>

            {/* Horizontal scroll row */}
            <div className="kiosk-scroll-row scroll-fade-x">
              <AnimatePresence mode="popLayout">
                {category.products.map((product) => (
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
          </section>
        ))}

        {/* External pages */}
        {restaurant.externalPages && restaurant.externalPages.length > 0 && (
          <section className="mb-8 space-y-3">
            {[...restaurant.externalPages]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((page) => (
                <button
                  key={page.id}
                  onClick={() => setSelectedExternalPage(page)}
                  className="w-full text-center py-3 rounded-2xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] hover:border-[hsl(var(--kiosk-gold))]/30 transition-colors"
                >
                  <span className="text-base font-semibold text-[hsl(var(--kiosk-gold))]">
                    {page.buttonName}
                  </span>
                </button>
              ))}
          </section>
        )}
      </div>

      {/* Cart FAB — fixed bottom-right */}
      <AnimatePresence>
        {canOrder && itemCount > 0 && !isCartOpen && !selectedProduct && !isCheckoutOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenCart}
            data-cart-button
            className="kiosk-cart-fab"
          >
            <ShoppingCart className="w-7 h-7" />
            <span className="kiosk-cart-badge">{itemCount}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Call Waiter FAB — fixed bottom-left */}
      {isCurrentlyOpen && restaurant.tableNumber && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (waiterCooldown > 0) return;
            setShowCallWaiter(true);
          }}
          disabled={waiterCooldown > 0}
          className={`fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            waiterCooldown > 0
              ? "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-not-allowed"
              : "bg-[hsl(var(--success))] text-white shadow-lg hover:shadow-xl"
          }`}
        >
          {waiterCooldown > 0 ? (
            <span className="text-xs font-bold">{waiterCooldown}s</span>
          ) : (
            <Bell className="w-6 h-6" />
          )}
        </motion.button>
      )}

      {/* --- Modals & overlays --- */}
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

      {/* ---- Idle countdown modal ---- */}
      <IdleCountdownModal
        isOpen={idleState === "countdown"}
        countdown={countdown}
        onCancel={handleCountdownCancel}
      />

      {/* ---- Screensaver touch overlay ---- */}
      {idleState === "screensaver" && (
        <div
          className="kiosk-screensaver-overlay"
          onClick={handleScreensaverWake}
          onTouchStart={handleScreensaverWake}
        >
          <span className="kiosk-screensaver-hint">
            {t("kiosk.touchToStart", "Siparis vermek icin dokunun")}
          </span>
        </div>
      )}

      <ScrollToTop />
      <LiwaMenuFooter />

      {/* ---- Order type selection modal ---- */}
      <OrderTypeModal
        isOpen={showOrderType}
        onSelect={handleOrderTypeSelect}
        onBack={handleOrderTypeBack}
      />

      {/* ---- Fullscreen splash — "Siparise Basla" ---- */}
      {showSplash && (
        <div className="kiosk-splash">
          <div className="kiosk-splash-logo">
            <img
              src={restaurant.logoImageUrl || restaurant.imageAbsoluteUrl}
              alt={restaurant.name}
            />
          </div>
          <h1>{restaurant.name}</h1>
          <p className="kiosk-splash-welcome">
            {t("header.welcome", "Hosgeldiniz")}
          </p>
          <button className="kiosk-splash-btn" onClick={handleStartOrder}>
            {t("kiosk.startOrder", "Siparise Basla")}
          </button>
        </div>
      )}
    </div>
  );
}
