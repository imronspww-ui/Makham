export interface Category {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  /** Option groups required once per order when cart has items from this category */
  optionGroups?: OptionGroup[]
}

/** One choice selection for a category-level option group */
export interface CategoryAddon {
  categoryId: string
  categoryName: string
  groupId: string
  groupName: string
  choiceId: string
  choiceName: string
  extraPrice: number
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  categoryId: string
  imageUrl: string
  isAvailable: boolean
  isSoldOut: boolean
  isPopular?: boolean
  sortOrder?: number     // ลำดับการแสดง (น้อย = แสดงก่อน)
  optionGroups: OptionGroup[]
  packSize?: number      // จำนวนชิ้นต่อ 1 แพ็ค (สำหรับคำนวณต้นทุน)
  costPerPack?: number   // ราคาซื้อต่อแพ็ค (บาท) สำหรับคำนวณต้นทุน
  avgRating?: number     // ค่าเฉลี่ยดาว 1-5 (คำนวณจาก reviews)
  ratingCount?: number   // จำนวนรีวิว
  createdAt: string
  updatedAt: string
}

// ─── Menu option groups ──────────────────────────────────────────────────────
export interface OptionChoice {
  id: string
  name: string
  extraPrice: number
  isSoldOut?: boolean   // true = ตัวเลือกนี้หมด ลูกค้าเลือกไม่ได้
}

export interface OptionGroup {
  id: string
  name: string
  required: boolean
  multiSelect: boolean
  choices: OptionChoice[]
}

export interface SelectedOption {
  groupId: string
  groupName: string
  choiceId: string
  choiceName: string
  extraPrice: number
}

export interface CartItem {
  menuItemId: string
  name: string
  price: number
  qty: number
  imageUrl: string
  selectedOptions: SelectedOption[]
  itemNote: string
  optionGroups?: OptionGroup[]   // kept for in-cart option editing
}

export type OrderType = 'pickup' | 'delivery' | 'dine-in'
export type OrderStatus = 'pending' | 'cooking' | 'delivering' | 'completed' | 'cancelled'
export type PaymentMethod = 'promptpay' | 'cash'
export type PaymentStatus = 'pending' | 'paid'

export interface OrderItem {
  menuItemId: string
  name: string
  price: number
  qty: number
  subtotal: number
  imageUrl?: string
  selectedOptions?: SelectedOption[]
  itemNote?: string
  isRedeemed?: boolean   // true = แลกด้วยแต้มสะสม (ราคา ฿0)
}

export interface DeliveryInfo {
  address: string
  lat: number
  lng: number
  distanceKm: number
  fee: number
}

export interface Order {
  id: string
  orderNumber: string
  orderType: OrderType
  customer: {
    name: string
    phone: string
  }
  items: OrderItem[]
  delivery?: DeliveryInfo
  payment: {
    method: PaymentMethod
    status: PaymentStatus
    slipUrl?: string
  }
  subtotal: number
  deliveryFee: number
  total: number
  note: string
  status: OrderStatus
  source?: 'online' | 'pos'          // ช่องทางออเดอร์: ออนไลน์ หรือ POS หน้าร้าน
  tableNumber?: string               // หมายเลขโต๊ะ (ถ้าสั่งจากโต๊ะผ่าน QR)
  discount?: number                   // ส่วนลดรวม (บาท) สำหรับ POS
  categoryAddons?: CategoryAddon[]   // category-level sauce/addon selections
  pointsEarned?: number              // แต้มที่ได้รับจากออเดอร์นี้
  pointsUsed?: number                // แต้มที่ใช้แลกเมนูฟรี
  redeemedItemId?: string            // menuItemId ของเมนูที่แลก
  cancelRequest?: {                  // คำขอยกเลิกจากลูกค้า
    reason: string
    requestedAt: string
  }
  soldBy?: string                    // ชื่อพนักงานที่ขาย (POS เท่านั้น)
  referredBy?: string                // เบอร์โทรของผู้แนะนำ (Referral)
  createdAt: string
  updatedAt: string
}

export interface StoreSettings {
  name: string
  address: string
  lat: number
  lng: number
  logoUrl?: string
  bgImageUrl?: string
  bannerUrl?: string             // รูป cover ด้านบน header
  description?: string          // คำอธิบายร้าน 1 บรรทัด
  announcement?: string         // ข้อความโปรโมชัน/ประกาศ
  // ช่องทางติดต่อ & โซเชียล
  phoneContact?: string          // เบอร์โทรร้าน (กด tel:)
  lineId?: string                // LINE ID หรือ LINE OA URL
  facebookUrl?: string           // Facebook page URL
  instagramUrl?: string          // Instagram URL
  tiktokUrl?: string             // TikTok URL
  websiteUrl?: string            // เว็บไซต์
  additionalLinks?: { label: string; url: string }[]  // ลิงก์เพิ่มเติม
}

export interface DaySchedule {
  isOff: boolean
  open: string   // "09:00"
  close: string  // "21:00"
}

export interface OpeningHoursSettings {
  enabled: boolean
  /** 'auto' = follow schedule | 'open' = force open | 'closed' = force closed */
  manualOverride: 'auto' | 'open' | 'closed'
  schedule: Record<string, DaySchedule>  // "0"=Sun … "6"=Sat
}

export interface PromptPaySettings {
  phone: string
  accountName: string
}

export interface DeliverySettings {
  enabled?: boolean      // true = เปิดบริการ (default), false = ปิดชั่วคราว
  freeFirstKm?: number   // กม. แรกฟรี (default: 0 = ไม่มีฟรี)
  minOrderAmount?: number // ยอดสั่งขั้นต่ำสำหรับ delivery (0 = ไม่มีขั้นต่ำ)
  pricePerKm: number
  minDistance: number
  minFee: number
  maxDistance: number
}

// ─── Loyalty / Points ────────────────────────────────────────────────────────

export interface RedeemableItem {
  menuItemId: string
  menuItemName: string
  pointsCost: number
}

export interface LoyaltySettings {
  enabled: boolean
  pointsPer100Baht: number    // default: 5
  expiryMonths: number        // default: 3
  redeemableItems: RedeemableItem[]
}

export interface CustomerProfile {
  id: string              // = phone number
  phone: string
  name: string
  points: number          // แต้มปัจจุบัน (0 ถ้าหมดอายุแล้ว)
  totalOrders: number
  totalSpent: number
  lastOrderAt: string
  pointsExpireAt: string  // ISO — หมดอายุ X เดือนหลังสั่งล่าสุด
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────────────────────────────────────

export interface ReceiptSettings {
  showLogo:      boolean   // แสดงโลโก้จาก store settings
  showAddress:   boolean   // แสดงที่อยู่จาก store settings
  phone:         string    // เบอร์โทรร้าน (สำหรับใบเสร็จ)
  taxId:         string    // เลขที่ผู้เสียภาษี (ถ้าว่างไม่แสดง)
  footerMessage: string    // ข้อความท้ายใบเสร็จ
  noteLines:     string    // บรรทัดพิเศษ newline-separated (WiFi, LINE, social ฯลฯ)
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export interface Review {
  id: string
  menuItemId: string
  menuItemName: string
  orderId: string
  orderNumber: string
  rating: number      // 1-5
  comment?: string
  createdAt: string
}

// ─── Store Costs ─────────────────────────────────────────────────────────────

export interface CostItem {
  id: string
  name: string    // เช่น "ค่าไฟ", "ค่าแก๊ส"
  amount: number  // บาท/เดือน
  type: 'fixed' | 'variable'
}

export interface Settings {
  store: StoreSettings
  promptpay: PromptPaySettings
  delivery: DeliverySettings
  openingHours?: OpeningHoursSettings
  loyalty?: LoyaltySettings
  receipt?: ReceiptSettings
  costs?: CostItem[]       // ค่าใช้จ่ายร้านรายเดือน
  reservePercent?: number  // % เงินสำรองร้าน (0-100), default 20
  staffPinHash?: string    // legacy — replaced by StaffAccount per-person PIN
}

// ─── Staff Accounts ───────────────────────────────────────────────────────────

export interface StaffAccount {
  id: string
  name: string
  pinHash: string     // HMAC hash — never expose to client
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** Safe public version — no pinHash */
export type StaffAccountPublic = Omit<StaffAccount, 'pinHash'>
