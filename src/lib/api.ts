// API Configuration - Change these URLs as needed
export const API_URLS = {
  reservations: "https://api.liwamenu.com/reservations",
  sendReservationCodeSMS: "https://api.liwamenu.com/sendReservationCodeSMS",
  sendReservationCodeEmail: "https://api.liwamenu.com/sendReservationCodeEmail",
  orders: "https://api.liwamenu.com/orders",
  callWaiter: "https://api.liwamenu.com/callWaiter",
  sendSurvey: "https://api.liwamenu.com/sendSurvey",
} as const;

// Helper to check if phone is Turkish based on the phone number
export const isTurkishPhone = (phoneNumber: string): boolean => {
  return phoneNumber?.startsWith("+90");
};
