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
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [waiterCooldown, setWaiterCooldown] = useState(() => {
    const savedEndTime = localStorage.getItem("waiterCooldownEnd");
    if (savedEndTime) {
      const remaining = Math.ceil((parseInt(savedEndTime) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const isAutoScrollingRef = useRef(false);
  const autoScrollTimeoutRef = useRef<number | null>(null);

  // Auto-show announcement modal
  useEffect(() => {
    const announcementSettings = restaurant.announcementSettings;
    if (!announcementSettings?.enabled) return;
    const timer = setTimeout(() => {
      setShowAnnouncement(true);
    }, announcementSettings.delayMs * 1000);
    return () => clearTimeout(timer);
  }, [restaurant.announcementSettings]);

  // Header hide/show on scroll
  useEffect(() => {
    const handleHeaderScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleHeaderScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleHeaderScroll);
  }, [lastScrollY]);

  // Waiter cooldown timer
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
    return () => {
      if (autoScrollTimeoutRef.current !== null) {
        window.clearTimeout(autoScrollTimeoutRef.current);
      }
    };
  }, []);

  // Handle category scroll sync
  useEffect(() => {
    const handleScroll = throttle(() => {
      if (isAutoScrollingRef.current) return;

      const stickyOffset = isHeaderVisible ? 172 : 120;
      const scrollPosition = window.scrollY + stickyOffset + 40;
      const sectionIds = [
        ...(campaignProducts.length > 0 && !searchQuery ? [CAMPAIGN_CATEGORY_ID] : []),
        ...categories.map((category) => category.id),
      ];

      for (const sectionId of sectionIds) {
        const element = categoryRefs.current[sectionId];
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveCategory(sectionId);
            break;
          }
        }
      }
    }, 100);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories, campaignProducts.length, searchQuery, isHeaderVisible]);


  const getStickyOffset = useCallback(() => {
    // header(52) + category tabs(~58) + search bar(~46) + buffer
    return isHeaderVisible ? 200 : 148;
  }, [isHeaderVisible]);

  const scrollToSection = useCallback(
    (sectionId: string) => {
      const element = categoryRefs.current[sectionId];

      if (!element) return;

      const stickyOffset = getStickyOffset();
      const elementTop = element.getBoundingClientRect().top + window.scrollY;
      const targetTop = Math.max(0, elementTop - stickyOffset);

      if (autoScrollTimeoutRef.current !== null) {
        window.clearTimeout(autoScrollTimeoutRef.current);
      }

      isAutoScrollingRef.current = true;
      setActiveCategory(sectionId);
      window.scrollTo({ top: targetTop, behavior: "smooth" });

      autoScrollTimeoutRef.current = window.setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 650);
    },
    [getStickyOffset],
  );

  const scrollToCategory = useCallback(
    (categoryId: string) => {
      scrollToSection(categoryId === CAMPAIGN_CATEGORY_ID ? CAMPAIGN_CATEGORY_ID : categoryId);
    },
    [scrollToSection],
  );

  // Filter products by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const lowerQuery = String(searchQuery ?? "").toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        products: cat.products.filter(
          (p) => String(p.name ?? "").toLowerCase().includes(lowerQuery) || String(p.description ?? "").toLowerCase().includes(lowerQuery),
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
    (newTable: string) => {
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

  // Show order receipt view
  if (currentView === "order" && viewingOrder) {
    return (
      <div className="theme-5">
        <OrderReceipt
          orderId={viewingOrder.id}
          onBack={handleBackToMenu}
          waiterCooldown={waiterCooldown}
          onWaiterSuccess={handleWaiterSuccess}
        />
      </div>
    );
  }

  const restaurantHeroImage = restaurant.imageAbsoluteUrl || restaurant.heroImageUrl;

  return (
    <div className="theme-5 min-h-screen bg-background">
      {/* Restaurant Header */}
      <RestaurantHeader orders={orders} onViewOrder={handleViewOrder} isVisible={isHeaderVisible} />

      {/* Category Tabs */}
      {!searchQuery && (
        <CategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={scrollToCategory}
          isHeaderVisible={isHeaderVisible}
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

      {/* Search Bar */}
      {searchQuery !== null && (
        <div
          className="sticky z-30 bg-background/95 backdrop-blur-sm border-b border-border transition-all duration-300"
          style={{ top: isHeaderVisible ? (searchQuery ? "52px" : "110px") : searchQuery ? "0px" : "58px" }}
        >
          <div className="max-w-[1220px] mx-auto px-4 py-2">
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

      {/* Restaurant Hero Banner */}
      {!searchQuery && (
        <div className="relative w-full h-[250px] lg:h-[320px] overflow-hidden">
          {restaurantHeroImage && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${restaurantHeroImage})` }}
            />
          )}
          <div className="absolute inset-0 bg-primary/60" />
          <div className="flex z-10 justify-center items-center h-full relative flex-col gap-2">
            <h1 className="font-bold text-[36px] lg:text-[52px] text-primary-foreground z-10 flex items-center justify-center font-display tracking-wider">
              {restaurant.name}
            </h1>
            {restaurant.slogan1 && (
              <p className="text-primary-foreground/80 text-sm lg:text-base z-10 font-barlow tracking-wide">
                {restaurant.slogan1}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Menu Content */}
      <div className="pb-8">
        {/* Campaign Products Section */}
        {!searchQuery && campaignProducts.length > 0 && (
          <section ref={(el) => (categoryRefs.current[CAMPAIGN_CATEGORY_ID] = el)}>
            <div className="relative w-full h-[200px] lg:h-[250px] bg-primary flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/90 to-primary" />
              <h2 className="text-center text-3xl md:text-5xl font-display font-bold text-primary-foreground tracking-wider uppercase z-10">
                🔥 {t("menu.campaignProducts")}
              </h2>
            </div>
            <div className="max-w-[1220px] mx-auto px-7 max-sm:px-2">
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

        {/* Regular Categories */}
        {filteredCategories.map((category) => (
          <section key={category.id} ref={(el) => (categoryRefs.current[category.id] = el)}>
            {!searchQuery && (
              <div className="relative w-full h-[200px] lg:h-[250px] bg-primary flex items-center justify-center overflow-hidden mt-[30px] first:mt-0">
                {category.image && (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-30"
                    style={{ backgroundImage: `url(${category.image})` }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/80 to-primary/95" />
                <h2 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground tracking-wider uppercase z-10">
                  {category.name}
                </h2>
              </div>
            )}
            <div className="max-w-[1220px] mx-auto px-7 max-sm:px-2 mt-4 mb-8">
              {searchQuery && (
                <h2 className="font-display text-xl font-bold mb-4 text-foreground">
                  {category.name}
                  <span className="text-sm font-normal text-muted-foreground ml-2">({category.products.length})</span>
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-[30px] sm:mt-[50px] mb-8">
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

      {/* Footer */}
      <Footer />

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
      <SoundPermissionModal isOpen={showSoundPermission} onAllow={handleAllowSound} onDeny={handleDenySound} />

      {/* Call Waiter Modal */}
      <CallWaiterModal isOpen={showCallWaiter} onClose={handleCloseCallWaiter} onSuccess={handleWaiterSuccess} />

      {/* Reservation Modal */}
      <ReservationModal isOpen={showReservation} onClose={handleCloseReservation} />

      {/* Table Selection Modal */}
      <ChangeTableModal
        isOpen={showTableSelection}
        onClose={() => setShowTableSelection(false)}
        onTableChange={handleTableSelected}
        currentTable={undefined}
      />

      {/* Flying Emoji Animation */}
      <FlyingEmoji isVisible={isFlyingEmojiVisible} startPosition={flyingEmojiPosition} onComplete={hideFlyingEmoji} />

      {/* Announcement Modal */}
      {restaurant.announcementSettings?.enabled && restaurant.announcementSettings?.htmlContent && (
        <AnnouncementModal
          isOpen={showAnnouncement}
          onClose={() => setShowAnnouncement(false)}
          htmlContent={restaurant.announcementSettings.htmlContent}
        />
      )}

      {/* Floating Call Waiter Button */}
      {!isCartOpen && !selectedProduct && !showCallWaiter && !isCheckoutOpen && !showReservation && !showTableSelection && (
        <div className="fixed top-[170px] right-4 z-40">
          <button
            onClick={handleOpenCallWaiterFloating}
            disabled={waiterCooldown > 0}
            className={`h-10 px-3 rounded-full shadow-md flex items-center gap-2 text-sm font-medium transition-all ${
              waiterCooldown > 0
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
            aria-label={t("waiter.title")}
          >
            <Bell className="w-4 h-4" />
            <span>{waiterCooldown > 0 ? `${waiterCooldown}s` : t("waiter.button")}</span>
          </button>
        </div>
      )}

      {/* Floating Cart Button */}
      {canOrder && !isCartOpen && !selectedProduct && !showCallWaiter && !isCheckoutOpen && !showReservation && (
        <div className="fixed bottom-6 right-4 z-50">
          <CartButton onClick={handleOpenCart} />
        </div>
      )}
    </div>
  );
}
