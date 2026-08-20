"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Ban,
  Barcode,
  Calculator,
  CircleDollarSign,
  Download,
  Edit2,
  Lock,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Signal,
  Trash2,
  WalletCards,
  WifiOff,
  X
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetricCard, MiniStatus, SummaryLine } from "@/components/shared/pdv-ui";
import { ProductFormModal } from "@/components/admin/product-form-modal";
import { demoMetrics, paymentLabels } from "@/lib/mock-data";
import type { CashSession, Product, Sale } from "@/lib/types";
import type { SyncState } from "@/lib/hooks/use-offline-store";

export function AdminDashboard({
  products,
  sales,
  sessions = [],
  activeSession,
  cashBalance,
  status,
  onCancelSale,
  onSaveProduct,
  onDeleteProduct
}: {
  products: Product[];
  sales: Sale[];
  sessions?: CashSession[];
  activeSession: CashSession;
  cashBalance: number;
  status: SyncState;
  onCancelSale: (saleId: string, reason: string) => Promise<void>;
  onSaveProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
}) {
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Gestão de Produtos
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("Todos");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const productCategories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category)));
    return ["Todos", ...cats];
  }, [products]);

  const filteredAdminProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    return products.filter((p) => {
      const matchCat = productCategoryFilter === "Todos" || p.category === productCategoryFilter;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, productSearch, productCategoryFilter]);

  const lowStockItems = products.filter((product) => product.stock <= product.minStock);
  const recentSales = sales.slice(0, 9);
  const closedSessions = sessions.filter((s) => s.status === "closed");

  const metrics = useMemo(() => {
    const validSales = sales.filter((sale) => sale.status !== "canceled");
    const revenue = validSales.reduce((accumulator, sale) => accumulator + sale.total, 0);
    return {
      ...demoMetrics,
      salesToday: validSales.length || demoMetrics.salesToday,
      revenueToday: revenue || demoMetrics.revenueToday,
      averageTicket: validSales.length > 0 ? revenue / validSales.length : demoMetrics.averageTicket
    };
  }, [sales]);

  const canceledCount = sales.filter((sale) => sale.status === "canceled").length;

  async function confirmCancel() {
    if (!saleToCancel || cancelReason.trim().length < 3) {
      return;
    }
    await onCancelSale(saleToCancel.id, cancelReason.trim());
    setSaleToCancel(null);
    setCancelReason("");
  }

  function handleOpenNewProduct() {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  }

  function handleEditProduct(prod: Product) {
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  }

  function exportSalesCsv() {
    const headers = ["ID", "Número", "Data/Hora", "Status", "Operador", "Cliente", "CPF", "Subtotal", "Desconto", "Total", "Pagamento", "Qtd Itens"];
    const rows = sales.map((s) => [
      s.id,
      s.number,
      format(new Date(s.createdAt), "yyyy-MM-dd HH:mm:ss"),
      s.status,
      `"${s.cashier}"`,
      `"${s.customer?.name || "Consumidor"}"`,
      s.customer?.cpfCnpj || "",
      s.subtotal.toFixed(2),
      s.discount.toFixed(2),
      s.total.toFixed(2),
      paymentLabels[s.paymentMethod] || s.paymentMethod,
      s.items.reduce((acc, i) => acc + i.quantity, 0)
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio-vendas-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6 pb-8">
      {/* 4 Cards de Métricas Principais */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Faturamento de Hoje"
          value={metrics.revenueToday}
          icon={<CircleDollarSign className="h-5 w-5" />}
          suffix="BRL"
          accent="from-primary/20 to-primary/5"
        />
        <MetricCard
          title="Ticket Médio"
          value={metrics.averageTicket}
          icon={<Calculator className="h-5 w-5" />}
          suffix="BRL"
          accent="from-accent/20 to-accent/5"
        />
        <MetricCard
          title="Vendas Concluídas"
          value={metrics.salesToday}
          icon={<ShoppingCart className="h-5 w-5" />}
          suffix="vendas"
          accent="from-accent/25 to-accent/5"
        />
        <MetricCard
          title="Caixa Atual em Gaveta"
          value={cashBalance}
          icon={<WalletCards className="h-5 w-5" />}
          suffix="BRL"
          accent="from-primary/25 to-primary/5"
        />
      </section>

      {/* Gestão Completa de Produtos & Estoque (CRUD) */}
      <section>
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Catálogo e Gestão de Produtos ({products.length})
              </CardTitle>
              <CardDescription>
                Controle de custos, precificação, margem de lucro e reposição de estoque em tempo real.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleOpenNewProduct} className="gap-1.5 font-semibold">
                <Plus className="h-4 w-4" />
                Novo Produto
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Barra de Filtros e Busca */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar produto por nome, SKU ou código de barras..."
                  className="h-10 pl-9 text-sm"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {productCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setProductCategoryFilter(cat)}
                    className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                      productCategoryFilter === cat
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabela de Produtos */}
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Produto / SKU</th>
                    <th className="px-4 py-3">Cód. Barras</th>
                    <th className="px-4 py-3">Preço Venda</th>
                    <th className="px-4 py-3">Custo</th>
                    <th className="px-4 py-3">Margem</th>
                    <th className="px-4 py-3">Estoque</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAdminProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        Nenhum produto encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredAdminProducts.map((product) => {
                      const margin = product.cost > 0 ? ((product.price - product.cost) / product.cost) * 100 : 100;
                      return (
                        <tr key={product.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-white">{product.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {product.category} · <span className="font-mono">{product.sku}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{product.barcode}</td>
                          <td className="px-4 py-3 font-mono font-bold text-white">R$ {product.price.toFixed(2)}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">R$ {product.cost.toFixed(2)}</td>
                          <td className="px-4 py-3 font-mono text-primary font-semibold">{margin.toFixed(1)}%</td>
                          <td className="px-4 py-3">
                            <Badge variant={product.stock <= product.minStock ? "warning" : "success"}>
                              {product.stock} {product.unit} (mín {product.minStock})
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditProduct(product)}
                                className="rounded-lg border border-white/10 p-1.5 text-muted-foreground hover:border-primary/40 hover:text-white"
                                title="Editar produto"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteProduct(product.id)}
                                className="rounded-lg border border-white/10 p-1.5 text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                                title="Excluir produto"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {lowStockItems.length > 0 ? (
              <p className="text-xs text-yellow-400">
                ⚠️ Alerta de reposição: {lowStockItems.length} produto(s) estão no nível ou abaixo do estoque mínimo.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {/* Histórico de Vendas & Relatórios */}
      <section>
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Últimas Vendas Realizadas ({sales.length})
              </CardTitle>
              <CardDescription>
                Histórico sincronizado e auditável. {canceledCount > 0 ? ` ${canceledCount} venda(s) cancelada(s).` : ""}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={exportSalesCsv} className="gap-2 text-xs font-semibold">
              <Download className="h-4 w-4 text-primary" />
              Exportar Relatório CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recentSales.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-muted-foreground">
                  Nenhuma venda registrada ainda no sistema.
                </div>
              ) : (
                recentSales.map((sale) => {
                  const canceled = sale.status === "canceled";
                  return (
                    <div
                      key={sale.id}
                      className={`rounded-2xl border p-4 transition ${
                        canceled ? "border-destructive/30 bg-destructive/5" : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-white">{sale.number}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm")} · {sale.cashier}
                          </p>
                          {sale.customer ? (
                            <p className="text-[11px] text-primary/80 font-medium mt-0.5">
                              Cliente: {sale.customer.name}
                            </p>
                          ) : null}
                        </div>
                        {canceled ? (
                          <Badge variant="danger">Cancelada</Badge>
                        ) : (
                          <Badge
                            variant={
                              sale.syncStatus === "synced"
                                ? "success"
                                : sale.syncStatus === "failed"
                                ? "danger"
                                : "warning"
                            }
                          >
                            {sale.syncStatus}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-3 space-y-1">
                        <SummaryLine label="Total" value={sale.total} strong />
                        <SummaryLine label="Pagamento" value={paymentLabels[sale.paymentMethod] || sale.paymentMethod} />
                        <SummaryLine label="Itens" value={sale.items.length} />
                      </div>
                      {canceled ? (
                        <p className="mt-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive/90">
                          Motivo: {sale.cancelReason} · por {sale.canceledBy}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSaleToCancel(sale)}
                          className="mt-3 flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive transition"
                        >
                          <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                          Estornar / Cancelar Venda
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Histórico de Fechamentos de Caixa & Auditoria Técnica */}
      <section className="grid gap-4 xl:grid-cols-2">
        {/* Histórico de Turnos Fechados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-rose-400" />
              Auditoria de Fechamentos de Caixa
            </CardTitle>
            <CardDescription>Conferência cega de valores esperados vs informados por turno.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {closedSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">
                Nenhum fechamento de turno anterior arquivado.
              </div>
            ) : (
              closedSessions.map((session) => (
                <div key={session.id} className="rounded-2xl border border-white/10 bg-white/5 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      Turno Fechado em {session.closedAt ? format(new Date(session.closedAt), "dd/MM/yyyy HH:mm") : "Recente"}
                    </span>
                    {session.closingSummary ? (
                      <Badge
                        variant={Math.abs(session.closingSummary.difference) < 0.01 ? "success" : "warning"}
                      >
                        {Math.abs(session.closingSummary.difference) < 0.01
                          ? "Exato"
                          : `Dif: R$ ${session.closingSummary.difference.toFixed(2)}`}
                      </Badge>
                    ) : null}
                  </div>
                  {session.closingSummary ? (
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground bg-black/20 p-2 rounded-xl">
                      <div>Esperado: R$ {session.closingSummary.expectedTotal.toFixed(2)}</div>
                      <div>Informado: R$ {session.closingSummary.reportedTotal.toFixed(2)}</div>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Integração e Status Técnico */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Signal className="h-5 w-5 text-primary" />
              Sincronização & Segurança
            </CardTitle>
            <CardDescription>Resiliência offline-first com PostgreSQL e IndexedDB.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-white">
                <WifiOff className="h-4 w-4 text-primary" />
                Resiliência Offline-First
              </div>
              <p className="mt-1">
                Todas as operações (vendas, clientes, comandas, produtos e caixa) são gravadas localmente em IndexedDB e
                sincronizadas automaticamente quando há conectividade.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MiniStatus label="Abertura do Caixa Atual" value={format(new Date(activeSession.openedAt), "dd/MM HH:mm")} />
              <MiniStatus label="Status da Fila" value={`${status.pendingJobs} pendências`} />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Modal de Cancelamento de Venda */}
      {saleToCancel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Cancelar venda">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Fechar"
            onClick={() => {
              setSaleToCancel(null);
              setCancelReason("");
            }}
          />
          <div className="relative w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-card p-5 shadow-glow">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Ban className="h-5 w-5 text-destructive" />
                Cancelar Venda {saleToCancel.number}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSaleToCancel(null);
                  setCancelReason("");
                }}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              O estoque dos itens será reposto automaticamente e o caixa será recalculado com registro de auditoria.
            </p>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <SummaryLine label="Total da venda" value={saleToCancel.total} strong />
              <SummaryLine label="Pagamento" value={paymentLabels[saleToCancel.paymentMethod] || saleToCancel.paymentMethod} />
            </div>

            <label className="space-y-1 text-xs block">
              <span className="font-medium text-white">Motivo do cancelamento (obrigatório)</span>
              <Input
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Ex: Item inserido incorretamente / desistência"
                className="h-10"
              />
            </label>

            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={confirmCancel}
                disabled={cancelReason.trim().length < 3}
              >
                <Ban className="h-4 w-4" />
                Confirmar Cancelamento
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSaleToCancel(null);
                  setCancelReason("");
                }}
              >
                Voltar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal de Formulário de Produto */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        onSave={onSaveProduct}
      />
    </div>
  );
}
