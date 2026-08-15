"use client";

import { useEffect, useState } from "react";
import type { CashMovement, CashSession, PdvSnapshot, PendingSyncJob, Product, Sale } from "@/lib/types";
import { loadSnapshot, saveSnapshot, upsertMovements, upsertProducts, upsertQueue, upsertSales } from "@/lib/local-db";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { demoProducts } from "@/lib/mock-data";

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
  movements: [
    { id: "movement-opening", type: "opening", amount: 250, note: "Abertura do caixa", createdAt: new Date().toISOString() }
  ],
  status: "open"
};

/**
 * Fonte unica de verdade para os dados operacionais do PDV.
 *
 * Mantem as funcoes embarcadas originais intactas:
 * - persistencia local em IndexedDB (grava a cada mudanca);
 * - fila de sincronizacao para vendas e movimentos pendentes;
 * - deteccao online/offline via eventos do browser;
 * - sync oportunista com Supabase quando a rede volta.
 *
 * A UI (operador ou admin) so consome o estado e as acoes daqui, sem saber
 * como a persistencia ou o sync funcionam por baixo.
 */
export function useOfflineStore() {
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>(defaultSession.movements);
  const [sessions, setSessions] = useState<CashSession[]>([defaultSession]);
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

    const snapshot: PdvSnapshot = { products, sales, movements, sessions, queue };
    saveSnapshot(snapshot);
  }, [hydrated, movements, products, queue, sales, sessions]);

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
      unit_price: item.unitPrice
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

    setProducts(updatedProducts);
    setSales(nextSales);
    setQueue(nextQueue);
    setSessions((current) => [
      { ...activeSession, totalCashSales: activeSession.totalCashSales + (sale.paymentMethod === "cash" ? sale.total : 0) },
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

  /**
   * Cancelamento de venda (estorno). So deve ser chamado a partir de um
   * contexto autorizado (papel admin) — repoe o estoque, ajusta o caixa
   * quando a venda era em dinheiro, grava motivo/autor para auditoria e
   * tenta sincronizar a baixa com o Supabase.
   */
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

    if (sale.paymentMethod === "cash") {
      setSessions((current) => [
        { ...activeSession, totalCashSales: Math.max(activeSession.totalCashSales - sale.total, 0) },
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
    queue,
    status,
    hydrated,
    activeSession,
    recordSale,
    recordMovement,
    cancelSale,
    syncNow
  };
}
