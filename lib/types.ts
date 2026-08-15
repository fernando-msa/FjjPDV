export type PaymentMethod = "pix" | "card" | "cash";
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
};

export type CartItem = {
  productId: string;
  name: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
};

export type CashMovementType = "opening" | "supply" | "withdrawal" | "closing";

export type CashMovement = {
  id: string;
  type: CashMovementType;
  amount: number;
  note: string;
  createdAt: string;
};

export type CashSession = {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  totalCashSales: number;
  movements: CashMovement[];
  status: "open" | "closed";
};

export type SaleItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type SaleStatus = "completed" | "canceled";

export type Sale = {
  id: string;
  number: string;
  total: number;
  subtotal: number;
  discount: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  change: number;
  items: SaleItem[];
  cashier: string;
  cashierSessionId: string;
  createdAt: string;
  syncedAt?: string;
  syncStatus: "pending" | "synced" | "failed";
  status: SaleStatus;
  canceledAt?: string;
  canceledBy?: string;
  cancelReason?: string;
};

export type DashboardMetrics = {
  revenueToday: number;
  averageTicket: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  salesToday: number;
};

export type PendingSyncJob = {
  id: string;
  entity: "sale" | "movement";
  payload: unknown;
  createdAt: string;
};

export type PdvSnapshot = {
  products: Product[];
  sales: Sale[];
  movements: CashMovement[];
  sessions: CashSession[];
  queue: PendingSyncJob[];
};