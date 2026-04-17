import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  ChefHat,
  Package,
  Truck,
  XCircle,
  Bell,
  Home,
  Receipt,
  MapPin,
  Phone,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Order } from "@/types/restaurant";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useOrder } from "@/hooks/useOrder";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tr, enUS } from "date-fns/locale";
import i18n from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { CallWaiterModal } from "./CallWaiterModal";

interface OrderReceiptProps {
  orderId: string;
  onBack: () => void;
  waiterCooldown: number;
  onWaiterSuccess: () => void;
}

const getStatusConfig = (
  t: (key: string) => string
): Record<Order["status"], { label: string; icon: React.ReactNode; color: string }> => ({
  pending: { label: t("status.pending"), icon: <Clock className="w-5 h-5" />, color: "text-amber-500" },
  confirmed: { label: t("status.confirmed"), icon: <CheckCircle2 className="w-5 h-5" />, color: "text-primary" },
  preparing: { label: t("status.preparing"), icon: <ChefHat className="w-5 h-5" />, color: "text-blue-500" },
  ready: { label: t("status.ready"), icon: <Package className="w-5 h-5" />, color: "text-green-500" },
  delivered: { label: t("status.delivered"), icon: <Truck className="w-5 h-5" />, color: "text-green-600" },
  cancelled: { label: t("status.cancelled"), icon: <XCircle className="w-5 h-5" />, color: "text-destructive" },
});

const statusSteps: Order["status"][] = ["pending", "confirmed", "preparing", "ready", "delivered"];

// Zigzag status component with ref-based SVG lines
function StatusZigzag({
  statusSteps: steps,
  statusConfig,
  currentStepIndex,
}: {
  statusSteps: Order["status"][];
  statusConfig: Record<Order["status"], { label: string; icon: React.ReactNode; color: string }>;
  currentStepIndex: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const circleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  const zigzagOrder = [0, 1, 2, 3, 4];

  const updateLines = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < zigzagOrder.length - 1; i++) {
      const fromEl = circleRefs.current[zigzagOrder[i]];
      const toEl = circleRefs.current[zigzagOrder[i + 1]];
      if (fromEl && toEl) {
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        newLines.push({
          x1: fromRect.left + fromRect.width / 2 - rect.left,
          y1: fromRect.top + fromRect.height / 2 - rect.top,
          x2: toRect.left + toRect.width / 2 - rect.left,
          y2: toRect.top + toRect.height / 2 - rect.top,
        });
      }
    }
    setLines(newLines);
  }, []);

  useEffect(() => {
    // Small delay to ensure layout is complete
    const timer = setTimeout(updateLines, 50);
    window.addEventListener("resize", updateLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateLines);
    };
  }, [updateLines]);

  const setCircleRef = (stepIndex: number) => (el: HTMLDivElement | null) => {
    circleRefs.current[stepIndex] = el;
  };

  const renderStep = (step: Order["status"], stepIndex: number) => {
    const isActive = stepIndex <= currentStepIndex;
    const isCurrent = stepIndex === currentStepIndex;
    const config = statusConfig[step];
    return (
      <div key={step} className="flex flex-col items-center">
        <div
          ref={setCircleRef(stepIndex)}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
            isCurrent && "ring-4 ring-primary/20",
          )}
        >
          {config.icon}
        </div>
        <span className={cn("text-xs mt-2 text-center leading-tight", isActive ? "text-foreground font-medium" : "text-muted-foreground")}>
          {config.label}
        </span>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        {lines.map((line, i) => (
          <line key={i} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} className={cn(i < currentStepIndex ? "stroke-primary" : "stroke-secondary")} strokeWidth="3" />
        ))}
      </svg>
      {/* Row 1: Pending(0), Preparing(2), Delivered(4) */}
      <div className="relative grid grid-cols-3 z-10">
        {renderStep(steps[0], 0)}
        {renderStep(steps[2], 2)}
        {renderStep(steps[4], 4)}
      </div>
      {/* Row 2: Confirmed(1), Ready(3) */}
      <div className="relative grid grid-cols-2 z-10 mt-4 px-[16.67%]">
        {renderStep(steps[1], 1)}
        {renderStep(steps[3], 3)}
      </div>
    </div>
  );
}

export function OrderReceipt({ orderId, onBack, waiterCooldown, onWaiterSuccess }: OrderReceiptProps) {
  const { t } = useTranslation();
  const { restaurant, formatPrice, isCurrentlyOpen } = useRestaurant();
  const [showCallWaiterModal, setShowCallWaiterModal] = useState(false);
  
  // Subscribe to live order from Zustand store
  const order = useOrder((state) => state.orders.find((o) => o.id === orderId));
  
  const statusConfig = getStatusConfig(t);
  
  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("errors.loadFailed")}</p>
      </div>
    );
  }
  
  const status = statusConfig[order.status];
  const currentStepIndex = statusSteps.indexOf(order.status);
  const isCancelled = order.status === "cancelled";
  const dateLocale = i18n.language === "tr" ? tr : enUS;

  // Calculate discount rate
  const getDiscountRate = () => {
    if (order.orderType === "inPerson") return restaurant.tableOrderDiscountRate || 0;
    if (order.orderType === "online") return restaurant.onlineOrderDiscountRate || 0;
    return 0;
  };

  const discountRate = getDiscountRate();
  
  // Service fees
  const deliveryFee = order.orderType === "online" ? (restaurant.deliveryFee || 0) : 0;
  const coverCharge = order.orderType === "inPerson" ? (restaurant.coverCharge || 0) : 0;
  const serviceFee = deliveryFee + coverCharge;
  
  // order.totalAmount is the final amount after discount + service fees
  // We need to reverse-calculate the original subtotal (before discount and service fees)
  const calculateSubtotal = () => {
    const amountWithoutServiceFee = order.totalAmount - serviceFee;
    if (discountRate > 0) {
      return amountWithoutServiceFee / (1 - discountRate / 100);
    }
    return amountWithoutServiceFee;
  };
  
  const subtotal = calculateSubtotal();
  const discountAmount = subtotal * (discountRate / 100);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container px-4 py-4 flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-bold">{t("orderReceipt.title")}</h1>
        </div>
      </div>

      <div className="container px-4 py-6 space-y-6 pb-24">
        {/* Receipt Card */}
        <div className="bg-card rounded-3xl shadow-elegant overflow-hidden">
          {/* Receipt Header */}
          <div className="bg-primary/5 p-6 text-center border-b border-dashed border-border">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold">{restaurant.name}</h2>
            <p className="text-muted-foreground text-sm mt-1">{restaurant.address}</p>
            <p className="text-muted-foreground text-sm">{restaurant.phoneNumber}</p>
          </div>

          {/* Order Info */}
          <div className="p-6 border-b border-dashed border-border">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground text-sm">{t("orderReceipt.orderNo")}</span>
              <span className="font-mono font-semibold">#{order.id.slice(-8).toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground text-sm">{t("orderReceipt.date")}</span>
              <span className="font-medium">
                {format(new Date(order.createdAt), "dd MMM yyyy, HH:mm", { locale: dateLocale })}
              </span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground text-sm">{t("orderReceipt.orderType")}</span>
              <div className="flex items-center gap-2">
                {order.orderType === "inPerson" ? (
                  <>
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="font-medium">{t("order.inPerson")}</span>
                  </>
                ) : (
                  <>
                    <Home className="w-4 h-4 text-primary" />
                    <span className="font-medium">{t("order.onlineDelivery")}</span>
                  </>
                )}
              </div>
            </div>

            {order.orderType === "inPerson" && order.tableNumber && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t("common.table")}</span>
                <span className="font-medium">{order.tableNumber}</span>
              </div>
            )}
          </div>

          {/* Order Status */}
          <div className="p-6 border-b border-dashed border-border">
            <h3 className="font-semibold mb-4">{t("orderReceipt.orderStatus")}</h3>

            {isCancelled ? (
              <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-xl">
                <XCircle className="w-6 h-6 text-destructive" />
                <span className="font-medium text-destructive">{t("orderReceipt.orderCancelled")}</span>
              </div>
            ) : (
              <StatusZigzag statusSteps={statusSteps} statusConfig={statusConfig} currentStepIndex={currentStepIndex} />
            )}
          </div>

          {/* Customer Info (for online orders) */}
          {order.orderType === "online" && order.customerInfo && (
            <div className="p-6 border-b border-dashed border-border">
              <h3 className="font-semibold mb-4">{t("orderReceipt.deliveryDetails")}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <span>{order.customerInfo.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <span>{order.customerInfo.phone}</span>
                </div>
                {order.customerInfo.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span>{order.customerInfo.address}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="p-6 border-b border-dashed border-border">
            <h3 className="font-semibold mb-4">{t("orderReceipt.orderDetails")}</h3>
            <div className="border-t border-border pt-3 space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <div className="flex-1">
                      <span className="font-medium">
                        {item.quantity}x {item.productName}
                      </span>
                      <span className="text-muted-foreground ml-1">({item.portionName})</span>
                    </div>
                    <span className="font-medium">{formatPrice(item.itemTotal)}</span>
                  </div>

                  {/* Order Tags */}
                  {item.selectedTags.length > 0 && (
                    <div className="ml-4 space-y-0.5">
                      {item.selectedTags.map((tag, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            + {tag.itemName} {tag.quantity > 1 ? `x${tag.quantity}` : ""}
                          </span>
                          {tag.price > 0 && <span>{formatPrice(tag.price * tag.quantity * item.quantity)}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Item Note */}
                  {item.note && (
                    <p className="text-xs text-muted-foreground italic mt-1">
                      {t("orderReceipt.note")}: {item.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Order Note */}
          {order.orderNote && (
            <div className="p-6 border-b border-dashed border-border">
              <h3 className="font-semibold mb-2">{t("orderReceipt.orderNote")}</h3>
              <p className="text-muted-foreground">{order.orderNote}</p>
            </div>
          )}

          {/* Payment */}
          {order.paymentMethodName && (
            <div className="p-6 border-b border-dashed border-border">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("orderReceipt.paymentMethod")}</span>
                <span className="font-medium">{order.paymentMethodName}</span>
              </div>
            </div>
          )}

          {/* Service Fee - Delivery or Cover Charge */}
          {serviceFee > 0 && (
            <div className="px-6 py-2 text-base border-b border-dashed border-border">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {order.orderType === "online" ? t("order.deliveryFee") : t("order.coverCharge")}
                </span>
                <span className="font-medium">{formatPrice(serviceFee)}</span>
              </div>
            </div>
          )}

          {/* Subtotal (with service fee included) */}
          {(discountRate > 0 || serviceFee > 0) && (
            <div className="px-6 py-2 text-base border-b border-dashed border-border">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("common.subtotal")}</span>
                <span className="font-medium">{formatPrice(subtotal + serviceFee)}</span>
              </div>
            </div>
          )}

          {/* Discount */}
          {discountRate > 0 && (
            <div className="px-6 py-2 text-base border-b border-dashed border-border">
              <div className="flex items-center justify-between">
                <span className="font-bold">
                  {order.orderType === "inPerson" ? t("order.tableDiscount") : t("order.onlineDiscount")} (
                  {discountRate}%)
                </span>
                <span className="font-bold text-success">-{formatPrice(discountAmount)}</span>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="p-6 py-3 bg-primary/5">
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold">{t("common.total")}</span>
              <span className="text-2xl font-bold text-primary">{formatPrice(order.totalAmount)}</span>
            </div>
          </div>

          {/* Receipt Footer Pattern */}
          <div
            className="h-4 bg-card"
            style={{
              backgroundImage: "radial-gradient(circle, hsl(var(--border)) 2px, transparent 2px)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 8px",
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={onBack}
            className="w-full h-12 rounded-xl gap-2 bg-green-500 hover:bg-green-600 text-white"
          >
            <UtensilsCrossed className="w-5 h-5" />
            {t("orderReceipt.backToMenu")}
          </Button>

          {order.orderType === "inPerson" && (
            <Button
              onClick={() => setShowCallWaiterModal(true)}
              disabled={waiterCooldown > 0 || !isCurrentlyOpen}
              className={`w-full h-12 rounded-xl gap-2 ${
                waiterCooldown > 0 || !isCurrentlyOpen ? "bg-muted text-muted-foreground" : ""
              }`}
            >
              <Bell className="w-5 h-5" />
              {!isCurrentlyOpen 
                ? t("common.closedHours")
                : waiterCooldown > 0 
                  ? `${t("common.callWaiter")} (${waiterCooldown}s)` 
                  : t("common.callWaiter")}
            </Button>
          )}
        </div>
      </div>

      {/* Call Waiter Modal */}
      <CallWaiterModal
        isOpen={showCallWaiterModal}
        onClose={() => setShowCallWaiterModal(false)}
        onSuccess={onWaiterSuccess}
      />
    </motion.div>
  );
}
