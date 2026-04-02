import { useEffect, useRef } from "react";

/**
 * Locks body scroll when any overlay/modal is open.
 * Uses overflow:hidden + scrollbar compensation to avoid layout shift.
 * Does NOT reposition the page — scroll position is preserved naturally.
 */
export function useBodyScrollLock(isLocked: boolean) {
  const scrollBarWidth = useRef(0);

  useEffect(() => {
    if (isLocked) {
      scrollBarWidth.current = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollBarWidth.current}px`;
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
