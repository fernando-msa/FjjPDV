export type PaymentMethod = "pix" | "card" | "credit" | "debit" | "cash" | "voucher" | "split";
export type AppRole = "operator" | "admin";

export type AuthProfile = {
  userId: string;
  fullName: string;
  role: AppRole;
};

export type AuthSessionState = {
  userId: string;
  email: string;
  fullName: string;
  role: AppRole;
};

export type Product = {
  id: string;
  name: string;
  barcode: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
  active?: boolean;
};

export type CartItem = {
  productId: string;
  name: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  discount?: number; // Desconto em R$ aplicado no item
};

export type CustomerInfo = {
  id?: string;
  name?: string;
  cpfCnpj?: string;
  phone?: string;
  email?: string;
  loyaltyPoints?: number;
};

export type PaymentEntry = {
  id: string;
  method: PaymentMethod;
  amount: number;
  receivedAmount?: number;
  change?: number;
  note?: string;
};

export type ParkedSale = {
  id: string;
  code: string;
  label: string;
  cart: CartItem[];
  customerDiscount: number;
  customer?: CustomerInfo | null;
  createdAt: string;
  total: number;
};

export type CashMovementType = "opening" | "supply" | "withdrawal" | "closing";

export type CashMovement = {
  id: string;
  type: CashMovementType;
  amount: number;
  note: string;
  createdAt: string;
};

export type SessionClosingSummary = {
  expectedCash: number;
  expectedCard: number;
  expectedPix: number;
  expectedTotal: number;
  reportedCash: number;
  reportedCard: number;
  reportedPix: number;
  reportedTotal: number;
  difference: number;
  note?: string;
};

export type CashSession = {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  totalCashSales: number;
  totalCardSales?: number;
  totalPixSales?: number;
  movements: CashMovement[];
  status: "open" | "closed";
  closingSummary?: SessionClosingSummary;
};

export type SaleItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
};

export type SaleStatus = "completed" | "canceled";

export type Sale = {
  id: string;
  number: string;
  total: number;
  subtotal: number;
  discount: number;
  paymentMethod: PaymentMethod;
  payments?: PaymentEntry[];
  paidAmount: number;
  change: number;
  items: SaleItem[];
  customer?: CustomerInfo | null;
  cashier: string;
  cashierSessionId: string;
  createdAt: string;
  syncedAt?: string;
  syncStatus: "pending" | "synced" | "failed";
  status: SaleStatus;
  canceledAt?: string;
  canceledBy?: string;
  cancelReason?: string;
  parkedSaleId?: string;
};

export type DashboardMetrics = {
  revenueToday: number;
  averageTicket: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  salesToday: number;
};

export type PendingSyncJob = {
  id: string;
  entity: "sale" | "movement" | "product" | "session";
  payload: unknown;
  createdAt: string;
};

export type PdvSnapshot = {
  products: Product[];
  sales: Sale[];
  movements: CashMovement[];
  sessions: CashSession[];
  queue: PendingSyncJob[];
  parkedSales?: ParkedSale[];
  customers?: CustomerInfo[];
};