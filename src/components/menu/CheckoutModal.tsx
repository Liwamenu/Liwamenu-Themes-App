import { useState } from "react";
import type { Country } from "react-phone-number-input";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, User, Phone, CreditCard, Banknote, AlertCircle, Loader2, Bell, Check, Home, ArrowLeft, FileText, QrCode } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";
import { useRestaurant, useRestaurantStore, refreshRestaurantData } from "@/hooks/useRestaurant";
import { useCart, getCartItemDisplayPrice } from "@/hooks/useCart";
import { useLocation, isLocationPermissionGranted } from "@/hooks/useLocation";
import { useOrder } from "@/hooks/useOrder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { OrderPayload, Order } from "@/types/restaurant";
import { createOnlineOrder, getResponseData, ApiError } from "@/lib/api";
import { useFirebaseMessagingStore, initializeFirebaseMessaging } from "@/hooks/useFirebaseMessaging";
import { initFirebaseMessaging } from "@/lib/firebase";
import { ChangeTableModal } from "@/components/menu/ChangeTableModal";
import { LocationPermissionModal, type LocationPermissionReason } from "@/components/menu/LocationPermissionModal";
import confetti from "canvas-confetti";
import { buildE164Phone, sanitizeSubscriberDigits, validatePhoneForCountry, getMaxSubscriberDigits } from "@/lib/phoneValidation";
import { Phone10Field } from "@/components/phone/Phone10Field";
interface CheckoutModalProps {
  onClose: () => void;
  onOrderComplete: (order: Order, orderType: "inPerson" | "online") => void;
  onShowSoundPermission: () => void;
}
type OrderType = "inPerson" | "online";
type CheckoutStep = "type" | "details" | "payment" | "confirm";
export function CheckoutModal({
  onClose,
  onOrderComplete,
  onShowSoundPermission
}: CheckoutModalProps) {
  const {
    t
  } = useTranslation();
  const {
    restaurant,
    enabledPaymentMethods,
    canOrderOnline,
    canOrderInPerson,
    setTableNumber,
    formatPrice
  } = useRestaurant();
  const {
    items,
    getTotal,
    clearCart,
    removeItems,
    syncPricesFromLiveMenu,
  } = useCart();
  const {
    getLocation,
    checkDistanceWithCoords,
    getDistanceWithCoords,
    loading: locationLoading
  } = useLocation();
  const {
    addOrder
  } = useOrder();
  const [step, setStep] = useState<CheckoutStep>("type");
  const [orderType, setOrderType] = useState<OrderType | null>(null);

  // Phone is split into two parts: country + 10-digit subscriber number
  const [phoneCountry, setPhoneCountry] = useState<Country>("TR");
  const [phoneSubscriber, setPhoneSubscriber] = useState("");
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: buildE164Phone("TR", ""),
    address: ""
  });
  const [orderNote, setOrderNote] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithinRange, setIsWithinRange] = useState(false);
  const [isChangeTableOpen, setIsChangeTableOpen] = useState(false);
  const [customerLocation, setCustomerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationErrorModal, setLocationErrorModal] = useState<{
    isOpen: boolean;
    message: string;
    errorType: "permission" | "outOfRange" | "tableOutOfRange";
    orderTypeAttempted: OrderType | null;
  }>({
    isOpen: false,
    message: "",
    errorType: "permission",
    orderTypeAttempted: null
  });
  const [locationPermission, setLocationPermission] = useState<{
    isOpen: boolean;
    reason: LocationPermissionReason;
  }>({ isOpen: false, reason: 'online' });

  // Backend 409 PRICE_MISMATCH: a structured list of every cart line
  // (or tag option) whose live price doesn't match what the customer
  // saw at add-time. Rendering this puts the checkout into a
  // "re-confirm" state where we show the differences, refresh prices
  // from the live menu, and let the customer retry the same submit.
  type PriceMismatchItem = {
    itemIndex: number;
    productId: string;
    portionId: string;
    tagItemId: string | null;
    label: string;
    expected: number;
    received: number;
  };
  const [priceMismatch, setPriceMismatch] = useState<PriceMismatchItem[] | null>(null);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);
  const subtotal = getTotal();
  const tableNumber = restaurant.tableNumber;

  // Phone validation
  const isPhoneValid = validatePhoneForCountry(buildE164Phone(phoneCountry, phoneSubscriber), phoneCountry);

  // Calculate discount and final total
  const getDiscountRate = () => {
    if (orderType === "inPerson") return restaurant.tableOrderDiscountRate;
    if (orderType === "online") return restaurant.onlineOrderDiscountRate;
    return 0;
  };
  const discountRate = getDiscountRate();
  const discountAmount = subtotal * discountRate / 100;
  const deliveryFee = orderType === "online" ? restaurant.deliveryFee : 0;
  const coverCharge = orderType === "inPerson" ? (restaurant.coverCharge || 0) : 0;
  const total = subtotal - discountAmount + deliveryFee + coverCharge;
  // Shared geolocation + distance-check logic used by both the
  // "first-time" explainer modal flow and the direct (already-granted) path.
  const proceedWithLocationCheck = async (type: OrderType) => {
    if (type === "online") {
      try {
        const coords = await getLocation();
        setCustomerLocation({ latitude: coords.latitude, longitude: coords.longitude });
        const withinRange = checkDistanceWithCoords(coords.latitude, coords.longitude, restaurant.latitude, restaurant.longitude, restaurant.maxDistance);
        setIsWithinRange(withinRange);
        if (!withinRange) {
          const distance = getDistanceWithCoords(coords.latitude, coords.longitude, restaurant.latitude, restaurant.longitude);
          setLocationErrorModal({
            isOpen: true,
            message: t("order.outOfRange", {
              distance: distance.toFixed(1),
              max: restaurant.maxDistance
            }),
            errorType: "outOfRange",
            orderTypeAttempted: "online"
          });
          return;
        }
        setStep("details");
      } catch (error) {
        setLocationErrorModal({
          isOpen: true,
          message: t("order.locationError"),
          errorType: "permission",
          orderTypeAttempted: "online"
        });
      }
    } else if (type === "inPerson") {
      try {
        const coords = await getLocation();
        setCustomerLocation({ latitude: coords.latitude, longitude: coords.longitude });
        const maxDistanceKm = restaurant.maxTableOrderDistanceMeter / 1000;
        const withinTableRange = checkDistanceWithCoords(coords.latitude, coords.longitude, restaurant.latitude, restaurant.longitude, maxDistanceKm);
        if (!withinTableRange) {
          const distanceKm = getDistanceWithCoords(coords.latitude, coords.longitude, restaurant.latitude, restaurant.longitude);
          const distanceMeters = distanceKm * 1000;
          const maxMeters = restaurant.maxTableOrderDistanceMeter;
          const formatDistance = (meters: number) => {
            if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
            return `${Math.round(meters)} ${t("common.meters")}`;
          };
          setLocationErrorModal({
            isOpen: true,
            message: t("order.tableOrderOutOfRangeDistance", {
              distance: formatDistance(distanceMeters),
              max: formatDistance(maxMeters)
            }),
            errorType: "tableOutOfRange",
            orderTypeAttempted: "inPerson"
          });
          return;
        }
        setStep("details");
      } catch (error) {
        setLocationErrorModal({
          isOpen: true,
          message: t("order.locationError"),
          errorType: "permission",
          orderTypeAttempted: "inPerson"
        });
      }
    }
  };

  const handleSelectOrderType = async (type: OrderType) => {
    setOrderType(type);
    if (type === "online") {
      // Check minimum order amount first
      if (subtotal < restaurant.minOrderAmount) {
        toast.error(
          <Trans
            i18nKey="order.minOrderError"
            values={{ min: formatPrice(restaurant.minOrderAmount) }}
            components={{ br: <br />, b: <b /> }}
          />
        );
        return;
      }
      // If browser already granted location, skip the explainer modal
      if (await isLocationPermissionGranted()) {
        proceedWithLocationCheck(type);
      } else {
        setLocationPermission({ isOpen: true, reason: 'online' });
      }
    } else if (type === "inPerson") {
      if (restaurant.checkTableOrderDistance) {
        if (await isLocationPermissionGranted()) {
          proceedWithLocationCheck(type);
        } else {
          setLocationPermission({ isOpen: true, reason: 'inPerson' });
        }
      } else {
        setStep("details");
      }
    }
  };

  // Called when user taps "Allow" in the custom location-permission modal.
  const handleLocationPermissionAllow = async () => {
    setLocationPermission(prev => ({ ...prev, isOpen: false }));
    if (orderType) {
      await proceedWithLocationCheck(orderType);
    }
  };

  const handleLocationPermissionDeny = () => {
    setLocationPermission(prev => ({ ...prev, isOpen: false }));
  };
  const handleDetailsSubmit = () => {
    if (orderType === "inPerson") {
      // For in-person, skip payment and go to confirm
      setStep("confirm");
    } else {
      if (!customerInfo.name.trim() || !phoneSubscriber.trim() || !customerInfo.address.trim()) {
        toast.error(t("order.fillAllFields"));
        return;
      }
      if (!isPhoneValid) {
        toast.error(t("common.phoneError"));
        return;
      }
      setStep("payment");
    }
  };
  const handlePaymentSelect = (paymentId: string) => {
    setSelectedPaymentMethod(paymentId);
    setStep("confirm");
  };
  const handleBack = () => {
    if (step === "details") {
      setStep("type");
      setOrderType(null);
    } else if (step === "payment") {
      setStep("details");
    } else if (step === "confirm") {
      if (orderType === "inPerson") {
        setStep("details");
      } else {
        setStep("payment");
      }
    }
  };
  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    const selectedPayment = enabledPaymentMethods.find(pm => pm.id === selectedPaymentMethod);
    const orderPayload: OrderPayload = {
      restaurantId: restaurant.restaurantId,
      orderType: orderType!,
      items: items.map(item => {
        const unitPrice = getCartItemDisplayPrice(item, restaurant.isSpecialPriceActive);
        const tagTotal = item.selectedTags.reduce((sum, tag) => sum + tag.price * tag.quantity, 0);
        const itemTotal = (unitPrice + tagTotal) * item.quantity;
        return {
          productId: item.product.id,
          productName: item.product.name,
          portionId: item.portion.id,
          portionName: item.portion.name,
          unitPrice,
          quantity: item.quantity,
          selectedTags: item.selectedTags,
          itemTotal,
          note: item.note || ""
        };
      }),
      totalAmount: total,
      orderNote: orderNote || undefined,
      createdAt: new Date().toISOString(),
      ...(customerLocation ? { customerLocation } : {}),
      ...(orderType === "inPerson" ? {
        tableNumber
      } : {
        customerInfo,
        paymentMethodId: selectedPaymentMethod!,
        paymentMethodName: selectedPayment?.name
      })
    };
    try {
      // Include push token for realtime notifications
      let pushToken = useFirebaseMessagingStore.getState().pushToken;

      if (orderType === "online" && !pushToken && typeof window !== "undefined" && "Notification" in window && Notification.permission !== "denied") {
        try {
          const { token } = await initFirebaseMessaging();
          pushToken = token;
          useFirebaseMessagingStore.getState().setPushToken(token);
        } catch (err) {
          console.warn("[Order] Failed to refresh push token on checkout:", err);
        }
      }

      if (!pushToken) {
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied") {
          toast.warning(
            t(
              "order.notificationsBlocked",
              "Notifications are blocked. Enable them in browser site settings (lock icon in address bar) to receive live order updates."
            )
          );
        }
        console.warn("[Order] No push token available — customerPushToken will be null");
      }

      const payloadWithPush = {
        ...orderPayload,
        customerPushToken: pushToken,
        customerDeviceType: "web",
      };

      // Send order to API
      const res = await createOnlineOrder(payloadWithPush);
      const data = getResponseData(res);
      const orderId = data?.id || data?.Id || `order-${Date.now()}`;

      // Create order with status
      const order: Order = {
        ...orderPayload,
        id: orderId,
        status: "pending"
      };

      // Save order
      addOrder(order);

      // Initialize Firebase push notifications now that the user placed
      // an order — they'll benefit from status updates. We do this lazily
      // instead of on app load so the notification permission prompt
      // doesn't confuse users who are just browsing the menu.
      initializeFirebaseMessaging();

      // Fire confetti!
      confetti({
        particleCount: 150,
        spread: 100,
        origin: {
          y: 0.6
        },
        colors: ["#ff6b35", "#ffa500", "#ffd700", "#32cd32", "#4169e1"]
      });
      clearCart();

      // Show sound permission modal after a short delay (only for online orders)
      if (orderType === "online") {
        setTimeout(() => {
          onShowSoundPermission();
        }, 1000);
      }
      onOrderComplete(order, orderType!);
    } catch (error: any) {
      // 409 PRICE_MISMATCH — quoted prices don't match the live menu.
      // Don't toast; surface a re-confirm UI listing every change.
      if (
        error instanceof ApiError &&
        error.status === 409 &&
        error.data?.data?.code === "PRICE_MISMATCH"
      ) {
        const mismatches = Array.isArray(error.data.data.items) ? error.data.data.items : [];
        setPriceMismatch(mismatches);
        return;
      }
      // 400 with the "products not found / inactive" backend message —
      // the affected items have been deleted or hidden; show a
      // dedicated prompt so the customer can drop them from the cart.
      if (
        error instanceof ApiError &&
        error.status === 400 &&
        typeof error.message === "string" &&
        /bulunamadı|pasif|not\s*found|inactive/i.test(error.message)
      ) {
        setUnavailableMessage(error.message);
        return;
      }
      // Anything else falls through to the generic error toast.
      toast.error(t("order.orderError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  /** "Sepeti yenile ve tekrar dene": re-fetch menu, sync cart prices,
   *  clear the mismatch UI, and re-submit the same order. */
  const handlePriceMismatchRetry = async () => {
    setIsSubmitting(true);
    try {
      await refreshRestaurantData();
      syncPricesFromLiveMenu();
      setPriceMismatch(null);
      // Wait one tick so the cart's new state is observable before
      // building the next payload.
      await new Promise((r) => setTimeout(r, 0));
      await handleConfirmOrder();
    } finally {
      setIsSubmitting(false);
    }
  };

  /** "Vazgeç": leave the cart untouched, close the checkout modal so
   *  the customer can decide later. */
  const handlePriceMismatchCancel = () => {
    setPriceMismatch(null);
    onClose();
  };

  /** Remove every cart line that the backend flagged as deleted/
   *  inactive, then close — the customer can re-checkout when ready. */
  const handleUnavailableAcknowledge = () => {
    // We don't get a structured list for 400; the safest action is to
    // refresh the menu so the cart drops stale rows, then keep what's
    // still valid in the cart for the customer to review.
    refreshRestaurantData().finally(() => {
      const liveProducts = useRestaurantStore.getState().restaurantData.products;
      const removeIds = items
        .filter((it) => {
          const live = liveProducts.find((p) => p.id === it.product.id);
          if (!live) return true; // product gone
          const livePortion = live.portions.find((p) => p.id === it.portion.id);
          return !livePortion; // portion gone
        })
        .map((it) => it.id);
      if (removeIds.length > 0) removeItems(removeIds);
      setUnavailableMessage(null);
      onClose();
    });
  };
  const handleTableChange = (newTableNumber: string) => {
    setTableNumber(newTableNumber);
  };
  const showBackButton = step !== "type";
  return <>
      <div onClick={onClose} className="fixed inset-0 z-50 bg-foreground/60" style={{
      WebkitBackdropFilter: 'blur(4px)',
      backdropFilter: 'blur(4px)'
    }} />
      <motion.div initial={{
      opacity: 0,
      y: "100%"
    }} animate={{
      opacity: 1,
      y: 0
    }} exit={{
      opacity: 0,
      y: "100%"
    }} transition={{
      type: "spring",
      damping: 25,
      stiffness: 300
    }} className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto bg-card rounded-t-3xl" style={{
      WebkitOverflowScrolling: 'touch'
    }}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-card border-b border-border">
          <div className="flex items-center gap-3">
            {showBackButton && <button onClick={handleBack} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <ArrowLeft className="w-5 h-5" />
              </button>}
            <h2 className="text-xl font-bold">{t("order.placeOrder")}</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Step: Order Type */}
          {step === "type" && <motion.div initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">{t("order.selectType")}</h3>

              {canOrderInPerson && <button onClick={() => {
                  if (!tableNumber) {
                    setIsChangeTableOpen(true);
                    return;
                  }
                  handleSelectOrderType("inPerson");
                }} className="w-full flex items-center gap-4 p-5 bg-secondary rounded-2xl hover:bg-secondary/80 transition-colors">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    {locationLoading && orderType === "inPerson" ? <Loader2 className="w-7 h-7 text-primary animate-spin" /> : <Bell className="w-7 h-7 text-primary" />}
                  </div>
                  <div className="text-left flex-1">
                    <h4 className="font-semibold text-lg">{t("order.inPerson")}</h4>
                    <p className="text-sm text-muted-foreground">{t("order.inPersonDesc")}</p>
                  </div>
                </button>}

              {canOrderOnline && <div className="space-y-2">
                  {/* Minimum Order Warning for Online Orders */}
                  {subtotal < restaurant.minOrderAmount && <div className="flex items-center justify-between gap-2 p-3 bg-destructive/10 dark:bg-white rounded-xl text-sm">
                      <span className="text-destructive font-medium min-w-0 break-words text-xs leading-snug">
                        {t('order.minOrderProgress', {
                  remaining: formatPrice(restaurant.minOrderAmount - subtotal)
                })}
                      </span>
                      <div className="text-right shrink-0 min-w-0">
                        <span className="text-xs text-muted-foreground dark:text-gray-500 block">{t('order.minOrderLabel')}</span>
                        <span className="text-muted-foreground dark:text-gray-700 whitespace-nowrap truncate block">{formatPrice(restaurant.minOrderAmount)}</span>
                      </div>
                    </div>}
                  <button onClick={() => handleSelectOrderType("online")} disabled={locationLoading} className="w-full flex items-center gap-4 p-5 bg-secondary rounded-2xl hover:bg-secondary/80 transition-colors disabled:opacity-50">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      {locationLoading && orderType === "online" ? <Loader2 className="w-7 h-7 text-primary animate-spin" /> : <Home className="w-7 h-7 text-primary" />}
                    </div>
                    <div className="text-left flex-1">
                      <h4 className="font-semibold text-lg">{t("order.online")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("order.onlineDesc", {
                    distance: restaurant.maxDistance
                  })}
                      </p>
                    </div>
                  </button>
                </div>}

              {!canOrderInPerson && !canOrderOnline && <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-xl">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{t("order.noOrdersAvailable")}</p>
                </div>}
            </motion.div>}

          {/* Step: Details */}
          {step === "details" && <motion.div initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">
                {orderType === "inPerson" ? t("order.orderInfo") : t("order.deliveryInfo")}
              </h3>

              {orderType === "inPerson" ? <div className="space-y-4">
                  {/* Show table number from restaurant data */}
                  <div className="flex items-center gap-4 p-5 bg-secondary rounded-2xl">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Bell className="w-7 h-7 text-primary" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm text-muted-foreground">{t("order.tableNumber")}</p>
                      <p className="text-2xl font-bold">{tableNumber}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                      <span className="text-sm text-primary font-black">{t("order.isTableNumberChange")}</span>
                      <button onClick={() => setIsChangeTableOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors">
                        <QrCode className="w-4 h-4" />
                        <span className="text-sm font-medium">{t("order.change")}</span>
                      </button>
                    </div>
                  </div>
                </div> : <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">{t("order.fullName")}</Label>
                    <div className="relative mt-2">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input id="name" placeholder={t("order.fullNamePlaceholder")} value={customerInfo.name} onChange={e => setCustomerInfo(prev => ({
                  ...prev,
                  name: e.target.value
                }))} className="h-14 pl-12 rounded-xl" />
                    </div>
                  </div>
                    <div>
                      <Label htmlFor="phone">{t("order.phone")}</Label>
                      <div className="mt-2">
                          <Phone10Field value={{
                    country: phoneCountry,
                    subscriber: phoneSubscriber
                  }} onChange={next => {
                    const subscriber = sanitizeSubscriberDigits(next.subscriber, getMaxSubscriberDigits(next.country));
                    setPhoneCountry(next.country);
                    setPhoneSubscriber(subscriber);
                    setCustomerInfo(prev => ({
                      ...prev,
                      phone: buildE164Phone(next.country, subscriber)
                    }));
                  }} subscriberPlaceholder="XXXXXXXXXX" />
                      </div>
                    </div>
                  <div>
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {t("order.deliveryAddress")}
                    </Label>
                    <div className="mt-2">
                      <textarea id="address" placeholder={t("order.addressPlaceholder")} value={customerInfo.address} onChange={e => setCustomerInfo(prev => ({
                  ...prev,
                  address: e.target.value
                }))} className="w-full min-h-[100px] p-4 rounded-xl bg-secondary border-0 resize-none" />
                    </div>
                  </div>
                </div>}

              {/* Order Note */}
              <div>
                <Label htmlFor="orderNote" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t("order.orderNote")} ({t("common.optional")})
                </Label>
                <Textarea id="orderNote" placeholder={t("order.orderNotePlaceholder")} value={orderNote} onChange={e => setOrderNote(e.target.value)} className="mt-2 rounded-xl resize-none" rows={3} />
              </div>

              <Button onClick={handleDetailsSubmit} size="lg" className="w-full h-14 text-base font-semibold rounded-2xl mt-4">
                {t("common.continue")}
              </Button>
            </motion.div>}

          {/* Step: Payment */}
          {step === "payment" && <motion.div initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">{t("order.paymentMethod")}</h3>

              <div className="space-y-3">
                {enabledPaymentMethods.map(method => <button key={method.id} onClick={() => handlePaymentSelect(method.id)} className={cn("w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all", selectedPaymentMethod === method.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                      {method.name.includes("Nakit") ? <Banknote className="w-6 h-6 text-primary" /> : <CreditCard className="w-6 h-6 text-primary" />}
                    </div>
                    <span className="font-medium flex-1 text-left">{method.name}</span>
                    {selectedPaymentMethod === method.id && <Check className="w-5 h-5 text-primary" />}
                  </button>)}
              </div>
            </motion.div>}

          {/* Step: Confirm */}
          {step === "confirm" && <motion.div initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">{t("order.orderSummary")}</h3>

              {/* Order Summary — off-white bg with dark text in both modes for maximum readability */}
              <div className="bg-stone-100 rounded-2xl p-4 space-y-3 text-stone-800 [&_.text-muted-foreground]:text-stone-600 [&_.text-primary]:text-stone-900">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {orderType === "inPerson" ? <>
                      <Bell className="w-4 h-4" />
                      <span>
                        {t("common.table")} {tableNumber} - {t("order.tableOrder")}
                      </span>
                    </> : <>
                      <Home className="w-4 h-4" />
                      <span>{t("order.onlineDelivery")}</span>
                    </>}
                </div>

                <div className="border-t border-border pt-3 space-y-3">
                  {items.map(item => {
                const unitPrice = getCartItemDisplayPrice(item, restaurant.isSpecialPriceActive);
                const tagTotal = item.selectedTags.reduce((sum, tag) => sum + tag.price * tag.quantity, 0);
                const itemTotal = (unitPrice + tagTotal) * item.quantity;
                return <div key={item.id} className="space-y-1">
                        <div className="flex justify-between gap-2 text-sm">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">
                              {item.quantity}x {item.product.name}
                            </span>
                            {item.portion.name?.trim().toLowerCase() !== "normal" && (
                              <span className="text-muted-foreground ml-1">({item.portion.name})</span>
                            )}
                          </div>
                          <span className="font-medium whitespace-nowrap truncate min-w-0 shrink-0">{formatPrice(unitPrice * item.quantity)}</span>
                        </div>

                        {/* Order Tags */}
                        {item.selectedTags.length > 0 && <div className="ml-4 space-y-0.5">
                            {item.selectedTags.map((tag, idx) => <div key={idx} className="flex justify-between gap-2 text-xs text-muted-foreground">
                                <span className="min-w-0 break-words">
                                  + {tag.itemName} {tag.quantity > 1 ? `x${tag.quantity}` : ""}
                                </span>
                                {tag.price > 0 && <span className="whitespace-nowrap truncate min-w-0 shrink-0">{formatPrice(tag.price * tag.quantity * item.quantity)}</span>}
                              </div>)}
                          </div>}

                        {/* Item Note */}
                        {item.note && <p className="text-xs text-muted-foreground italic ml-4">
                            {t("orderReceipt.note")}: {item.note}
                          </p>}
                      </div>;
              })}
                </div>

                {orderNote && <div className="border-t border-border pt-3">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">{t("orderReceipt.orderNote")}:</span> {orderNote}
                    </p>
                  </div>}

                {/* Price Breakdown */}
                <div className="border-t border-border pt-3 space-y-2">
                  {/* Subtotal */}
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="text-muted-foreground shrink-0">{t("order.subtotal")}</span>
                    <span className="whitespace-nowrap truncate min-w-0">{formatPrice(subtotal)}</span>
                  </div>

                  {/* Discount */}
                  {discountRate > 0 && <div className="flex justify-between gap-2 text-sm text-success dark:text-green-400">
                      <span className="min-w-0 break-words">
                        {orderType === "inPerson" ? t("order.tableDiscount") : t("order.onlineDiscount")} (
                        {discountRate}%)
                      </span>
                      <span className="whitespace-nowrap truncate min-w-0 shrink-0">-{formatPrice(discountAmount)}</span>
                    </div>}

                  {/* Delivery Fee */}
                  {orderType === "online" && deliveryFee > 0 && <div className="flex justify-between gap-2 text-sm">
                      <span className="text-muted-foreground shrink-0">{t("order.deliveryFee")}</span>
                      <span className="whitespace-nowrap truncate min-w-0">{formatPrice(deliveryFee)}</span>
                    </div>}

                  {/* Cover Charge */}
                  {orderType === "inPerson" && coverCharge > 0 && <div className="flex justify-between gap-2 text-sm">
                      <span className="text-muted-foreground shrink-0">{t("order.coverCharge")}</span>
                      <span className="whitespace-nowrap truncate min-w-0">{formatPrice(coverCharge)}</span>
                    </div>}

                  {/* Total */}
                  <div className="flex justify-between gap-2 font-bold text-lg pt-2 border-t border-border">
                    <span className="shrink-0">{t("common.total")}</span>
                    <span className="text-primary whitespace-nowrap truncate min-w-0">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>

              {/* Confirm Button */}
              <Button onClick={handleConfirmOrder} disabled={isSubmitting} size="lg" className="w-full h-14 text-base font-semibold rounded-2xl shadow-glow">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {t("order.confirmOrder")}
              </Button>
            </motion.div>}
        </div>
      </motion.div>

      {/* Change Table Modal */}
      <ChangeTableModal isOpen={isChangeTableOpen} onClose={() => setIsChangeTableOpen(false)} onTableChange={handleTableChange} currentTable={tableNumber} />

      {/* Location Error Modal */}
      <AnimatePresence>
        {locationErrorModal.isOpen && <>
            <div className="fixed inset-0 z-[60] bg-foreground/60" onClick={() => setLocationErrorModal({
          isOpen: false,
          message: "",
          errorType: "permission",
          orderTypeAttempted: null
        })} style={{
          WebkitBackdropFilter: "blur(4px)",
          backdropFilter: "blur(4px)"
        }} />
            <motion.div initial={{
          opacity: 0,
          scale: 0.9
        }} animate={{
          opacity: 1,
          scale: 1
        }} exit={{
          opacity: 0,
          scale: 0.9
        }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-card rounded-2xl p-6 shadow-xl w-full max-w-sm pointer-events-auto">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-destructive" />
                  </div>
                  <h3 className="text-lg font-bold">{t("order.locationErrorTitle")}</h3>
                  <p className="text-primary">{locationErrorModal.message}</p>
                  
                  {/* Location Permission Guide - only show for permission errors */}
                  {locationErrorModal.errorType === "permission" && <div className="w-full p-4 bg-secondary rounded-xl text-left space-y-2">
                      <p className="text-sm font-semibold">{t("order.locationPermissionGuide")}</p>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        <li>{t("order.locationPermissionStep1")}</li>
                        <li>{t("order.locationPermissionStep2")}</li>
                        <li>{t("order.locationPermissionStep3")}</li>
                      </ul>
                    </div>}
                  
                  <div className="w-full flex flex-col gap-2">
                    {/* Retry button — goes straight to browser geolocation (skip the explainer modal) */}
                    <Button onClick={() => {
                  setLocationErrorModal({
                    isOpen: false,
                    message: "",
                    errorType: "permission",
                    orderTypeAttempted: null
                  });
                  // User already understands why location is needed (they're
                  // retrying), so call the geolocation flow directly.
                  handleLocationPermissionAllow();
                }} className="w-full h-12 rounded-xl">
                      {t("order.retryLocation")}
                    </Button>
                    {/* Close button */}
                    <Button variant="outline" onClick={() => setLocationErrorModal({
                  isOpen: false,
                  message: "",
                  errorType: "permission",
                  orderTypeAttempted: null
                })} className="w-full h-12 rounded-xl">
                      {t("common.close")}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>}
      </AnimatePresence>
      <LocationPermissionModal
        isOpen={locationPermission.isOpen}
        reason={locationPermission.reason}
        onAllow={handleLocationPermissionAllow}
        onDeny={handleLocationPermissionDeny}
      />

      {/* Price-mismatch (409) re-confirm modal */}
      <AnimatePresence>
        {priceMismatch && (
          <>
            <div
              className="fixed inset-0 z-[70] bg-foreground/60"
              onClick={handlePriceMismatchCancel}
              style={{ WebkitBackdropFilter: "blur(4px)", backdropFilter: "blur(4px)" }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-card rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col pointer-events-auto">
                <div className="px-6 pt-6 pb-4 text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/15 flex items-center justify-center mb-3">
                    <AlertCircle className="w-7 h-7 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-bold">{t("priceLock.title")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("priceLock.subtitle")}
                  </p>
                </div>
                <div className="px-6 overflow-y-auto flex-1">
                  <ul className="space-y-2 mb-4">
                    {priceMismatch.map((m, idx) => {
                      const dir = m.expected > m.received ? "up" : "down";
                      return (
                        <li
                          key={`${m.itemIndex}-${m.tagItemId ?? "portion"}-${idx}`}
                          className="flex items-start justify-between gap-3 p-3 rounded-xl bg-secondary"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium break-words">{m.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              <span className="line-through opacity-70">
                                {formatPrice(m.received)}
                              </span>
                              {"  →  "}
                              <span
                                className={cn(
                                  "font-semibold",
                                  dir === "up" ? "text-destructive" : "text-success",
                                )}
                              >
                                {formatPrice(m.expected)}
                              </span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="px-6 pb-6 pt-2 space-y-2 border-t border-border">
                  <Button
                    onClick={handlePriceMismatchRetry}
                    disabled={isSubmitting}
                    size="lg"
                    className="w-full h-12 text-base font-semibold rounded-xl"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    {t("priceLock.refreshAndRetry")}
                  </Button>
                  <Button
                    onClick={handlePriceMismatchCancel}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 text-base rounded-xl"
                  >
                    {t("priceLock.cancel")}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Item-unavailable (400 product not found / inactive) modal */}
      <AnimatePresence>
        {unavailableMessage && (
          <>
            <div
              className="fixed inset-0 z-[70] bg-foreground/60"
              onClick={() => setUnavailableMessage(null)}
              style={{ WebkitBackdropFilter: "blur(4px)", backdropFilter: "blur(4px)" }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-card rounded-2xl shadow-xl w-full max-w-md pointer-events-auto p-6">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-destructive" />
                  </div>
                  <h3 className="text-lg font-bold">{t("priceLock.unavailableTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{unavailableMessage}</p>
                  <Button
                    onClick={handleUnavailableAcknowledge}
                    size="lg"
                    className="w-full h-12 text-base font-semibold rounded-xl mt-2"
                  >
                    {t("priceLock.removeAndContinue")}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>;
}