/**
 * useKioskIdle — Idle detection hook for kiosk screensaver.
 *
 * After IDLE_TIMEOUT_MS (50 s) of no user interaction the state
 * transitions to "countdown". A 10-second countdown is shown; if it
 * reaches zero the state becomes "screensaver". Calling wake() from
 * any state resets everything back to "active".
 */

import { useState, useEffect, useCallback, useRef } from "react";

const IDLE_TIMEOUT_MS = 50_000; // 50 seconds
const COUNTDOWN_SECONDS = 10;

export type KioskIdleState = "active" | "countdown" | "screensaver";

export function useKioskIdle() {
  const [idleState, setIdleState] = useState<KioskIdleState>("active");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- helpers ---- */

  const clearAllTimers = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
  }, []);

  const scheduleIdleTimeout = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdleState("countdown"), IDLE_TIMEOUT_MS);
  }, []);

  /* ---- wake (public) ---- */

  const wake = useCallback(() => {
    clearAllTimers();
    setIdleState("active");
    setCountdown(COUNTDOWN_SECONDS);
    scheduleIdleTimeout();
  }, [clearAllTimers, scheduleIdleTimeout]);

  /* ---- countdown ticker ---- */

  useEffect(() => {
    if (idleState !== "countdown") return;

    setCountdown(COUNTDOWN_SECONDS);

    countdownInterval.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownInterval.current) clearInterval(countdownInterval.current);
          setIdleState("screensaver");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
      }
    };
  }, [idleState]);

  /* ---- user-activity listener (resets timer when "active") ---- */

  useEffect(() => {
    const EVENTS = [
      "mousedown",
      "mousemove",
      "touchstart",
      "touchmove",
      "keydown",
      "scroll",
      "wheel",
    ];

    const handleActivity = () => {
      if (idleState === "active") {
        scheduleIdleTimeout();
      }
    };

    EVENTS.forEach((e) =>
      window.addEventListener(e, handleActivity, { passive: true, capture: true }),
    );

    // Kick off the first idle timer when we enter "active"
    if (idleState === "active") {
      scheduleIdleTimeout();
    }

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, handleActivity, true));
    };
  }, [idleState, scheduleIdleTimeout]);

  /* ---- cleanup ---- */

  useEffect(() => clearAllTimers, [clearAllTimers]);

  return { idleState, countdown, wake } as const;
}
