import { type DashboardMetrics, type Product } from "./types";

export const demoProducts: Product[] = [
  { id: "p-001", name: "Coca-Cola 2L", barcode: "7894900010015", sku: "REF-001", category: "Bebidas", price: 12.9, cost: 8.1, stock: 24, minStock: 8, unit: "un" },
  { id: "p-002", name: "Pao de Queijo", barcode: "7894900010022", sku: "REF-002", category: "Padaria", price: 6.5, cost: 2.8, stock: 42, minStock: 20, unit: "un" },
  { id: "p-003", name: "Cafe Expresso", barcode: "7894900010039", sku: "REF-003", category: "Bebidas", price: 5.0, cost: 1.2, stock: 68, minStock: 25, unit: "un" },
  { id: "p-004", name: "Salgado Assado", barcode: "7894900010046", sku: "REF-004", category: "Lanchonete", price: 8.5, cost: 3.6, stock: 33, minStock: 15, unit: "un" },
  { id: "p-005", name: "Arroz 5kg", barcode: "7894900010053", sku: "REF-005", category: "Mercearia", price: 31.9, cost: 23.5, stock: 18, minStock: 10, unit: "un" },
  { id: "p-006", name: "Sabonete Neutro", barcode: "7894900010060", sku: "REF-006", category: "Higiene", price: 3.9, cost: 1.4, stock: 97, minStock: 30, unit: "un" },
  { id: "p-007", name: "Cerveja Lata 350ml", barcode: "7894900010077", sku: "REF-007", category: "Bebidas", price: 4.99, cost: 2.1, stock: 56, minStock: 18, unit: "un" },
  { id: "p-008", name: "Chocolate 90g", barcode: "7894900010084", sku: "REF-008", category: "Confeitaria", price: 4.2, cost: 1.8, stock: 61, minStock: 20, unit: "un" }
];

export const demoMetrics: DashboardMetrics = {
  revenueToday: 4820.75,
  averageTicket: 47.68,
  salesToday: 101,
  topProducts: [
    { name: "Coca-Cola 2L", quantity: 18, revenue: 232.2 },
    { name: "Cerveja Lata 350ml", quantity: 17, revenue: 84.83 },
    { name: "Pao de Queijo", quantity: 16, revenue: 104.0 }
  ]
};

export const paymentLabels: Record<"pix" | "card" | "cash", string> = {
  pix: "Pix",
  card: "Cartao",
  cash: "Dinheiro"
};