/**
 * IdleCountdownModal — Shows a 10-second countdown warning before
 * the kiosk enters screensaver mode. Displayed in the user's
 * currently-selected language via i18n.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

interface IdleCountdownModalProps {
  isOpen: boolean;
  countdown: number;
  onCancel: () => void;
}

const TAU = 2 * Math.PI * 45; // circumference of the SVG circle

export function IdleCountdownModal({
  isOpen,
  countdown,
  onCancel,
}: IdleCountdownModalProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="idle-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="kiosk-idle-backdrop"
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            key="idle-modal"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="kiosk-idle-modal"
            onClick={onCancel}
          >
            <div
              className="kiosk-idle-card"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Warning icon */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsla(var(--destructive),0.12)] flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-[hsl(var(--destructive))]" />
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-[hsl(var(--foreground))] mb-2">
                {t("kiosk.idleWarningTitle", "Hala burada misiniz?")}
              </h2>

              {/* Message */}
              <p className="text-[hsl(var(--muted-foreground))] text-sm mb-6 leading-relaxed">
                {t("kiosk.idleWarningMessage", "{{seconds}} saniye icinde islem yapilmazsa siparis iptal edilecek.", { seconds: countdown })}
              </p>

              {/* Circular countdown */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <svg
                  className="w-full h-full -rotate-90"
                  viewBox="0 0 100 100"
                >
                  {/* Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="6"
                  />
                  {/* Progress */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="hsl(var(--destructive))"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={TAU}
                    strokeDashoffset={TAU * (1 - countdown / 10)}
                    className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-[hsl(var(--destructive))]">
                  {countdown}
                </span>
              </div>

              {/* Continue button */}
              <button
                onClick={onCancel}
                className="w-full py-3.5 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-semibold text-lg shadow-[var(--shadow-glow)] hover:opacity-90 transition-opacity"
              >
                {t("kiosk.continueOrder", "Devam Et")}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
