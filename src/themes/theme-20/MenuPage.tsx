import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Bell } from "lucide-react";
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
import { ReservationModal } from "./ReservationModal";
import { ChangeTableModal } from "./ChangeTableModal";
import { AnnouncementModal } from "./AnnouncementModal";
import { FlyingEmoji } from "./FlyingEmoji";
import { ExternalPageView } from "@/components/menu/ExternalPageView";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useOrder } from "@/hooks/useOrder";
import { useFlyingEmoji } from "@/hooks/useFlyingEmoji";
import { Product, Order } from "@/types/restaurant";
import { Input } from "@/components/ui/input";

type View = "menu" | "order";
const CAMPAIGN_CATEGORY_ID = "__campaign__";

export function MenuPage() {
  const { t } = useTranslation();
  const {
    categories,
    campaignProducts,
    isRestaurantActive,
    isCurrentlyOpen,
    restaurant,
    formatPrice,
    setTableNumber,
  } = useRestaurant();
  const { orders } = useOrder();
  const { isVisible: isFlyingEmojiVisible, startPosition: flyingEmojiPosition, hideFlyingEmoji } = useFlyingEmoji();
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
  const [showExternalPage, setShowExternalPage] = useState(false);
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

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const lowerQuery = String(searchQuery ?? "").toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        products: cat.products.filter(
          (p) =>
            String(p.name ?? "").toLowerCase().includes(lowerQuery) ||
            String(p.description ?? "").toLowerCase().includes(lowerQuery),
        ),
      }))
      .filter((cat) => cat.products.length > 0);
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
      <div className="theme-20">
        <OrderReceipt
          orderId={viewingOrder.id}
          onBack={handleBackToMenu}
          waiterCooldown={waiterCooldown}
          onWaiterSuccess={handleWaiterSuccess}
        />
      </div>
    );
  }

  // Vertical list of sections; each has its own horizontal scroller
  const sections: Array<{ id: string; name: string; products: Product[] }> = [];
  if (campaignProducts.length > 0 && !searchQuery) {
    sections.push({ id: CAMPAIGN_CATEGORY_ID, name: t("menu.campaignProducts"), products: campaignProducts });
  }
  filteredCategories.forEach((c) => sections.push({ id: c.id, name: c.name, products: c.products }));

  return (
    <div className="theme-20 min-h-screen bg-background">
      <RestaurantHeader orders={orders} onViewOrder={handleViewOrder} />

      {/* Sticky search + cart */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container px-4 py-3">
          <div className="flex gap-3 items-center">
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
            {!isCartOpen && !selectedProduct && !showCallWaiter && !isCheckoutOpen && !showReservation && !showTableSelection && (
              <button
                onClick={handleOpenCallWaiterFloating}
                disabled={waiterCooldown > 0}
                className={`shrink-0 h-10 px-3 rounded-full shadow-md flex items-center gap-2 text-xs font-medium transition-all ${
                  waiterCooldown > 0
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>{waiterCooldown > 0 ? `${waiterCooldown}s` : t("waiter.button")}</span>
              </button>
            )}
            {canOrder && !isCartOpen && !selectedProduct && !showCallWaiter && !isCheckoutOpen && !showReservation && (
              <CartButton onClick={handleOpenCart} />
            )}
          </div>
        </div>
      </div>

      <div className="container px-3 py-4 pb-24 space-y-4">
        {sections.length === 0 && searchQuery && (
          <div className="text-center py-12 rounded-2xl bg-card border border-border">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-muted-foreground">{t("menu.noResults", { query: searchQuery })}</p>
          </div>
        )}

        {sections.map((section) => (
          <section key={section.id} className="cat-section">
            <div className="cat-header-band py-3 mb-4 px-4">
              <h2 className="cat-title text-center text-xl">{section.name}</h2>
            </div>
            <div className="scroll-row overflow-x-auto pb-4">
              <div className="flex gap-3 px-4 min-w-min">
                {section.products.map((product) => (
                  <ProductCard
                    key={`${section.id}-${product.id}`}
                    product={product}
                    onSelect={handleSelectProduct}
                    isSpecialPriceActive={restaurant.isSpecialPriceActive}
                    specialPriceName={restaurant.specialPriceName}
                    formatPrice={formatPrice}
                  />
                ))}
              </div>
            </div>
          </section>
        ))}

        {!searchQuery &&
          restaurant.externalPageButtonName &&
          (restaurant.externalPageHTML || restaurant.externalPageImage) && (
            <button
              onClick={() => setShowExternalPage(true)}
              className="w-full px-4 py-3 rounded-2xl bg-card text-foreground font-semibold text-center border border-border hover:bg-secondary transition-colors"
            >
              {restaurant.externalPageButtonName}
            </button>
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

      {showExternalPage && (
        <ExternalPageView
          html={restaurant.externalPageHTML}
          image={restaurant.externalPageImage}
          onClose={() => setShowExternalPage(false)}
        />
      )}

      <ScrollToTop />
      <LiwaMenuFooter />
    </div>
  );
}
