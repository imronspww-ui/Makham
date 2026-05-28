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
  optionGroups: OptionGroup[]
  createdAt: string
  updatedAt: string
}

// ─── Menu option groups ──────────────────────────────────────────────────────
export interface OptionChoice {
  id: string
  name: string
  extraPrice: number
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

export type OrderType = 'pickup' | 'delivery'
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
  categoryAddons?: CategoryAddon[]   // category-level sauce/addon selections
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
}

export interface PromptPaySettings {
  phone: string
  accountName: string
}

export interface DeliverySettings {
  pricePerKm: number
  minDistance: number
  minFee: number
  maxDistance: number
}

export interface Settings {
  store: StoreSettings
  promptpay: PromptPaySettings
  delivery: DeliverySettings
}
