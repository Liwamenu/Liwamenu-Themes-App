import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// useGoogleAnalytics — inject the restaurant's own GA4 gtag.js into the
// customer menu page and track SPA route changes.
//
// WHY HERE (not the admin panel): the admin panel only lets the owner
// ENTER their Measurement ID (saved on the restaurant entity, shipped
// on the public DTO as `googleAnalytics`). Google's gtag.js must run on
// the page the diner actually loads — this themes app — so the tag is
// injected here, using THAT restaurant's id, never a hard-coded one.
//
// Call once from the menu render root (Index.tsx) with
// restaurant.googleAnalytics. It is a no-op until a valid id arrives,
// so it's safe to call before the restaurant query resolves.

// GA4 Measurement IDs look like "G-XXXXXXXXXX". Reject anything else so
// a typo in the admin field can't inject a broken / foreign tag.
const GA_ID_RE = /^G-[A-Z0-9]+$/i;

// Module-level guard: which id we've already injected this page load.
// Survives component re-renders / unmounts (e.g. route changes that
// remount Index) so we never inject the gtag.js pair twice.
let injectedId: string | null = null;

function injectGtag(id: string) {
  if (injectedId === id) return; // already live for this id
  if (injectedId && injectedId !== id) {
    // A different restaurant loaded in the same tab (rare — preview /
    // tenant switch without a full reload). GA doesn't support cleanly
    // swapping the primary tag at runtime; the simplest correct
    // behaviour is "first restaurant per page load wins". Log and skip.
    // eslint-disable-next-line no-console
    console.warn(
      "[GA] A different Measurement ID was requested after one was " +
        "already injected; ignoring to avoid a double tag. Reload to " +
        "switch.",
      { current: injectedId, requested: id },
    );
    return;
  }

  // 1) the async loader
  const loader = document.createElement("script");
  loader.async = true;
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    id,
  )}`;
  document.head.appendChild(loader);

  // 2) the inline bootstrap. Build it programmatically so the id is
  //    interpolated from the DTO — a static snippet in index.html
  //    couldn't be per-restaurant.
  const inline = document.createElement("script");
  inline.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${id}');
  `;
  document.head.appendChild(inline);

  injectedId = id;
}

export function useGoogleAnalytics(measurementId?: string | null) {
  const location = useLocation();

  // Skip the FIRST route effect run. gtag('config', id) — fired inside
  // injectGtag on initial load — already sends a page_view for the
  // landing route. Without this guard the effect below would send a
  // SECOND page_view for that same first route, double-counting the
  // landing page. We only want to fire on SUBSEQUENT in-app navigations.
  const firstRun = useRef(true);

  // Inject the tag once a valid id is available.
  useEffect(() => {
    const id = (measurementId || "").trim();
    if (!id || !GA_ID_RE.test(id)) return; // no id / malformed → nothing
    injectGtag(id);
  }, [measurementId]);

  // SPA page_view tracking. GA's gtag.js (via the config call) auto-
  // fires a page_view only for the initial route; in a SPA the URL then
  // changes without a full reload, so each LATER route change needs a
  // manual page_view or GA only ever counts the landing page. Guard on
  // window.gtag so this is a no-op when no id was injected, and on
  // firstRun so the landing route isn't counted twice.
  useEffect(() => {
    const id = (measurementId || "").trim();
    if (!id || !GA_ID_RE.test(id)) return;

    // First run = the initial route, already counted by config. Mark it
    // consumed and bail so we don't double-count. Every subsequent
    // location change falls through and sends a real page_view.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    const w = window as unknown as {
      gtag?: (...args: unknown[]) => void;
    };
    if (typeof w.gtag !== "function") return;
    w.gtag("event", "page_view", {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [measurementId, location.pathname, location.search]);
}

export default useGoogleAnalytics;
