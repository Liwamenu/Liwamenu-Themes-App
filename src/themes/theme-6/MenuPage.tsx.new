import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Bell, ChevronDown } from "lucide-react";
import { getProductImageSrc, handleProductImageError } from "@/lib/productImage";
import { RestaurantHeader } from "./RestaurantHeader";
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
import { groupBySubcategory } from "@/lib/groupBySubcategory";
import { Input } from "@/components/ui/input";

type View = "menu" | "order";

const CAMPAIGN_CATEGORY_ID = "__campaign__";

/** Accordion category banner — mimics the reference HTML large image cards */
function CategoryBanner({
  name,
  isOpen,
  onToggle,
  image,
}: {
  name: string;
  isOpen: boolean;
  onToggle: () => void;
  image?: string;
}) {
  return (
    <motion.button
      onClick={onToggle}
      className="relative w-full h-[130px] rounded-lg overflow-hidden group"
      whileTap={{ scale: 0.98 }}
    >
      {image && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${image})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/55 to-transparent" />
      <div className="relative z-10 flex items-center justify-between h-full px-5">
        <h2 className="font-display text-2xl font-bold text-white uppercase tracking-wider drop-shadow-lg">
          {name}
        </h2>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown className="w-6 h-6 text-white/80" />
        </motion.div>
      </div>
    </motion.button>
  );
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
  const {
    isVisible: isFlyingEmojiVisible,
    startPosition: flyingEmojiPosition,
    hideFlyingEmoji,
  } = useFlyingEmoji();

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
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

  const isAnyOverlayOpen =
    !!selectedProduct || isCartOpen || isCheckoutOpen || showCallWaiter || showReservation || showTableSelection || showSoundPermission || showAnnouncement;
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

  const toggleCategory = useCallback((id: string) => {
    setExpandedCategory((prev) => (prev === id ? null : id));
  }, []);

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const lq = String(searchQuery ?? "").toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        products: cat.products.filter(
          (p) =>
            String(p.name ?? "").toLowerCase().includes(lq) ||
            String(p.description ?? "").toLowerCase().includes(lq),
        ),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [categories, searchQuery]);

  const canOrder = isRestaurantActive && isCurrentlyOpen;

  const handleOrderComplete = useCallback((order: Order, _orderType: "inPerson" | "online") => {
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
      if (!restaurant.onlineOrder && !restaurant.inPersonOrder) return;
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

  /** Get representative image for a category banner */
  const getCategoryImage = useCallback(
    (cat: { image?: string; products: Product[] }) => {
      if (cat.image) return cat.image;
      const first = cat.products.find((p) => p.imageURL);
      return first ? getProductImageSrc(first.imageURL) : undefined;
    },
    [],
  );

  if (currentView === "order" && viewingOrder) {
    return (
      <div className="theme-6">
        <OrderReceipt orderId={viewingOrder.id} onBack={handleBackToMenu} waiterCooldown={waiterCooldown} onWaiterSuccess={handleWaiterSuccess} />
      </div>
    );
  }

  return (
    <div className="theme-6 min-h-screen bg-background">
      <RestaurantHeader orders={orders} onViewOrder={handleViewOrder} />

      {/* Search Bar */}
      <div className="sticky top-[49px] z-30 bg-background/95 backdrop-blur-sm border-b border-border/30">
        <div className="max-w-[600px] mx-auto px-4 py-2">
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

      {/* Accordion Categories */}
      <div className="max-w-[600px] mx-auto px-4 py-4 pb-24 space-y-3">
        {/* Campaign */}
        {!searchQuery && campaignProducts.length > 0 && (
          <section>
            <CategoryBanner
              name={`🔥 ${t("menu.campaignProducts")}`}
              isOpen={expandedCategory === CAMPAIGN_CATEGORY_ID}
              onToggle={() => toggleCategory(CAMPAIGN_CATEGORY_ID)}
            />
            <AnimatePresence initial={false}>
              {expandedCategory === CAMPAIGN_CATEGORY_ID && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-2">
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* Regular Categories — Accordion */}
        {filteredCategories.map((category) => {
          const isOpen = expandedCategory === category.id || !!searchQuery;
          return (
            <section key={category.id}>
              {!searchQuery && (
                <CategoryBanner
                  name={category.name}
                  isOpen={isOpen}
                  onToggle={() => toggleCategory(category.id)}
                  image={getCategoryImage(category)}
                />
              )}
              {searchQuery && (
                <h2 className="font-display text-xl font-semibold mb-3 text-foreground italic">
                  {category.name}
                  <span className="text-sm font-normal text-muted-foreground ml-2">({category.products.length})</span>
                </h2>
              )}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2">
                      {groupBySubcategory(category.products).map((group) => (
                        <div key={group.subId ?? "__none__"}>
                          {group.subName && (
                            <h3 className="font-display text-base font-semibold text-foreground/80 mb-2 mt-3 italic tracking-wide">
                              {group.subName}
                              <span className="text-xs font-normal text-muted-foreground ml-2 not-italic">
                                ({group.products.length})
                              </span>
                            </h3>
                          )}
                          {group.products.map((product) => (
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
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          );
        })}

        {filteredCategories.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">{t("menu.noResults", { query: searchQuery })}</p>
          </div>
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
          <CheckoutModal onClose={handleCloseCheckout} onOrderComplete={handleOrderComplete} onShowSoundPermission={handleShowSoundPermission} />
        )}
      </AnimatePresence>

      <SoundPermissionModal isOpen={showSoundPermission} onAllow={handleAllowSound} onDeny={handleDenySound} />
      <CallWaiterModal isOpen={showCallWaiter} onClose={handleCloseCallWaiter} onSuccess={handleWaiterSuccess} />
      <ReservationModal isOpen={showReservation} onClose={handleCloseReservation} />
      <ChangeTableModal isOpen={showTableSelection} onClose={() => setShowTableSelection(false)} onTableChange={handleTableSelected} currentTable={undefined} />
      <FlyingEmoji isVisible={isFlyingEmojiVisible} startPosition={flyingEmojiPosition} onComplete={hideFlyingEmoji} />

      {restaurant.announcementSettings?.enabled && restaurant.announcementSettings?.htmlContent && (
        <AnnouncementModal isOpen={showAnnouncement} onClose={() => setShowAnnouncement(false)} htmlContent={restaurant.announcementSettings.htmlContent} />
      )}

      {/* Floating Call Waiter Button */}
      {!isCartOpen && !selectedProduct && !showCallWaiter && !isCheckoutOpen && !showReservation && !showTableSelection && (
        <div className="fixed top-[110px] right-4 z-40">
          <button
            onClick={handleOpenCallWaiterFloating}
            disabled={waiterCooldown > 0}
            className={`h-9 px-3 rounded-full shadow-md flex items-center gap-2 text-sm font-medium transition-all ${
              waiterCooldown > 0 ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-secondary text-secondary-foreground hover:opacity-90"
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
        <div className="fixed bottom-6 right-4 z-40">
          <CartButton onClick={handleOpenCart} />
        </div>
      )}
    </div>
  );
}