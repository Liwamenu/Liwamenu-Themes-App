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
  description: string;
  recommendation: boolean;
  hide: boolean;
  categoryId: string;
  categoryName: string;
  categoryImage: string;
  categorySortOrder: number;
  subCategoryId: string | null;
  subCategoryName: string | null;
  subCategoryImage: string | null;
  subCategorySortOrder: number;
  isNoteAllowed?: boolean;
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
  enabled: boolean;
  delayMs: number;
  htmlContent: string;
}

export interface ReservationSettings {
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
  tableNumber?: number;
  moneySign?: string | null;
  heroImageUrl: string;
  logoImageUrl: string;
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
  tableNumber?: number;
  totalAmount: number;
  orderNote?: string;
  createdAt: string;
}

export interface Order extends OrderPayload {
  id: string;
  status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
}
