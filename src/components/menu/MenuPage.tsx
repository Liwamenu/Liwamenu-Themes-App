import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { FlyingEmoji } from "@/components/menu/FlyingEmoji";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useOrder } from "@/hooks/useOrder";
import { useFlyingEmoji } from "@/hooks/useFlyingEmoji";
import { Product, Order } from "@/types/restaurant";
import { Input } from "@/components/ui/input";

type View = "menu" | "order";

export function MenuPage() {
  const { t } = useTranslation();
  const { categories, recommendedProducts, isRestaurantActive, isCurrentlyOpen, restaurant } = useRestaurant();
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
  const [waiterCooldown, setWaiterCooldown] = useState(() => {
    const savedEndTime = localStorage.getItem('waiterCooldownEnd');
    if (savedEndTime) {
      const remaining = Math.ceil((parseInt(savedEndTime) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

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
  const handleWaiterSuccess = () => {
    const endTime = Date.now() + 60 * 1000;
    localStorage.setItem('waiterCooldownEnd', endTime.toString());
    setWaiterCooldown(60);
  };

  // Handle category scroll sync
  useEffect(() => {
    const handleScroll = () => {
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
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories]);

  const scrollToCategory = (categoryId: string) => {
    const element = categoryRefs.current[categoryId];
    if (element) {
      const offset = 140; // Account for sticky header
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({ top: elementPosition, behavior: "smooth" });
    }
    setActiveCategory(categoryId);
  };

  // Filter products by search
  const filteredCategories = searchQuery
    ? categories
        .map((cat) => ({
          ...cat,
          products: cat.products.filter(
            (p) =>
              p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.description.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
        }))
        .filter((cat) => cat.products.length > 0)
    : categories;

  const canOrder = isRestaurantActive && isCurrentlyOpen;

  const handleOrderComplete = (order: Order, orderType: 'inPerson' | 'online') => {
    setIsCheckoutOpen(false);
    setViewingOrder(order);
    setCurrentView("order");
  };

  const handleBackToMenu = () => {
    setCurrentView("menu");
    setViewingOrder(null);
  };

  // Show order receipt view
  if (currentView === "order" && viewingOrder) {
    return <OrderReceipt order={viewingOrder} onBack={handleBackToMenu} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Restaurant Header */}
      <RestaurantHeader />

      {/* Search Bar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg">
        <div className="container px-4 py-3">
          <div className="flex gap-3">
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

            {/* My Orders Button */}
            {orders.length > 0 && (
              <button
                onClick={() => {
                  if (orders.length > 0) {
                    setViewingOrder(orders[0]);
                    setCurrentView("order");
                  }
                }}
                className="h-12 px-4 rounded-full bg-primary text-primary-foreground flex items-center gap-2 font-medium hover:bg-primary/90 transition-colors"
              >
                {/* <Receipt className="w-5 h-5" /> */}
                <span className="sm:inline">{t("menu.myOrder")}</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        {!searchQuery && (
          <CategoryTabs categories={categories} activeCategory={activeCategory} onCategoryChange={scrollToCategory} />
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
                onClick={() => setSelectedProduct(product)}
                className="flex-shrink-0 w-40 cursor-pointer"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden mb-2">
                  <img src={product.imageURL} alt={product.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
                  <span className="absolute bottom-2 left-2 right-2 text-primary-foreground text-sm font-semibold line-clamp-1">
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
        {filteredCategories.map((category) => (
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
                    onSelect={setSelectedProduct}
                    isSpecialPriceActive={restaurant.isSpecialPriceActive}
                    specialPriceName={restaurant.specialPriceName}
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
        {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
      </AnimatePresence>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        onCallWaiter={() => {
          setIsCartOpen(false);
          setShowCallWaiter(true);
        }}
        waiterCooldown={waiterCooldown}
      />

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <CheckoutModal
            onClose={() => setIsCheckoutOpen(false)}
            onOrderComplete={handleOrderComplete}
            onShowSoundPermission={() => setShowSoundPermission(true)}
          />
        )}
      </AnimatePresence>

      {/* Sound Permission Modal */}
      <SoundPermissionModal
        isOpen={showSoundPermission}
        onAllow={() => {
          localStorage.setItem("soundPermission", "allowed");
          setShowSoundPermission(false);
        }}
        onDeny={() => {
          localStorage.setItem("soundPermission", "denied");
          setShowSoundPermission(false);
        }}
      />

      {/* Call Waiter Modal */}
      <CallWaiterModal 
        isOpen={showCallWaiter} 
        onClose={() => setShowCallWaiter(false)} 
        onSuccess={handleWaiterSuccess}
      />

      {/* Reservation Modal */}
      <ReservationModal isOpen={showReservation} onClose={() => setShowReservation(false)} />

      {/* Flying Emoji Animation */}
      <FlyingEmoji
        isVisible={isFlyingEmojiVisible}
        startPosition={flyingEmojiPosition}
        onComplete={hideFlyingEmoji}
      />

      {/* Floating Buttons Container - Top Right (hidden when cart is open) */}
      {!isCartOpen && (
        <div className="fixed top-[138px] right-4 z-50 flex flex-col gap-3 items-end">
          {/* Call Waiter Button */}
          <button
            onClick={() => setShowCallWaiter(true)}
            disabled={waiterCooldown > 0}
            className={`h-10 px-3 rounded-full shadow-md flex items-center gap-2 text-sm font-medium transition-all ${
              waiterCooldown > 0
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-sky-400 text-white hover:bg-sky-500 animate-pulse"
            }`}
            aria-label={t("waiter.title")}
          >
            <Bell className="w-4 h-4" />
            <span>
              {waiterCooldown > 0 ? `${waiterCooldown}s` : t("waiter.button")}
            </span>
          </button>

          {/* Cart Button */}
          {canOrder && <CartButton onClick={() => setIsCartOpen(true)} />}
        </div>
      )}
    </div>
  );
}
