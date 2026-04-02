import { useEffect } from "react";

/**
 * Locks body scroll when any overlay/modal is open.
 * Uses overflow:hidden to prevent background scrolling.
 * Scroll position is preserved naturally (no repositioning).
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isLocked]);
}
