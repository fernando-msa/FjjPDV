"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBar } from "@/components/shared/status-bar";
import { LoginScreen } from "@/components/auth/login-screen";
import { OperatorScreen } from "@/components/operator/operator-screen";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { useAuth } from "@/lib/hooks/use-auth";
import { useOfflineStore } from "@/lib/hooks/use-offline-store";
import { useCart } from "@/lib/hooks/use-cart";
import type { CashMovement, Sale } from "@/lib/types";

export function PdvApp() {
  const auth = useAuth();
  const store = useOfflineStore();
  const cart = useCart();
  const [view, setView] = useState<"caixa" | "painel">("caixa");

  const cashBalance =
    store.activeSession.openingBalance +
    store.movements.reduce((acc, movement) => acc + (movement.type === "supply" ? movement.amount : movement.type === "withdrawal" ? -movement.amount : 0), 0);

  async function finalizeSale(): Promise<Sale | null> {
    if (!cart.canFinalize) {
      return null;
    }

    const sale: Sale = {
      id: `sale-${Date.now()}`,
      number: `PDV-${String(store.sales.length + 1).padStart(6, "0")}`,
      total: cart.total,
      subtotal: cart.subtotal,
      discount: cart.customerDiscount,
      paymentMethod: cart.paymentMethod,
      paidAmount: cart.totalPaid,
      change: cart.change,
      items: cart.cart.map((item) => ({ productId: item.productId, name: item.name, quantity: item.quantity, unitPrice: item.unitPrice })),
      cashier: auth.authState?.fullName ?? "Operador",
      cashierSessionId: store.activeSession.id,
      createdAt: new Date().toISOString(),
      syncStatus: navigator.onLine ? "synced" : "pending",
      syncedAt: navigator.onLine ? new Date().toISOString() : undefined,
      status: "completed"
    };

    const updatedProducts = store.products.map((product) => {
      const soldItem = cart.cart.find((item) => item.productId === product.id);
      if (!soldItem) {
        return product;
      }
      return { ...product, stock: Math.max(product.stock - soldItem.quantity, 0) };
    });

    await store.recordSale(sale, updatedProducts);
    cart.resetSaleForm();

    return sale;
  }

  async function supplyMovement(amount: number, note: string) {
    const movement: CashMovement = {
      id: `movement-${Date.now()}`,
      type: "supply",
      amount,
      note: note || "Suprimento manual",
      createdAt: new Date().toISOString()
    };
    await store.recordMovement(movement);
  }

  async function withdrawalMovement(amount: number) {
    const movement: CashMovement = {
      id: `movement-${Date.now()}`,
      type: "withdrawal",
      amount,
      note: "Sangria registrada no caixa",
      createdAt: new Date().toISOString()
    };
    await store.recordMovement(movement);
  }

  async function cancelSale(saleId: string, reason: string) {
    await store.cancelSale(saleId, reason, auth.authState?.fullName ?? "Admin");
  }

  if (auth.authLoading) {
    return (
      <main className="pdv-grid flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-sm text-muted-foreground">Carregando autenticacao...</CardContent>
        </Card>
      </main>
    );
  }

  if (!auth.authState) {
    return <LoginScreen auth={auth} />;
  }

  // A tela de caixa nunca deve rolar (monitor de operador): o shell ocupa
  // exatamente 100vh e apenas o painel administrativo, quando aberto, rola.
  const isCheckoutView = !(view === "painel" && auth.isAdmin);

  return (
    <main className="pdv-grid h-screen overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[1800px] flex-col gap-3 p-3 md:gap-4 md:p-4 xl:p-5">
        <StatusBar
          operatorName={auth.authState.fullName}
          isAdmin={auth.isAdmin}
          status={store.status}
          view={view}
          onChangeView={setView}
          onSignOut={auth.handleSignOut}
          onSyncNow={store.syncNow}
          isDemoMode={auth.isDemoMode}
          onSwitchDemoRole={auth.switchDemoRole}
        />

        <div className={`min-h-0 flex-1 ${isCheckoutView ? "" : "overflow-y-auto"}`}>
          {view === "painel" && auth.isAdmin ? (
            <AdminDashboard
            products={store.products}
            sales={store.sales}
            activeSession={store.activeSession}
            cashBalance={cashBalance}
            status={store.status}
            onCancelSale={cancelSale}
          />
          ) : (
            <OperatorScreen
              products={store.products}
              activeSession={store.activeSession}
              movements={store.movements}
              cart={cart}
              onFinalizeSale={finalizeSale}
              onSupplyMovement={supplyMovement}
              onWithdrawalMovement={withdrawalMovement}
            />
          )}
        </div>
      </div>
    </main>
  );
}
