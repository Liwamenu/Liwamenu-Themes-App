// Toggle: set to true to use dummy data from src/data/restaurant.ts, false to fetch from API
export const USE_DUMMY_DATA = false;

// API base URL
const API_BASE_URL = "https://liwamenu.pentegrasyon.net";

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
  sendSurvey: `${API_BASE_URL}/api/Surveys/SendSurvey`,

  // Legacy aliases (kept for backwards compat)
  reservations: `${API_BASE_URL}/api/Reservations/Create`,
  sendReservationCodeSMS: `${API_BASE_URL}/api/SMS/ResendReservationVerification`,
  sendReservationCodeEmail: `${API_BASE_URL}/api/Reservations/SendReservationCodeEmail`,
  orders: `${API_BASE_URL}/api/Orders/CreateOrderByType`,
} as const;

/**
 * Generic API fetch helper with JSON support.
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
    const msg = typeof data === "string" ? data : data?.message || data?.Message || `Request failed (${res.status})`;
    throw new Error(msg);
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
  const hostname = window.location.hostname;

  // Local development or Lovable preview → default tenant
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname.endsWith(".lovable.app")
  ) {
    return "tatliparkbinevler";
  }

  // Subdomain-based: addis.liwamenu.com → "addis"
  const parts = hostname.split(".");
  if (parts.length > 2) {
    return parts[0];
  }

  // Path-based: liwamenu.com/addis → "addis"
  const pathSegment = window.location.pathname.split("/")[1];
  if (pathSegment) {
    return pathSegment;
  }

  return "tatliparkbinevler"; // fallback
}

// Helper to check if phone is Turkish based on the phone number
export const isTurkishPhone = (phoneNumber: string): boolean => {
  return phoneNumber?.startsWith("+90");
};
