import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Bell, ChevronDown } from "lucide-react";
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
import { getProductImageSrc, handleProductImageError } from "@/lib/productImage";
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
import { SubcategoryButtons, useSubcategoryFilter } from "@/components/menu/SubcategoryButtons";
import { cn } from "@/lib/utils";

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
    setTableNumber,
  } = useRestaurant();
  const { orders } = useOrder();
  const { isVisible: isFlyingEmojiVisible, startPosition: flyingEmojiPosition, hideFlyingEmoji } = useFlyingEmoji();
  const subFilter = useSubcategoryFilter();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
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

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
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

  // When searching, expand all matching categories automatically
  useEffect(() => {
    if (searchQuery) {
      setExpandedCategories(new Set(filteredCategories.map((c) => c.id)));
    }
  }, [searchQuery, filteredCategories]);

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
      <div className="theme-15">
        <OrderReceipt
          orderId={viewingOrder.id}
          onBack={handleBackToMenu}
          waiterCooldown={waiterCooldown}
          onWaiterSuccess={handleWaiterSuccess}
        />
      </div>
    );
  }

  const renderAccordionItem = (categoryId: string, name: string, products: Product[], emoji: string, headerImage?: string) => {
    const isExpanded = expandedCategories.has(categoryId);
    return (
      <div
        key={categoryId}
        className="overflow-hidden rounded-2xl bg-card border border-border shadow-card"
      >
        <button
          onClick={() => toggleCategory(categoryId)}
          className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors"
        >
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-secondary flex items-center justify-center shrink-0">
            {headerImage ? (
              <img
                src={headerImage}
                alt={name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={handleProductImageError}
              />
            ) : (
              <span className="text-2xl">{emoji}</span>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h3 className="font-display font-bold text-base text-foreground truncate">{name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {products.length} {t("menu.products", "ürün")}
            </p>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
              isExpanded ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pt-1 border-t border-border">
                {categoryId !== CAMPAIGN_CATEGORY_ID && (
                  <SubcategoryButtons
                    categoryId={categoryId}
                    products={products}
                    activeSub={subFilter.getActive(categoryId)}
                    onToggle={(subId) => subFilter.toggle(categoryId, subId)}
                  />
                )}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {(categoryId === CAMPAIGN_CATEGORY_ID
                    ? products
                    : subFilter.filter(categoryId, products)
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
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="theme-15 min-h-screen bg-background">
      <RestaurantHeader orders={orders} onViewOrder={handleViewOrder} />

      {/* Search Bar */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container px-4 py-3">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("menu.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-11 pr-11 rounded-2xl border-border bg-secondary text-sm focus:border-primary transition-all"
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
                aria-label={t("waiter.title")}
                className={`shrink-0 h-10 px-3 rounded-full shadow-md flex items-center gap-2 text-sm font-medium transition-all ${
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

      {/* Recommended Products */}
      {!searchQuery && recommendedProducts.length > 0 && (
        <section className="container px-4 py-6">
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">⭐</span>
            {t("menu.recommended")}
          </h2>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
            {recommendedProducts.slice(0, 5).map((product) => (
              <motion.div
                key={product.id}
                whileTap={{ scale: 0.98 }}
                whileHover={{ y: -4 }}
                onClick={() => handleSelectProduct(product)}
                className="flex-shrink-0 w-36 cursor-pointer group"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                  <img
                    src={getProductImageSrc(product.imageURL)}
                    onError={handleProductImageError}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                  />
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

      {/* Accordion Categories */}
      <div className="px-[2px] py-4 pb-24 space-y-3">
        {!searchQuery && campaignProducts.length > 0 && (
          renderAccordionItem(
            CAMPAIGN_CATEGORY_ID,
            t("menu.campaignProducts"),
            campaignProducts,
            "🔥",
            getProductImageSrc(campaignProducts[0]?.imageURL)
          )
        )}

        {filteredCategories.map((category, idx) => {
          const headerImage =
            (category as unknown as { image?: string }).image ||
            getProductImageSrc(category.products[0]?.imageURL);
          const emojis = ["🍔", "🍕", "🥪", "🍣", "🍝", "🥗", "🍰", "🍩", "🍦", "🍱", "🥘", "🍲"];
          return renderAccordionItem(category.id, category.name, category.products, emojis[idx % emojis.length], headerImage);
        })}

        {filteredCategories.length === 0 && searchQuery && (
          <div className="text-center py-12 rounded-2xl bg-secondary/30">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-lg text-muted-foreground">{t("menu.noResults", { query: searchQuery })}</p>
          </div>
        )}

        {/* External Page Button */}
        {!searchQuery &&
          restaurant.externalPageButtonName &&
          (restaurant.externalPageHTML || restaurant.externalPageImage) && (
            <button
              onClick={() => setShowExternalPage(true)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-card hover:bg-secondary/50 transition-colors"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="font-display font-bold text-base text-foreground text-left flex-1">
                {restaurant.externalPageButtonName}
              </h3>
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
