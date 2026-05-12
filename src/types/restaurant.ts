/**
 * EU 14 major allergens (Türk Gıda Kodeksi & EU Annex II of Reg. 1169/2011).
 * Backend should send a `code` matching one of these standardized strings,
 * plus a `presence` flag indicating if the product contains it directly
 * or may contain it via cross-contamination.
 */
export type AllergenCode =
  | "gluten"      // 1) Cereals containing gluten
  | "crustaceans" // 2) Crustaceans
  | "eggs"        // 3) Eggs
  | "fish"        // 4) Fish
  | "peanuts"     // 5) Peanuts
  | "soybeans"    // 6) Soybeans
  | "milk"        // 7) Milk (incl. lactose)
  | "treeNuts"    // 8) Tree nuts
  | "celery"      // 9) Celery
  | "mustard"     // 10) Mustard
  | "sesame"      // 11) Sesame seeds
  | "sulphites"   // 12) Sulphur dioxide & sulphites (>10mg/kg)
  | "lupin"       // 13) Lupin
  | "molluscs";   // 14) Molluscs

export type AllergenPresence = "contains" | "mayContain";

export interface ProductAllergen {
  code: AllergenCode;
  presence: AllergenPresence;
}

export interface OrderTagItem {
  id: string;
  name: string;
  price: number;
  maxQuantity: number;
  isDefault: boolean;
  isMandatory: boolean;
  minQuantity: number;
  sortOrder: number;
}

export interface OrderTag {
  id: string;
  name: string;
  minSelected: number;
  maxSelected: number;
  freeTagging: boolean;
  sortOrder: number;
  orderTagItems: OrderTagItem[];
}

export interface Portion {
  id: string;
  productId: string;
  name: string;
  price: number;
  campaignPrice: number | null;
  specialPrice: number | null;
  orderTags: OrderTag[];
}

export interface Product {
  id: string;
  sortOrder: number;
  imageURL: string;
  name: string;
  description: string | null;
  recommendation: boolean;
  hide: boolean;
  salesStatus?: boolean;
  freeTagging?: boolean;
  categoryId: string;
  categoryName: string;
  categoryImage: string;
  categorySortOrder: number;
  /**
   * Denormalized active-flag from the parent category. Backend should
   * project `Category.IsActive` onto each product so the customer can
   * filter inactive categories without a second round-trip. Optional
   * for backwards compat — when undefined we treat as visible. Only an
   * explicit `false` removes the product (and therefore its category)
   * from the menu.
   */
  categoryIsActive?: boolean;
  subCategoryId: string | null;
  subCategoryName: string | null;
  subCategoryImage: string | null;
  subCategorySortOrder: number;
  isNoteAllowed?: boolean;
  isCampaign?: boolean;
  /** EU 14 major allergens declared for this product (Annex II / Türk Gıda Kodeksi). */
  allergens?: ProductAllergen[];
  portions: Portion[];
}

export interface WorkingHour {
  day: number;
  isClosed: boolean;
  open: string;
  close: string;
}

export interface SocialLinks {
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  whatsappUrl: string | null;
}

export interface MenuPlan {
  id: string;
  days: number[];
  startTime: string;
  endTime: string;
}

export interface Menu {
  id: string | number;
  restaurantId: string;
  name: string;
  plans: MenuPlan[];
  categoryIds: string[];
}

export interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
}

export interface AnnouncementSettings {
  restaurantId?: string;
  enabled: boolean;
  delayMs: number;
  htmlContent: string;
}

/**
 * One admin-authored external microsite (e.g. campaign landing,
 * weekly menu PDF screenshot, custom HTML page). The restaurant
 * may publish multiple in any order — `sortOrder` controls how
 * they're listed on the menu page. `type` selects which payload
 * field is rendered (Image → imageURL, Html → htmlBody).
 */
export interface ExternalPage {
  id: string;
  type: "Image" | "Html" | string;
  imageURL: string | null;
  htmlBody: string | null;
  buttonName: string;
  sortOrder: number;
}

export interface ReservationSettings {
  restaurantId?: string;
  isActive: boolean;
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  maxGuests: number;
}

export interface SurveyCategory {
  id?: string;
  key: string;
  icon?: string;
  iconName?: string;
  labelKey?: string;
  averageRating?: number;
  ratingCount?: number;
}

export interface SurveySettings {
  restaurantId?: string;
  enabled: boolean;
  categories: SurveyCategory[];
}

export interface RestaurantData {
  restaurantId: string;
  dealerId: string | null;
  userId: string;
  name: string;
  phoneNumber: string;
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  neighbourhood: string;
  address: string;
  isActive: boolean;
  imageAbsoluteUrl: string;
  userIsActive?: boolean;
  defaultLang: string;
  slogan1: string;
  slogan2: string;
  onlineOrder: boolean;
  inPersonOrder: boolean;
  hide: boolean;
  themeId: number;
  maxDistance: number;
  menuLang: string;
  tableOrderDiscountRate: number;
  onlineOrderDiscountRate: number;
  deliveryFee: number;
  coverCharge?: number;
  minOrderAmount: number;
  tenant: string;
  isSpecialPriceActive: boolean;
  specialPriceName: string;
  googleAnalytics: string;
  licenseIsActive: boolean;
  maxTableOrderDistanceMeter: number;
  checkTableOrderDistance: boolean;
  tableNumber?: string;
  moneySign?: string | null;
  decimalPlaces?: number | null;
  heroImageUrl: string;
  logoImageUrl: string;
  /**
   * External (admin-authored) microsites that appear as standalone
   * buttons in the menu. Backend returns a sorted array — replaces
   * the old flat `externalPage{HTML,Image,ButtonName}` trio so
   * restaurants can publish multiple landing pages now.
   */
  externalPages?: ExternalPage[] | null;
  announcementSettings?: AnnouncementSettings;
  reservationSettings?: ReservationSettings;
  surveySettings?: SurveySettings;
  workingHours: WorkingHour[];
  socialLinks: SocialLinks;
  products: Product[];
  menus: Menu[];
  paymentMethods: PaymentMethod[];
}

export interface FullRestaurantInfo {
  restaurantData: RestaurantData;
}

// Cart types
export interface SelectedTagItem {
  tagId: string;
  tagName: string;
  itemId: string;
  itemName: string;
  price: number;
  quantity: number;
}

export interface CartItem {
  id: string;
  product: Product;
  portion: Portion;
  quantity: number;
  selectedTags: SelectedTagItem[];
  note?: string;
}

export interface OrderPayload {
  restaurantId: string;
  orderType: "inPerson" | "online";
  items: {
    productId: string;
    productName: string;
    portionId: string;
    portionName: string;
    unitPrice: number;
    quantity: number;
    selectedTags: SelectedTagItem[];
    itemTotal: number;
    note?: string;
  }[];
  customerInfo?: {
    name: string;
    phone: string;
    address?: string;
  };
  paymentMethodId?: string;
  paymentMethodName?: string;
  tableNumber?: string;
  customerLocation?: {
    latitude: number;
    longitude: number;
  };
  totalAmount: number;
  orderNote?: string;
  createdAt: string;
}

export interface Order extends OrderPayload {
  id: string;
  status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
}
