import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Bell } from "lucide-react";
import { RestaurantHeader } from "@/components/menu/RestaurantHeader";
import { CategoryTabs } from "@/components/menu/CategoryTabs";
import { ProductCard } from "@/components/menu/ProductCard";
import { ProductDetailModal } from "@/components/menu/ProductDetailModal";
import { CartDrawer, CartButton } from "@/components/menu/CartDrawer";
import { CheckoutModal } from "@/components/menu/CheckoutModal";
import { OrderReceipt } from "@/components/menu/OrderReceipt";
import { Footer } from "@/components/menu/Footer";
import { SoundPermissionModal } from "@/components/menu/SoundPermissionModal";
import { CallWaiterModal } from "@/components/menu/CallWaiterModal";
import { ReservationModal } from "@/components/menu/ReservationModal";
import { ChangeTableModal } from "@/components/menu/ChangeTableModal";
import { AnnouncementModal } from "@/components/menu/AnnouncementModal";
import { FlyingEmoji } from "@/components/menu/FlyingEmoji";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useRestaurant, useInitializeRestaurant } from "@/hooks/useRestaurant";
import { useOrder } from "@/hooks/useOrder";
import { useFlyingEmoji } from "@/hooks/useFlyingEmoji";
import { Product, Order } from "@/types/restaurant";
import { Input } from "@/components/ui/input";

type View = "menu" | "order";

// Throttle helper function
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
  const { isLoading, error } = useInitializeRestaurant();
  const { categories, recommendedProducts, campaignProducts, isRestaurantActive, isCurrentlyOpen, restaurant, formatPrice, setTableNumber } = useRestaurant();
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
    const savedEndTime = localStorage.getItem('waiterCooldownEnd');
    if (savedEndTime) {
      const remaining = Math.ceil((parseInt(savedEndTime) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  // Lock body scroll when any overlay is open
  const isAnyOverlayOpen = !!selectedProduct || isCartOpen || isCheckoutOpen || showCallWaiter || showReservation || showTableSelection || showSoundPermission || showAnnouncement;
  useBodyScrollLock(isAnyOverlayOpen);

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  // Auto-show announcement modal based on settings
  useEffect(() => {
    const announcementSettings = restaurant.announcementSettings;
    if (!announcementSettings?.enabled) return;
    
    const hasSeenAnnouncement = sessionStorage.getItem('hasSeenAnnouncement');
    if (hasSeenAnnouncement) return;
    
    const timer = setTimeout(() => {
      setShowAnnouncement(true);
      sessionStorage.setItem('hasSeenAnnouncement', 'true');
    }, announcementSettings.delayMs);
    
    return () => clearTimeout(timer);
  }, [restaurant.announcementSettings]);

  // Waiter cooldown timer with localStorage persistence
  useEffect(() => {
    if (waiterCooldown <= 0) {
      localStorage.removeItem('waiterCooldownEnd');
      return;
    }
    const timer = setInterval(() => {
      setWaiterCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [waiterCooldown]);

  // Save cooldown end time when it starts
  const handleWaiterSuccess = useCallback(() => {
    const endTime = Date.now() + 60 * 1000;
    localStorage.setItem('waiterCooldownEnd', endTime.toString());
    setWaiterCooldown(60);
  }, []);

  // Handle category scroll sync with throttle
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
    }, 100); // Throttle to max 10 calls per second

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories]);

  // Campaign category ID for special handling
  const CAMPAIGN_CATEGORY_ID = '__campaign__';

  const scrollToCategory = useCallback((categoryId: string) => {
    // Handle campaign category scrolling
    if (categoryId === CAMPAIGN_CATEGORY_ID) {
      const element = categoryRefs.current[CAMPAIGN_CATEGORY_ID];
      if (element) {
        const offset = 140;
        const elementPosition = element.offsetTop - offset;
        window.scrollTo({ top: elementPosition, behavior: "smooth" });
      }
      setActiveCategory(CAMPAIGN_CATEGORY_ID);
      return;
    }
    
    const element = categoryRefs.current[categoryId];
    if (element) {
      const offset = 140; // Account for sticky header
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({ top: elementPosition, behavior: "smooth" });
    }
    setActiveCategory(categoryId);
  }, [CAMPAIGN_CATEGORY_ID]);

  // Filter products by search - memoized
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    
    const lowerQuery = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        products: cat.products.filter(
          (p) =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.description.toLowerCase().includes(lowerQuery),
        ),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [categories, searchQuery]);

  const canOrder = isRestaurantActive && isCurrentlyOpen;

  const handleOrderComplete = useCallback((order: Order, orderType: 'inPerson' | 'online') => {
    setIsCheckoutOpen(false);
    setViewingOrder(order);
    setCurrentView("order");
  }, []);

  const handleBackToMenu = useCallback(() => {
    setCurrentView("menu");
    setViewingOrder(null);
  }, []);

  // Memoized callbacks for child components
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
    // Çalışma saatleri dışında garson çağırma engelle
    if (!isCurrentlyOpen) {
      toast.error(t('common.closedHours'));
      return;
    }
    setIsCartOpen(false);
    setShowCallWaiter(true);
  }, [isCurrentlyOpen, t]);

  const handleCloseCallWaiter = useCallback(() => {
    setShowCallWaiter(false);
  }, []);

  const handleOpenCallWaiterFloating = useCallback(() => {
    // Çalışma saatleri dışında garson çağırma engelle
    if (!isCurrentlyOpen) {
      toast.error(t('common.closedHours'));
      return;
    }
    // Masa seçilmemişse QR tarama modalı göster
    if (!restaurant.tableNumber) {
      setShowTableSelection(true);
      return;
    }
    setShowCallWaiter(true);
  }, [restaurant.tableNumber, isCurrentlyOpen, t]);

  const handleTableSelected = useCallback((newTable: number) => {
    setTableNumber(newTable);
    toast.success(t('cart.tableChanged', { table: newTable }));
    setShowTableSelection(false);
    // Çalışma saatleri açıksa masa seçildikten sonra garson çağır modalını aç
    if (isCurrentlyOpen) {
      setShowCallWaiter(true);
    }
  }, [setTableNumber, t, isCurrentlyOpen]);

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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">{t("common.loading", "Loading...")}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
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

  // Show order receipt view
  if (currentView === "order" && viewingOrder) {
    return (
      <OrderReceipt
        orderId={viewingOrder.id}
        onBack={handleBackToMenu}
        waiterCooldown={waiterCooldown}
        onWaiterSuccess={handleWaiterSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Restaurant Header */}
      <RestaurantHeader 
        orders={orders}
        onViewOrder={handleViewOrder}
      />

      {/* Search Bar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg">
        <div className="container px-4 py-3">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("menu.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-12 pr-12 rounded-full bg-secondary border-0"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Cart Button - next to search */}
            {canOrder && !isCartOpen && !selectedProduct && !showCallWaiter && !isCheckoutOpen && !showReservation && (
              <CartButton onClick={handleOpenCart} />
            )}
          </div>
        </div>

        {/* Category Tabs */}
        {!searchQuery && (
          <CategoryTabs 
            categories={categories} 
            activeCategory={activeCategory} 
            onCategoryChange={scrollToCategory}
            campaignTab={campaignProducts.length > 0 ? {
              id: CAMPAIGN_CATEGORY_ID,
              name: t('menu.campaignProducts'),
              count: campaignProducts.length
            } : null}
          />
        )}
      </div>

      {/* Recommended Products */}
      {!searchQuery && recommendedProducts.length > 0 && (
        <section className="container px-4 py-6">
          <h2 className="font-display text-xl font-bold mb-4">✨ {t("menu.recommended")}</h2>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
            {recommendedProducts.slice(0, 5).map((product) => (
              <motion.div
                key={product.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectProduct(product)}
                className="flex-shrink-0 w-40 cursor-pointer"
              >
                <div className="relative aspect-square rounded-[4px] overflow-hidden mb-2">
                  <img src={product.imageURL} alt={product.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
                  <span className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm text-white text-sm font-light text-center line-clamp-2 px-2 py-1 rounded-[4px]">
                    {product.name}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Menu Categories */}
      <div className="container px-4 pb-8">
        {/* Campaign Products Section - Only show when campaign tab is active */}
        {!searchQuery && campaignProducts.length > 0 && activeCategory === CAMPAIGN_CATEGORY_ID && (
          <section 
            ref={(el) => (categoryRefs.current[CAMPAIGN_CATEGORY_ID] = el)} 
            className="mb-8"
          >
            <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
              🔥 {t('menu.campaignProducts')}
              <span className="text-sm font-normal text-muted-foreground">({campaignProducts.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* Regular Categories - Hide when campaign tab is active */}
        {activeCategory !== CAMPAIGN_CATEGORY_ID && filteredCategories.map((category) => (
          <section key={category.id} ref={(el) => (categoryRefs.current[category.id] = el)} className="mb-8">
            <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
              {category.name}
              <span className="text-sm font-normal text-muted-foreground">({category.products.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {filteredCategories.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">{t("menu.noResults", { query: searchQuery })}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />

      {/* Cart Button - moved to floating container below */}

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={handleCloseProduct} />}
      </AnimatePresence>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={handleCloseCart}
        onCheckout={handleOpenCheckout}
        onCallWaiter={handleOpenCallWaiter}
        onTableRequired={() => setShowTableSelection(true)}
        waiterCooldown={waiterCooldown}
      />

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <CheckoutModal
            onClose={handleCloseCheckout}
            onOrderComplete={handleOrderComplete}
            onShowSoundPermission={handleShowSoundPermission}
          />
        )}
      </AnimatePresence>

      {/* Sound Permission Modal */}
      <SoundPermissionModal
        isOpen={showSoundPermission}
        onAllow={handleAllowSound}
        onDeny={handleDenySound}
      />

      {/* Call Waiter Modal */}
      <CallWaiterModal 
        isOpen={showCallWaiter} 
        onClose={handleCloseCallWaiter} 
        onSuccess={handleWaiterSuccess}
      />

      {/* Reservation Modal */}
      <ReservationModal isOpen={showReservation} onClose={handleCloseReservation} />

      {/* Table Selection Modal - Masa seçilmeden garson çağırma */}
      <ChangeTableModal
        isOpen={showTableSelection}
        onClose={() => setShowTableSelection(false)}
        onTableChange={handleTableSelected}
        currentTable={undefined}
      />

      {/* Flying Emoji Animation */}
      <FlyingEmoji
        isVisible={isFlyingEmojiVisible}
        startPosition={flyingEmojiPosition}
        onComplete={hideFlyingEmoji}
      />

      {/* Announcement Modal */}
      {restaurant.announcementSettings?.enabled && (
        <AnnouncementModal
          isOpen={showAnnouncement}
          onClose={() => setShowAnnouncement(false)}
          htmlContent={restaurant.announcementSettings.htmlContent}
        />
      )}

      {/* Floating Call Waiter Button - Top Right (hidden when modals are open) */}
      {!isCartOpen && !selectedProduct && !showCallWaiter && !isCheckoutOpen && !showReservation && (
        <div className="fixed top-[138px] right-4 z-50">
          <button
            onClick={handleOpenCallWaiterFloating}
            disabled={waiterCooldown > 0}
            className={`h-10 px-3 rounded-full shadow-md flex items-center gap-2 text-sm font-medium transition-all ${
              waiterCooldown > 0
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-sky-400 text-white hover:bg-sky-500"
            }`}
            aria-label={t("waiter.title")}
          >
            <Bell className="w-4 h-4" />
            <span>
              {waiterCooldown > 0 ? `${waiterCooldown}s` : t("waiter.button")}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
