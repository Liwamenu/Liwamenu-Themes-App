import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
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
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
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

  const isAnyOverlayOpen = !!selectedProduct || isCartOpen || isCheckoutOpen || showCallWaiter || showReservation || showTableSelection || showSoundPermission || showAnnouncement;
  useBodyScrollLock(isAnyOverlayOpen);

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

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

  useEffect(() => {
    if (waiterCooldown <= 0) { localStorage.removeItem('waiterCooldownEnd'); return; }
    const timer = setInterval(() => setWaiterCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [waiterCooldown]);

  const handleWaiterSuccess = useCallback(() => {
    const endTime = Date.now() + 60 * 1000;
    localStorage.setItem('waiterCooldownEnd', endTime.toString());
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

  const CAMPAIGN_CATEGORY_ID = '__campaign__';

  const scrollToCategory = useCallback((categoryId: string) => {
    if (categoryId === CAMPAIGN_CATEGORY_ID) {
      const element = categoryRefs.current[CAMPAIGN_CATEGORY_ID];
      if (element) {
        const offset = 100;
        window.scrollTo({ top: element.offsetTop - offset, behavior: "smooth" });
      }
      setActiveCategory(CAMPAIGN_CATEGORY_ID);
      return;
    }
    const element = categoryRefs.current[categoryId];
    if (element) {
      window.scrollTo({ top: element.offsetTop - 100, behavior: "smooth" });
    }
    setActiveCategory(categoryId);
  }, [CAMPAIGN_CATEGORY_ID]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const lowerQuery = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({ ...cat, products: cat.products.filter((p) => p.name.toLowerCase().includes(lowerQuery) || p.description?.toLowerCase().includes(lowerQuery)) }))
      .filter((cat) => cat.products.length > 0);
  }, [categories, searchQuery]);

  const canOrder = isRestaurantActive && isCurrentlyOpen;

  const handleOrderComplete = useCallback((order: Order, orderType: 'inPerson' | 'online') => {
    setIsCheckoutOpen(false);
    setViewingOrder(order);
    setCurrentView("order");
  }, []);

  const handleBackToMenu = useCallback(() => { setCurrentView("menu"); setViewingOrder(null); }, []);
  const handleViewOrder = useCallback((order: Order) => { setViewingOrder(order); setCurrentView("order"); }, []);
  const handleSelectProduct = useCallback((product: Product) => setSelectedProduct(product), []);
  const handleCloseProduct = useCallback(() => setSelectedProduct(null), []);
  const handleOpenCart = useCallback(() => setIsCartOpen(true), []);
  const handleCloseCart = useCallback(() => setIsCartOpen(false), []);
  const handleOpenCheckout = useCallback(() => { setIsCartOpen(false); setIsCheckoutOpen(true); }, []);
  const handleCloseCheckout = useCallback(() => setIsCheckoutOpen(false), []);

  const handleOpenCallWaiter = useCallback(() => {
    if (!isCurrentlyOpen) { toast.error(t('common.closedHours')); return; }
    setIsCartOpen(false);
    setShowCallWaiter(true);
  }, [isCurrentlyOpen, t]);

  const handleCloseCallWaiter = useCallback(() => setShowCallWaiter(false), []);

  const handleOpenCallWaiterFloating = useCallback(() => {
    if (!isCurrentlyOpen) { toast.error(t('common.closedHours')); return; }
    if (!restaurant.tableNumber) { setShowTableSelection(true); return; }
    setShowCallWaiter(true);
  }, [restaurant.tableNumber, isCurrentlyOpen, t]);

  const handleTableSelected = useCallback((newTable: number) => {
    setTableNumber(newTable);
    toast.success(t('cart.tableChanged', { table: newTable }));
    setShowTableSelection(false);
    if (isCurrentlyOpen) setShowCallWaiter(true);
  }, [setTableNumber, t, isCurrentlyOpen]);

  const handleShowSoundPermission = useCallback(() => setShowSoundPermission(true), []);
  const handleAllowSound = useCallback(() => { localStorage.setItem("soundPermission", "allowed"); setShowSoundPermission(false); }, []);
  const handleDenySound = useCallback(() => { localStorage.setItem("soundPermission", "denied"); setShowSoundPermission(false); }, []);
  const handleCloseReservation = useCallback(() => setShowReservation(false), []);

  if (currentView === "order" && viewingOrder) {
    return (
      <div className="theme-2">
        <OrderReceipt orderId={viewingOrder.id} onBack={handleBackToMenu} waiterCooldown={waiterCooldown} onWaiterSuccess={handleWaiterSuccess} />
      </div>
    );
  }

  return (
    <div className="theme-2 min-h-screen bg-background">
      <RestaurantHeader orders={orders} onViewOrder={handleViewOrder} />

      {/* Search Bar */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container px-4 py-3">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("menu.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-11 pr-11 rounded-full border-border bg-secondary/50 focus:border-primary focus:bg-card transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 hover:text-primary transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>
            {canOrder && !isCartOpen && !selectedProduct && !showCallWaiter && !isCheckoutOpen && !showReservation && (
              <CartButton onClick={handleOpenCart} />
            )}
          </div>
        </div>
        {!searchQuery && (
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={scrollToCategory}
            campaignTab={campaignProducts.length > 0 ? { id: CAMPAIGN_CATEGORY_ID, name: t('menu.campaignProducts'), count: campaignProducts.length } : null}
          />
        )}
      </div>

      {/* Recommended Products */}
      {!searchQuery && recommendedProducts.length > 0 && (
        <section className="container px-4 py-6">
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">⭐</span>
            {t("menu.recommended")}
          </h2>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
            {recommendedProducts.slice(0, 5).map((product) => (
              <motion.div key={product.id} whileTap={{ scale: 0.98 }} whileHover={{ y: -4 }} onClick={() => handleSelectProduct(product)} className="flex-shrink-0 w-36 cursor-pointer group">
                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                  <img src={product.imageURL} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-sm font-medium line-clamp-2 drop-shadow-md">{product.name}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Menu Categories - single column horizontal cards */}
      <div className="container px-4 py-6 pb-24">
        {!searchQuery && campaignProducts.length > 0 && activeCategory === CAMPAIGN_CATEGORY_ID && (
          <section ref={(el) => (categoryRefs.current[CAMPAIGN_CATEGORY_ID] = el)} className="mb-8">
            <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-campaign/10 flex items-center justify-center">🔥</span>
              {t('menu.campaignProducts')}
              <span className="text-sm font-normal text-muted-foreground ml-2">({campaignProducts.length})</span>
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {campaignProducts.map((product) => (
                  <ProductCard key={`campaign-${product.id}`} product={product} onSelect={handleSelectProduct} isSpecialPriceActive={restaurant.isSpecialPriceActive} specialPriceName={restaurant.specialPriceName} formatPrice={formatPrice} />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {activeCategory !== CAMPAIGN_CATEGORY_ID && filteredCategories.map((category) => (
          <section key={category.id} ref={(el) => (categoryRefs.current[category.id] = el)} className="mb-8">
            <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
              {category.name}
              <span className="text-sm font-normal text-muted-foreground ml-2">({category.products.length})</span>
            </h2>
            <div className="grid grid-cols-1 gap-3">
              <AnimatePresence mode="popLayout">
                {category.products.map((product) => (
                  <ProductCard key={product.id} product={product} onSelect={handleSelectProduct} isSpecialPriceActive={restaurant.isSpecialPriceActive} specialPriceName={restaurant.specialPriceName} formatPrice={formatPrice} />
                ))}
              </AnimatePresence>
            </div>
          </section>
        ))}

        {filteredCategories.length === 0 && searchQuery && (
          <div className="text-center py-12 rounded-2xl bg-secondary/30">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-lg text-muted-foreground">{t("menu.noResults", { query: searchQuery })}</p>
          </div>
        )}
      </div>

      <Footer />

      <AnimatePresence>
        {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={handleCloseProduct} />}
      </AnimatePresence>

      <CartDrawer isOpen={isCartOpen} onClose={handleCloseCart} onCheckout={handleOpenCheckout} onCallWaiter={handleOpenCallWaiter} onTableRequired={() => setShowTableSelection(true)} waiterCooldown={waiterCooldown} />

      <AnimatePresence>
        {isCheckoutOpen && <CheckoutModal onClose={handleCloseCheckout} onOrderComplete={handleOrderComplete} onShowSoundPermission={handleShowSoundPermission} />}
      </AnimatePresence>

      <SoundPermissionModal isOpen={showSoundPermission} onAllow={handleAllowSound} onDeny={handleDenySound} />
      <CallWaiterModal isOpen={showCallWaiter} onClose={handleCloseCallWaiter} onSuccess={handleWaiterSuccess} />
      <ReservationModal isOpen={showReservation} onClose={handleCloseReservation} />
      <ChangeTableModal isOpen={showTableSelection} onClose={() => setShowTableSelection(false)} onTableChange={handleTableSelected} currentTable={undefined} />

      <FlyingEmoji isVisible={isFlyingEmojiVisible} startPosition={flyingEmojiPosition} onComplete={hideFlyingEmoji} />
      <AnnouncementModal isOpen={showAnnouncement} onClose={() => setShowAnnouncement(false)} htmlContent={restaurant.announcementSettings?.htmlContent || ""} />
    </div>
  );
}
