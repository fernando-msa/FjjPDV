"use client";

import { useEffect, useState } from "react";
import type {
  CashMovement,
  CashSession,
  CustomerInfo,
  ParkedSale,
  PdvSnapshot,
  PendingSyncJob,
  Product,
  Sale,
  SessionClosingSummary
} from "@/lib/types";
import {
  loadSnapshot,
  saveSnapshot,
  upsertCustomers,
  upsertMovements,
  upsertParkedSales,
  upsertProducts,
  upsertQueue,
  upsertSales,
  upsertSessions
} from "@/lib/local-db";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { demoCustomers, demoParkedSales, demoProducts } from "@/lib/mock-data";

export type SyncState = {
  online: boolean;
  lastSyncAt?: string;
  pendingJobs: number;
};

export const defaultSession: CashSession = {
  id: "session-001",
  openedAt: new Date().toISOString(),
  openingBalance: 250,
  totalCashSales: 0,
  totalCardSales: 0,
  totalPixSales: 0,
  movements: [
    { id: "movement-opening", type: "opening", amount: 250, note: "Abertura do caixa", createdAt: new Date().toISOString() }
  ],
  status: "open"
};

/**
 * Fonte única de verdade para os dados operacionais do PDV.
 *
 * Persistência local em IndexedDB (grava a cada mudança),
 * fila de sincronização, modo offline, gestão de comandas,
 * fechamento cego e gestão de produtos.
 */
export function useOfflineStore() {
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>(defaultSession.movements);
  const [sessions, setSessions] = useState<CashSession[]>([defaultSession]);
  const [parkedSales, setParkedSales] = useState<ParkedSale[]>(demoParkedSales);
  const [customers, setCustomers] = useState<CustomerInfo[]>(demoCustomers);
  const [queue, setQueue] = useState<PendingSyncJob[]>([]);
  const [status, setStatus] = useState<SyncState>({ online: true, pendingJobs: 0 });
  const [hydrated, setHydrated] = useState(false);

  const activeSession = sessions[0] ?? defaultSession;

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const snapshot = await loadSnapshot();
      if (!mounted) {
        return;
      }

      if (snapshot.products.length > 0) {
        setProducts(snapshot.products);
      } else {
        await upsertProducts(demoProducts);
      }

      if (snapshot.sales.length > 0) setSales(snapshot.sales);
      if (snapshot.movements.length > 0) setMovements(snapshot.movements);
      if (snapshot.sessions.length > 0) setSessions(snapshot.sessions);
      if (snapshot.queue.length > 0) setQueue(snapshot.queue);

      if (snapshot.parkedSales && snapshot.parkedSales.length > 0) {
        setParkedSales(snapshot.parkedSales);
      } else {
        await upsertParkedSales(demoParkedSales);
      }

      if (snapshot.customers && snapshot.customers.length > 0) {
        setCustomers(snapshot.customers);
      } else {
        await upsertCustomers(demoCustomers);
      }

      setStatus((current) => ({ ...current, pendingJobs: snapshot.queue.length, online: navigator.onLine }));
      setHydrated(true);
    }

    loadData();

    const syncOnlineState = () => setStatus((current) => ({ ...current, online: true }));
    const syncOfflineState = () => setStatus((current) => ({ ...current, online: false }));

    window.addEventListener("online", syncOnlineState);
    window.addEventListener("offline", syncOfflineState);

    return () => {
      mounted = false;
      window.removeEventListener("online", syncOnlineState);
      window.removeEventListener("offline", syncOfflineState);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const snapshot: PdvSnapshot = { products, sales, movements, sessions, queue, parkedSales, customers };
    saveSnapshot(snapshot);
  }, [hydrated, movements, products, queue, sales, sessions, parkedSales, customers]);

  async function syncSaleToSupabase(sale: Sale) {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    const saleRecord = {
      id: sale.id,
      number: sale.number,
      total: sale.total,
      subtotal: sale.subtotal,
      discount: sale.discount,
      payment_method: sale.paymentMethod,
      paid_amount: sale.paidAmount,
      change: sale.change,
      customer_name: sale.customer?.name ?? null,
      customer_cpf: sale.customer?.cpfCnpj ?? null,
      customer_phone: sale.customer?.phone ?? null,
      payments_data: sale.payments ?? null,
      cashier: sale.cashier,
      session_id: sale.cashierSessionId,
      created_at: sale.createdAt,
      sync_status: "synced",
      status: sale.status,
      canceled_at: sale.canceledAt ?? null,
      canceled_by: sale.canceledBy ?? null,
      cancel_reason: sale.cancelReason ?? null
    } as Record<string, unknown>;

    const { error } = await (client.from("sales") as any).upsert(saleRecord);
    if (error) {
      return;
    }

    const saleItems = sale.items.map((item) => ({
      sale_id: sale.id,
      product_id: item.productId,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      discount: item.discount ?? 0
    })) as Record<string, unknown>[];

    await (client.from("sale_items") as any).upsert(saleItems);

    setSales((current) =>
      current.map((item) => (item.id === sale.id ? { ...item, syncStatus: "synced", syncedAt: new Date().toISOString() } : item))
    );
  }

  async function syncMovementToSupabase(movement: CashMovement) {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    const movementRecord = {
      id: movement.id,
      movement_type: movement.type,
      amount: movement.amount,
      note: movement.note,
      created_at: movement.createdAt
    } as Record<string, unknown>;

    await (client.from("cash_movements") as any).upsert(movementRecord);
  }

  async function recordSale(sale: Sale, updatedProducts: Product[]) {
    const nextSales = [sale, ...sales];
    const nextQueue: PendingSyncJob[] = [
      { id: `queue-${sale.id}`, entity: "sale", payload: sale, createdAt: sale.createdAt },
      ...queue
    ];

    // Se a venda teve origem em uma comanda em espera, remove da lista de comandas
    if (sale.parkedSaleId) {
      const nextParked = parkedSales.filter((p) => p.id !== sale.parkedSaleId);
      setParkedSales(nextParked);
      await upsertParkedSales(nextParked);
    }

    // Calcula distribuição dos valores pagos por forma de pagamento
    let cashPaid = 0;
    let cardPaid = 0;
    let pixPaid = 0;

    if (sale.payments && sale.payments.length > 0) {
      for (const p of sale.payments) {
        if (p.method === "cash") cashPaid += p.amount;
        else if (p.method === "card" || p.method === "credit" || p.method === "debit") cardPaid += p.amount;
        else if (p.method === "pix") pixPaid += p.amount;
      }
    } else {
      if (sale.paymentMethod === "cash") cashPaid = sale.total;
      else if (sale.paymentMethod === "card" || sale.paymentMethod === "credit" || sale.paymentMethod === "debit") cardPaid = sale.total;
      else if (sale.paymentMethod === "pix") pixPaid = sale.total;
    }

    setProducts(updatedProducts);
    setSales(nextSales);
    setQueue(nextQueue);
    setSessions((current) => [
      {
        ...activeSession,
        totalCashSales: (activeSession.totalCashSales ?? 0) + cashPaid,
        totalCardSales: (activeSession.totalCardSales ?? 0) + cardPaid,
        totalPixSales: (activeSession.totalPixSales ?? 0) + pixPaid
      },
      ...current.slice(1)
    ]);
    setStatus((current) => ({ ...current, pendingJobs: nextQueue.length }));

    await upsertProducts(updatedProducts);
    await upsertSales(nextSales);
    await upsertQueue(nextQueue);

    if (navigator.onLine) {
      await syncSaleToSupabase(sale);
    }
  }

  async function recordMovement(movement: CashMovement) {
    const nextMovements = [movement, ...movements];
    setMovements(nextMovements);
    await upsertMovements(nextMovements);

    if (navigator.onLine) {
      await syncMovementToSupabase(movement);
    }
  }

  async function cancelSale(saleId: string, reason: string, canceledBy: string) {
    const sale = sales.find((item) => item.id === saleId);
    if (!sale || sale.status === "canceled") {
      return;
    }

    const canceledSale: Sale = {
      ...sale,
      status: "canceled",
      canceledAt: new Date().toISOString(),
      canceledBy,
      cancelReason: reason,
      syncStatus: navigator.onLine ? "synced" : "pending"
    };

    const nextSales = sales.map((item) => (item.id === saleId ? canceledSale : item));

    const updatedProducts = products.map((product) => {
      const soldItem = sale.items.find((item) => item.productId === product.id);
      if (!soldItem) {
        return product;
      }
      return { ...product, stock: product.stock + soldItem.quantity };
    });

    const nextQueue: PendingSyncJob[] = [
      { id: `queue-cancel-${sale.id}-${Date.now()}`, entity: "sale", payload: canceledSale, createdAt: canceledSale.canceledAt! },
      ...queue
    ];

    setSales(nextSales);
    setProducts(updatedProducts);
    setQueue(nextQueue);

    let cashToDeduct = 0;
    if (sale.payments && sale.payments.length > 0) {
      for (const p of sale.payments) {
        if (p.method === "cash") cashToDeduct += p.amount;
      }
    } else if (sale.paymentMethod === "cash") {
      cashToDeduct = sale.total;
    }

    if (cashToDeduct > 0) {
      setSessions((current) => [
        { ...activeSession, totalCashSales: Math.max((activeSession.totalCashSales ?? 0) - cashToDeduct, 0) },
        ...current.slice(1)
      ]);
    }

    setStatus((current) => ({ ...current, pendingJobs: nextQueue.length }));

    await upsertSales(nextSales);
    await upsertProducts(updatedProducts);
    await upsertQueue(nextQueue);

    if (navigator.onLine) {
      await syncSaleToSupabase(canceledSale);
    }
  }

  // --- Vendas em Espera (Park & Resume) ---
  async function parkSale(
    label: string,
    cart: Sale["items"],
    customerDiscount: number,
    customer?: CustomerInfo | null
  ): Promise<ParkedSale> {
    const total = Math.max(
      cart.reduce((acc, item) => acc + item.unitPrice * item.quantity - (item.discount || 0), 0) - customerDiscount,
      0
    );

    const count = parkedSales.length + 1;
    const newParked: ParkedSale = {
      id: `parked-${Date.now()}`,
      code: `CMD-${String(count).padStart(3, "0")}`,
      label: label.trim() || `Comanda ${count}`,
      cart: cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        barcode: products.find((p) => p.id === item.productId)?.barcode || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount
      })),
      customerDiscount,
      customer: customer || null,
      createdAt: new Date().toISOString(),
      total
    };

    const nextParked = [newParked, ...parkedSales];
    setParkedSales(nextParked);
    await upsertParkedSales(nextParked);
    return newParked;
  }

  async function deleteParkedSale(parkedSaleId: string) {
    const nextParked = parkedSales.filter((p) => p.id !== parkedSaleId);
    setParkedSales(nextParked);
    await upsertParkedSales(nextParked);
  }

  // --- Gestão de Produtos (CRUD) ---
  async function saveProduct(productData: Product) {
    const exists = products.some((p) => p.id === productData.id);
    let nextProducts: Product[];

    if (exists) {
      nextProducts = products.map((p) => (p.id === productData.id ? productData : p));
    } else {
      nextProducts = [productData, ...products];
    }

    setProducts(nextProducts);
    await upsertProducts(nextProducts);
  }

  async function deleteProduct(productId: string) {
    const nextProducts = products.filter((p) => p.id !== productId);
    setProducts(nextProducts);
    await upsertProducts(nextProducts);
  }

  // --- Gestão de Clientes ---
  async function saveCustomer(customer: CustomerInfo) {
    const id = customer.id || `c-${Date.now()}`;
    const newCustomer = { ...customer, id };
    const exists = customers.some((c) => c.id === id || (c.cpfCnpj && c.cpfCnpj === customer.cpfCnpj));

    let nextCustomers: CustomerInfo[];
    if (exists) {
      nextCustomers = customers.map((c) => (c.id === id || c.cpfCnpj === customer.cpfCnpj ? newCustomer : c));
    } else {
      nextCustomers = [newCustomer, ...customers];
    }

    setCustomers(nextCustomers);
    await upsertCustomers(nextCustomers);
    return newCustomer;
  }

  // --- Fechamento de Caixa Cego & Abertura ---
  async function closeActiveSession(data: {
    reportedCash: number;
    reportedCard: number;
    reportedPix: number;
    note?: string;
  }): Promise<SessionClosingSummary> {
    const sessionSales = sales.filter((s) => s.cashierSessionId === activeSession.id && s.status !== "canceled");

    let expectedCashSales = 0;
    let expectedCardSales = 0;
    let expectedPixSales = 0;

    for (const sale of sessionSales) {
      if (sale.payments && sale.payments.length > 0) {
        for (const p of sale.payments) {
          if (p.method === "cash") expectedCashSales += p.amount;
          else if (p.method === "card" || p.method === "credit" || p.method === "debit") expectedCardSales += p.amount;
          else if (p.method === "pix") expectedPixSales += p.amount;
        }
      } else {
        if (sale.paymentMethod === "cash") expectedCashSales += sale.total;
        else if (sale.paymentMethod === "card" || sale.paymentMethod === "credit" || sale.paymentMethod === "debit") expectedCardSales += sale.total;
        else if (sale.paymentMethod === "pix") expectedPixSales += sale.total;
      }
    }

    const netMovements = movements.reduce(
      (acc, m) => acc + (m.type === "supply" ? m.amount : m.type === "withdrawal" ? -m.amount : 0),
      0
    );

    const expectedCashInDrawer = activeSession.openingBalance + netMovements + expectedCashSales;
    const expectedTotal = expectedCashInDrawer + expectedCardSales + expectedPixSales;
    const reportedTotal = data.reportedCash + data.reportedCard + data.reportedPix;
    const difference = reportedTotal - expectedTotal;

    const summary: SessionClosingSummary = {
      expectedCash: expectedCashInDrawer,
      expectedCard: expectedCardSales,
      expectedPix: expectedPixSales,
      expectedTotal,
      reportedCash: data.reportedCash,
      reportedCard: data.reportedCard,
      reportedPix: data.reportedPix,
      reportedTotal,
      difference,
      note: data.note
    };

    const closedSession: CashSession = {
      ...activeSession,
      status: "closed",
      closedAt: new Date().toISOString(),
      totalCashSales: expectedCashSales,
      totalCardSales: expectedCardSales,
      totalPixSales: expectedPixSales,
      closingSummary: summary
    };

    const closingMovement: CashMovement = {
      id: `movement-closing-${Date.now()}`,
      type: "closing",
      amount: data.reportedCash,
      note: `Fechamento de caixa. Diferença apurada: R$ ${difference.toFixed(2)}. ${data.note || ""}`.trim(),
      createdAt: new Date().toISOString()
    };

    const nextSessions = [closedSession, ...sessions.slice(1)];
    const nextMovements = [closingMovement, ...movements];

    setSessions(nextSessions);
    setMovements(nextMovements);

    await upsertSessions(nextSessions);
    await upsertMovements(nextMovements);

    return summary;
  }

  async function openNewSession(openingBalance: number) {
    const newSession: CashSession = {
      id: `session-${Date.now()}`,
      openedAt: new Date().toISOString(),
      openingBalance,
      totalCashSales: 0,
      totalCardSales: 0,
      totalPixSales: 0,
      movements: [
        {
          id: `movement-opening-${Date.now()}`,
          type: "opening",
          amount: openingBalance,
          note: "Abertura de nova sessão de caixa",
          createdAt: new Date().toISOString()
        }
      ],
      status: "open"
    };

    const nextSessions = [newSession, ...sessions];
    const nextMovements = [...newSession.movements, ...movements];

    setSessions(nextSessions);
    setMovements(nextMovements);

    await upsertSessions(nextSessions);
    await upsertMovements(nextMovements);
  }

  async function syncNow() {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    const pendingSales = sales.filter((sale) => sale.syncStatus !== "synced");
    for (const sale of pendingSales) {
      await syncSaleToSupabase(sale);
    }

    const pendingMovements = movements.filter((movement) => movement.type !== "opening");
    for (const movement of pendingMovements) {
      await syncMovementToSupabase(movement);
    }

    setQueue([]);
    setStatus((current) => ({ ...current, pendingJobs: 0, lastSyncAt: new Date().toISOString() }));
    await upsertQueue([]);
  }

  return {
    products,
    sales,
    movements,
    sessions,
    parkedSales,
    customers,
    queue,
    status,
    hydrated,
    activeSession,
    recordSale,
    recordMovement,
    cancelSale,
    parkSale,
    deleteParkedSale,
    saveProduct,
    deleteProduct,
    saveCustomer,
    closeActiveSession,
    openNewSession,
    syncNow
  };
}
