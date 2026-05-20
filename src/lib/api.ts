// Toggle: set VITE_USE_DUMMY_DATA=true in .env to use dummy data from src/data/restaurant.ts
export const USE_DUMMY_DATA = import.meta.env.VITE_USE_DUMMY_DATA === "true";

// API base URL — configured via VITE_API_BASE_URL in .env / .env.local.
//
// Only use a relative path (so requests go through the Vite dev-server
// proxy and dodge CORS, incl. over ngrok tunnels) when we're actually
// running UNDER the dev server. `import.meta.hot` is truthy only during
// `vite dev`; in every build output — including `build:dev`
// (`vite build --mode development`, which keeps import.meta.env.DEV
// true) — it is statically replaced with undefined. Keying on it
// instead of `import.meta.env.DEV` prevents a dev-mode build deployed
// to a real domain (e.g. demo.liwamenu.com) from firing relative
// `/api` calls that hit the SPA's own index.html and return
// "<!doctype …>" instead of JSON.
const API_BASE_URL = import.meta.hot ? "" : (import.meta.env.VITE_API_BASE_URL || "");

// API Configuration - all endpoints centralized here
export const API_URLS = {
  // Restaurant
  getRestaurantFull: `${API_BASE_URL}/api/Restaurants/GetRestaurantFullByTenant`,

  // Orders
  createOrder: `${API_BASE_URL}/api/Orders/CreateOrderByType`,

  // Notifications
  callWaiter: `${API_BASE_URL}/api/Notifications/CallWaiter`,

  // Reservations
  createReservation: `${API_BASE_URL}/api/Reservations/Create`,
  verifyReservation: `${API_BASE_URL}/api/Reservations/Verify`,
  resendReservationVerification: `${API_BASE_URL}/api/SMS/ResendReservationVerification`,

  // Survey
  sendSurvey: `${API_BASE_URL}/api/Restaurants/SubmitSurveyRating`,

  // Legacy aliases (kept for backwards compat)
  reservations: `${API_BASE_URL}/api/Reservations/Create`,
  sendReservationCodeSMS: `${API_BASE_URL}/api/SMS/ResendReservationVerification`,
  sendReservationCodeEmail: `${API_BASE_URL}/api/Reservations/SendReservationCodeEmail`,
  orders: `${API_BASE_URL}/api/Orders/CreateOrderByType`,
} as const;

/**
 * Error thrown by `apiFetch` when the response is non-2xx. Exposes the
 * HTTP status and the parsed response body so callers can detect
 * specific error shapes (e.g. 409 PRICE_MISMATCH on order submit) and
 * react with a tailored UI instead of a generic toast.
 */
export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Generic API fetch helper with JSON support.
 *
 * Resolves with the parsed body on 2xx. On non-2xx, throws `ApiError`
 * carrying the status + parsed body (or the raw text response) so the
 * caller can branch on `error.status` / `error.data.code` etc.
 */
export async function apiFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    // Prefer the localized Turkish message when the backend supplies one
    // (ResponsBase shape: { message_TR, message_EN, statusCode, data }),
    // falling back to legacy `message` / `Message` / a generic string.
    const msg =
      typeof data === "string"
        ? data
        : data?.message_TR ||
          data?.message ||
          data?.Message ||
          `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }

  return data as T;
}

/**
 * Helper to extract nested response data (handles both camelCase and PascalCase).
 */
export function getResponseData(res: any): any {
  return res?.data ?? res?.Data ?? res;
}

// ── API Functions ────────────────────────────────────────────

export async function createOnlineOrder(payload: any) {
  return apiFetch(API_URLS.createOrder, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiCallWaiter(payload: { restaurantId: string; tableNumber: string; note?: string | null }) {
  return apiFetch(API_URLS.callWaiter, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createReservation(payload: any) {
  return apiFetch(API_URLS.createReservation, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyReservation(payload: { reservationId: string; verificationCode: string }) {
  return apiFetch(API_URLS.verifyReservation, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendReservationVerification(payload: { reservationId: string }) {
  return apiFetch(API_URLS.resendReservationVerification, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Resolve tenant from URL
export function getTenant(): string {
  // 1) Explicit ?tenant=xxx URL param always wins (handy for ngrok testing).
  const tenantParam = new URLSearchParams(window.location.search).get("tenant");
  if (tenantParam) return tenantParam;

  const hostname = window.location.hostname;

  // 2) Local development, Lovable preview, or tunneling services
  //    (ngrok, cloudflared, etc.) → default tenant.
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname.endsWith(".lovable.app") ||
    hostname.endsWith(".ngrok-free.app") ||
    hostname.endsWith(".ngrok-free.dev") ||
    hostname.endsWith(".ngrok.io") ||
    hostname.endsWith(".ngrok.app") ||
    hostname.endsWith(".trycloudflare.com")
  ) {
    return import.meta.env.VITE_FALLBACK_TENANT;
  }

  // 3) Subdomain-based: addis.liwamenu.com → "addis"
  const parts = hostname.split(".");
  if (parts.length > 2) {
    return parts[0];
  }

  // 4) Path-based: liwamenu.com/addis → "addis"
  const pathSegment = window.location.pathname.split("/")[1];
  if (pathSegment) {
    return pathSegment;
  }

  return import.meta.env.VITE_FALLBACK_TENANT; // fallback
}

// Helper to check if phone is Turkish based on the phone number
export const isTurkishPhone = (phoneNumber: string): boolean => {
  return phoneNumber?.startsWith("+90");
};
