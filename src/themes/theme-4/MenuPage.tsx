import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Bell } from "lucide-react";
import { RestaurantHeader } from "./RestaurantHeader";
import { CategoryTabs } from "./CategoryTabs";
import { ProductCard } from "./ProductCard";
import { ProductDetailModal } from "./ProductDetailModal";
import { CartDrawer, CartButton } from "./CartDrawer";
import { CheckoutModal } from "./CheckoutModal";
import { OrderReceipt } from "./OrderReceipt";
import { Footer } from "./Footer";
import { SoundPermissionModal } from "./SoundPermissionModal";
import { CallWaiterModal } from "./CallWaiterModal";
import { ReservationModal } from "./ReservationModal";
import { ChangeTableModal } from "./ChangeTableModal";
import { AnnouncementModal } from "./AnnouncementModal";
import { FlyingEmoji } from "./FlyingEmoji";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useOrder } from "@/hooks/useOrder";
import { useFlyingEmoji } from "@/hooks/useFlyingEmoji";
import { Product, Order } from "@/types/restaurant";
import { Input } from "@/components/ui/input";

type View = "menu" | "order";

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
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id || "");
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
  const [waiterCooldown, setWaiterCooldown] = useState(() => {
    const savedEndTime = localStorage.getItem("waiterCooldownEnd");
    if (savedEndTime) {
      const remaining = Math.ceil((parseInt(savedEndTime) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const announcementSettings = restaurant.announcementSettings;
    if (!announcementSettings?.enabled) return;
    const hasSeenAnnouncement = sessionStorage.getItem("hasSeenAnnouncement");
    if (hasSeenAnnouncement) return;
    const timer = setTimeout(() => {
      setShowAnnouncement(true);
      sessionStorage.setItem("hasSeenAnnouncement", "true");
    }, announcementSettings.delayMs);
    return () => clearTimeout(timer);
  }, [restaurant.announcementSettings]);

  useEffect(() => {
    if (waiterCooldown <= 0) {
      localStorage.removeItem("waiterCooldownEnd");
      return;
    }
    const timer = setInterval(() => {
      setWaiterCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [waiterCooldown]);

  const handleWaiterSuccess = useCallback(() => {
    const endTime = Date.now() + 60 * 1000;
    localStorage.setItem("waiterCooldownEnd", endTime.toString());
    setWaiterCooldown(60);
  }, []);

  useEffect(() => {
    const handleScroll = throttle(() => {
      const scrollPosition = window.scrollY + 200;
      for (const category of categories) {
        const element = categoryRefs.current[category.id];
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveCategory(category.id);
            break;
          }
        }
      }
    }, 100);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories]);

  const CAMPAIGN_CATEGORY_ID = "__campaign__";

  const scrollToCategory = useCallback(
    (categoryId: string) => {
      if (categoryId === CAMPAIGN_CATEGORY_ID) {
        const element = categoryRefs.current[CAMPAIGN_CATEGORY_ID];
        if (element) {
          const offset = 80;
          const elementPosition = element.offsetTop - offset;
          window.scrollTo({ top: elementPosition, behavior: "smooth" });
        }
        setActiveCategory(CAMPAIGN_CATEGORY_ID);
        return;
      }
      const element = categoryRefs.current[categoryId];
      if (element) {
        const offset = 80;
        const elementPosition = element.offsetTop - offset;
        window.scrollTo({ top: elementPosition, behavior: "smooth" });
      }
      setActiveCategory(categoryId);
    },
    [CAMPAIGN_CATEGORY_ID],
  );

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const lowerQuery = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        products: cat.products.filter(
          (p) => p.name.toLowerCase().includes(lowerQuery) || p.description.toLowerCase().includes(lowerQuery),
        ),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [categories, searchQuery]);

  const canOrder = isRestaurantActive && isCurrentlyOpen;

  const handleOrderComplete = useCallback((order: Order, orderType: "inPerson" | "online") => {
    setIsCheckoutOpen(false);
    setViewingOrder(order);
    setCurrentView("order");
  }, []);

  const handleBackToMenu = useCallback(() => {
    setCurrentView("menu");
    setViewingOrder(null);
  }, []);

  const handleViewOrder = useCallback((order: Order) => {
    setViewingOrder(order);
    setCurrentView("order");
  }, []);

  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);

  const handleCloseProduct = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  const handleOpenCart = useCallback(() => {
    setIsCartOpen(true);
  }, []);

  const handleCloseCart = useCallback(() => {
    setIsCartOpen(false);
  }, []);

  const handleOpenCheckout = useCallback(() => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  }, []);

  const handleCloseCheckout = useCallback(() => {
    setIsCheckoutOpen(false);
  }, []);

  const handleOpenCallWaiter = useCallback(() => {
    if (!isCurrentlyOpen) {
      toast.error(t("common.closedHours"));
      return;
    }
    setIsCartOpen(false);
    setShowCallWaiter(true);
  }, [isCurrentlyOpen, t]);

  const handleCloseCallWaiter = useCallback(() => {
    setShowCallWaiter(false);
  }, []);

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
    (newTable: number) => {
      setTableNumber(newTable);
      toast.success(t("cart.tableChanged", { table: newTable }));
      setShowTableSelection(false);
      if (isCurrentlyOpen) {
        setShowCallWaiter(true);
      }
    },
    [setTableNumber, t, isCurrentlyOpen],
  );

  const handleShowSoundPermission = useCallback(() => {
    setShowSoundPermission(true);
  }, []);

  const handleAllowSound = useCallback(() => {
    localStorage.setItem("soundPermission", "allowed");
    setShowSoundPermission(false);
  }, []);

  const handleDenySound = useCallback(() => {
    localStorage.setItem("soundPermission", "denied");
    setShowSoundPermission(false);
  }, []);

  const handleCloseReservation = useCallback(() => {
    setShowReservation(false);
  }, []);

  if (currentView === "order" && viewingOrder) {
    return (
      <div className="theme-4">
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
    <div className="theme-4 min-h-screen bg-background pb-20">
      <RestaurantHeader orders={orders} onViewOrder={handleViewOrder} />

      {searchQuery !== null && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-5xl mx-auto px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("menu.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10 pr-10 rounded-full bg-input border-border text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!searchQuery && (
        <div
          className="relative w-full h-[50vh] min-h-[300px] bg-fixed bg-cover bg-center"
          style={{
            backgroundImage: `url(${restaurant.heroImageUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=600&fit=crop"})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            {(restaurant as any).logoUrl && (
              <img
                src={(restaurant as any).logoUrl}
                alt={restaurant.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-white/30"
              />
            )}
            <h2 className="text-center text-5xl md:text-7xl font-display font-bold text-white tracking-wider uppercase">
              {restaurant.name}
            </h2>
            {restaurant.slogan1 && <p className="text-white/70 text-lg">{restaurant.slogan1}</p>}
          </div>
        </div>
      )}

      <div className="pb-8">
        {!searchQuery && campaignProducts.length > 0 && activeCategory === CAMPAIGN_CATEGORY_ID && (
          <section ref={(el) => (categoryRefs.current[CAMPAIGN_CATEGORY_ID] = el)}>
            <div
              className="relative w-full h-[40vh] min-h-[250px] bg-fixed bg-cover bg-center"
              style={{
                backgroundImage: `url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=600&fit=crop)`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70" />
              <div className="absolute inset-0 flex items-center justify-center">
                <h2 className="text-4xl md:text-6xl font-display font-bold text-white tracking-wider uppercase">
                  🔥 {t("menu.campaignProducts")}
                </h2>
              </div>
            </div>
            <div className="max-w-5xl mx-auto px-4 pt-10 pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-[50px] mb-8">
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
            </div>
          </section>
        )}

        {activeCategory !== CAMPAIGN_CATEGORY_ID &&
          filteredCategories.map((category) => (
            <section key={category.id} ref={(el) => (categoryRefs.current[category.id] = el)}>
              {!searchQuery && (
                <div
                  className="relative w-full h-[40vh] min-h-[250px] bg-fixed bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${category.image || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=600&fit=crop"})`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <h2 className="text-4xl md:text-6xl font-display font-bold text-white tracking-wider uppercase">
                      {category.name}
                    </h2>
                  </div>
                </div>
              )}
              <div className="max-w-5xl mx-auto px-4 pt-10 pb-8">
                {searchQuery && (
                  <h2 className="font-display text-xl font-bold mb-4 text-foreground">
                    {category.name}
                    <span className="text-sm font-normal text-muted-foreground ml-2">({category.products.length})</span>
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-[50px] mb-8">
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
              </div>
            </section>
          ))}

        {filteredCategories.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">{t("menu.noResults", { query: searchQuery })}</p>
          </div>
        )}
      </div>

      <Footer />

      {!searchQuery && (
        <CategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={scrollToCategory}
          campaignTab={
            campaignProducts.length > 0
              ? {
                  id: CAMPAIGN_CATEGORY_ID,
                  name: t("menu.campaignProducts"),
                  count: campaignProducts.length,
                }
              : null
          }
        />
      )}

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

      {restaurant.announcementSettings?.enabled && restaurant.announcementSettings?.htmlContent && (
        <AnnouncementModal
          isOpen={showAnnouncement}
          onClose={() => setShowAnnouncement(false)}
          htmlContent={restaurant.announcementSettings.htmlContent}
        />
      )}

      {!isCartOpen && !selectedProduct && !showCallWaiter && !isCheckoutOpen && !showReservation && !showTableSelection && (
        <div className="fixed top-[100px] right-4 z-50">
          <button
            onClick={handleOpenCallWaiterFloating}
            disabled={waiterCooldown > 0}
            className={`h-10 px-3 rounded-full shadow-md flex items-center gap-2 text-sm font-medium transition-all ${
              waiterCooldown > 0
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-accent text-accent-foreground hover:opacity-90"
            }`}
            aria-label={t("waiter.title")}
          >
            <Bell className="w-4 h-4" />
            <span>{waiterCooldown > 0 ? `${waiterCooldown}s` : t("waiter.button")}</span>
          </button>
        </div>
      )}

      {canOrder && !isCartOpen && !selectedProduct && !showCallWaiter && !isCheckoutOpen && !showReservation && (
        <div className="fixed bottom-16 right-4 z-50">
          <CartButton onClick={handleOpenCart} />
        </div>
      )}
    </div>
  );
}
