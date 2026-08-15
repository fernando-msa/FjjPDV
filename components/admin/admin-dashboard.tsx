"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Ban, Barcode, Calculator, CircleDollarSign, ShoppingCart, Signal, WalletCards, WifiOff, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetricCard, MiniStatus, SummaryLine } from "@/components/shared/pdv-ui";
import { demoMetrics, paymentLabels } from "@/lib/mock-data";
import type { CashSession, Sale, Product } from "@/lib/types";
import type { SyncState } from "@/lib/hooks/use-offline-store";

export function AdminDashboard({
  products,
  sales,
  activeSession,
  cashBalance,
  status,
  onCancelSale
}: {
  products: Product[];
  sales: Sale[];
  activeSession: CashSession;
  cashBalance: number;
  status: SyncState;
  onCancelSale: (saleId: string, reason: string) => Promise<void>;
}) {
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const lowStockItems = products.filter((product) => product.stock <= product.minStock).slice(0, 6);
  const recentSales = sales.slice(0, 6);

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

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Faturamento de hoje" value={metrics.revenueToday} icon={<CircleDollarSign className="h-5 w-5" />} suffix="BRL" accent="from-primary/20 to-primary/5" />
        <MetricCard title="Ticket medio" value={metrics.averageTicket} icon={<Calculator className="h-5 w-5" />} suffix="BRL" accent="from-accent/20 to-accent/5" />
        <MetricCard title="Vendas no dia" value={metrics.salesToday} icon={<ShoppingCart className="h-5 w-5" />} suffix="vendas" accent="from-accent/25 to-accent/5" />
        <MetricCard title="Caixa atual" value={cashBalance} icon={<WalletCards className="h-5 w-5" />} suffix="BRL" accent="from-primary/25 to-primary/5" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Estoque e alertas</CardTitle>
            <CardDescription>Margem, preco de custo e ponto minimo com atualizacao automatica pos-venda.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3">Preco</th>
                    <th className="px-4 py-3">Custo</th>
                    <th className="px-4 py-3">Margem</th>
                    <th className="px-4 py-3">Estoque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {products.slice(0, 8).map((product) => {
                    const margin = ((product.price - product.cost) / product.cost) * 100;
                    return (
                      <tr key={product.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{product.name}</div>
                          <div className="text-xs text-muted-foreground">{product.category}</div>
                        </td>
                        <td className="px-4 py-3">R$ {product.price.toFixed(2)}</td>
                        <td className="px-4 py-3">R$ {product.cost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-primary">{margin.toFixed(1)}%</td>
                        <td className="px-4 py-3">
                          <Badge variant={product.stock <= product.minStock ? "warning" : "success"}>
                            {product.stock} / {product.minStock}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {lowStockItems.length > 0 ? (
              <p className="mt-3 text-sm text-yellow-300">{lowStockItems.length} produto(s) abaixo do estoque minimo.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operacao e sincronizacao</CardTitle>
            <CardDescription>Visao tecnica da fila local e dos perfis de acesso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <WifiOff className="h-4 w-4 text-primary" aria-hidden="true" />
                Fila local e integracao
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Vendas e movimentos ficam guardados no IndexedDB primeiro. Quando o Supabase estiver acessivel, o sistema sincroniza a fila sem travar a operacao do caixa.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-white">
                <Signal className="h-4 w-4 text-primary" aria-hidden="true" />
                Perfis e permissao
              </div>
              <p className="mt-2">Admin ve a plataforma completa e autoriza cancelamentos; operador fica restrito ao checkout e ao caixa.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-white">
                <Signal className="h-4 w-4 text-primary" aria-hidden="true" />
                Ultima sincronizacao
              </div>
              <p className="mt-2">{status.lastSyncAt ? format(new Date(status.lastSyncAt), "dd/MM/yyyy HH:mm:ss") : "Sem sincronizacao nesta sessao"}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h4 className="flex items-center gap-2 text-sm font-medium text-white">
                <Barcode className="h-4 w-4 text-primary" aria-hidden="true" />
                Atalhos de uso rapido
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>F2: foco na busca de produtos</li>
                <li>F4: finalizar venda</li>
                <li>Ctrl+S: registrar suprimento</li>
              </ul>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MiniStatus label="Abertura do caixa" value={format(new Date(activeSession.openedAt), "dd/MM HH:mm")} />
              <MiniStatus label="Status do caixa" value={activeSession.status === "open" ? "Aberto" : "Fechado"} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Ultimas vendas</CardTitle>
            <CardDescription>
              Historico persistido localmente com estado de sincronizacao por venda.
              {canceledCount > 0 ? ` ${canceledCount} cancelada(s) nesta lista.` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recentSales.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-sm text-muted-foreground">
                  Nenhuma venda registrada ainda.
                </div>
              ) : (
                recentSales.map((sale) => {
                  const canceled = sale.status === "canceled";
                  return (
                    <div key={sale.id} className={`rounded-2xl border p-4 ${canceled ? "border-destructive/25 bg-destructive/5" : "border-white/10 bg-white/5"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{sale.number}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm")}</p>
                        </div>
                        {canceled ? (
                          <Badge variant="danger">cancelada</Badge>
                        ) : (
                          <Badge variant={sale.syncStatus === "synced" ? "success" : sale.syncStatus === "failed" ? "danger" : "warning"}>{sale.syncStatus}</Badge>
                        )}
                      </div>
                      <div className="mt-4 space-y-1">
                        <SummaryLine label="Total" value={sale.total} strong />
                        <SummaryLine label="Pagamento" value={paymentLabels[sale.paymentMethod]} />
                        <SummaryLine label="Itens" value={sale.items.length} />
                      </div>
                      {canceled ? (
                        <p className="mt-2 text-xs text-destructive/90">
                          Motivo: {sale.cancelReason} · por {sale.canceledBy}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSaleToCancel(sale)}
                          className="mt-3 flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                        >
                          <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                          Cancelar venda
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
                <Ban className="h-5 w-5 text-destructive" aria-hidden="true" />
                Cancelar venda {saleToCancel.number}
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

            <p className="text-sm text-muted-foreground">
              O estoque dos itens sera reposto automaticamente e, se o pagamento foi em dinheiro, o valor sai do total do caixa. Essa acao fica registrada com seu nome e nao pode ser desfeita.
            </p>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <SummaryLine label="Total da venda" value={saleToCancel.total} strong />
              <SummaryLine label="Pagamento" value={paymentLabels[saleToCancel.paymentMethod]} />
            </div>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-white">Motivo do cancelamento (obrigatorio)</span>
              <Input
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Ex.: item errado, cliente desistiu, erro de operador"
                aria-label="Motivo do cancelamento"
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
                Confirmar cancelamento
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
    </div>
  );
}
