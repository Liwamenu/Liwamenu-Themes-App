// Toggle: set to true to use dummy data from src/data/restaurant.ts, false to fetch from API
export const USE_DUMMY_DATA = false;

// API Configuration - Change these URLs as needed
export const API_URLS = {
  reservations: "https://liwamenu.pentegrasyon.net/api/Reservations/SetReservations",
  sendReservationCodeSMS: "https://liwamenu.pentegrasyon.net/api/Reservations/SendReservationCodeSMS",
  sendReservationCodeEmail: "https://liwamenu.pentegrasyon.net/api/Reservations/SendReservationCodeEmail",
  orders: "https://liwamenu.pentegrasyon.net/api/Orders/SendOrders",
  callWaiter: "https://liwamenu.pentegrasyon.net/api/Orders/CallWaiter",
  sendSurvey: "https://liwamenu.pentegrasyon.net/api/Surveys/SendSurvey",
  getRestaurantFull: "https://liwamenu.pentegrasyon.net/api/Restaurants/GetRestaurantFullByTenant",
} as const;

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
    return "addis";
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

  return "addis"; // fallback
}

// Helper to check if phone is Turkish based on the phone number
export const isTurkishPhone = (phoneNumber: string): boolean => {
  return phoneNumber?.startsWith("+90");
};
