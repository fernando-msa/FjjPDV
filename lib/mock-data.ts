import { type CustomerInfo, type DashboardMetrics, type ParkedSale, type PaymentMethod, type Product } from "./types";

export const demoProducts: Product[] = [
  { id: "p-001", name: "Coca-Cola 2L", barcode: "7894900010015", sku: "BEB-001", category: "Bebidas", price: 12.9, cost: 8.1, stock: 24, minStock: 8, unit: "un", active: true },
  { id: "p-002", name: "Pão de Queijo Mineiro", barcode: "7894900010022", sku: "PAD-002", category: "Padaria", price: 6.5, cost: 2.8, stock: 42, minStock: 20, unit: "un", active: true },
  { id: "p-003", name: "Café Expresso Gourmet", barcode: "7894900010039", sku: "BEB-003", category: "Bebidas", price: 5.0, cost: 1.2, stock: 68, minStock: 25, unit: "un", active: true },
  { id: "p-004", name: "Salgado Assado Frango c/ Catupiry", barcode: "7894900010046", sku: "LAN-004", category: "Lanchonete", price: 8.5, cost: 3.6, stock: 33, minStock: 15, unit: "un", active: true },
  { id: "p-005", name: "Arroz Tipo 1 5kg", barcode: "7894900010053", sku: "MER-005", category: "Mercearia", price: 31.9, cost: 23.5, stock: 18, minStock: 10, unit: "un", active: true },
  { id: "p-006", name: "Sabonete Hidratante 90g", barcode: "7894900010060", sku: "HIG-006", category: "Higiene", price: 3.9, cost: 1.4, stock: 97, minStock: 30, unit: "un", active: true },
  { id: "p-007", name: "Cerveja Puro Malte Lata 350ml", barcode: "7894900010077", sku: "BEB-007", category: "Bebidas", price: 4.99, cost: 2.1, stock: 56, minStock: 18, unit: "un", active: true },
  { id: "p-008", name: "Chocolate ao Leite 90g", barcode: "7894900010084", sku: "DOC-008", category: "Confeitaria", price: 4.2, cost: 1.8, stock: 61, minStock: 20, unit: "un", active: true },
  { id: "p-009", name: "Água Mineral s/ Gás 500ml", barcode: "7894900010091", sku: "BEB-009", category: "Bebidas", price: 3.0, cost: 0.9, stock: 80, minStock: 30, unit: "un", active: true },
  { id: "p-010", name: "Sanduíche Natural Integral", barcode: "7894900010107", sku: "LAN-010", category: "Lanchonete", price: 11.5, cost: 5.2, stock: 15, minStock: 10, unit: "un", active: true }
];

export const demoCustomers: CustomerInfo[] = [
  { id: "c-001", name: "Mariana Silva", cpfCnpj: "123.456.789-00", phone: "(11) 98765-4321", email: "mariana.silva@email.com", loyaltyPoints: 145 },
  { id: "c-002", name: "Carlos Eduardo Rocha", cpfCnpj: "987.654.321-11", phone: "(11) 97654-3210", email: "carlos.rocha@email.com", loyaltyPoints: 320 },
  { id: "c-003", name: "Fernanda Santos", cpfCnpj: "456.789.123-22", phone: "(11) 96543-2109", email: "fernanda.santos@email.com", loyaltyPoints: 80 }
];

export const demoParkedSales: ParkedSale[] = [
  {
    id: "parked-01",
    code: "CMD-001",
    label: "Mesa 03 - Balcão",
    cart: [
      { productId: "p-003", name: "Café Expresso Gourmet", barcode: "7894900010039", quantity: 2, unitPrice: 5.0 },
      { productId: "p-002", name: "Pão de Queijo Mineiro", barcode: "7894900010022", quantity: 3, unitPrice: 6.5 }
    ],
    customerDiscount: 0,
    customer: { name: "Mariana Silva", phone: "(11) 98765-4321" },
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 min atrás
    total: 29.5
  }
];

export const demoMetrics: DashboardMetrics = {
  revenueToday: 4820.75,
  averageTicket: 47.68,
  salesToday: 101,
  topProducts: [
    { name: "Coca-Cola 2L", quantity: 18, revenue: 232.2 },
    { name: "Cerveja Puro Malte Lata 350ml", quantity: 17, revenue: 84.83 },
    { name: "Pão de Queijo Mineiro", quantity: 16, revenue: 104.0 }
  ]
};

export const paymentLabels: Record<PaymentMethod, string> = {
  pix: "Pix",
  card: "Cartão",
  credit: "Crédito",
  debit: "Débito",
  cash: "Dinheiro",
  voucher: "Vale / Outros",
  split: "Multi-Pagamento"
};