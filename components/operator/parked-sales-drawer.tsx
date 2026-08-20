"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, PauseCircle, Play, Plus, Tag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CartItem, CustomerInfo, ParkedSale } from "@/lib/types";

export function ParkedSalesDrawer({
  isOpen,
  onClose,
  cart,
  customerDiscount,
  customer,
  parkedSales,
  onParkSale,
  onResumeSale,
  onDeleteParkedSale
}: {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  customerDiscount: number;
  customer: CustomerInfo | null;
  parkedSales: ParkedSale[];
  onParkSale: (label: string) => Promise<void>;
  onResumeSale: (parkedSale: ParkedSale) => void;
  onDeleteParkedSale: (parkedSaleId: string) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [isParking, setIsParking] = useState(false);

  if (!isOpen) return null;

  async function handlePark() {
    if (cart.length === 0) return;
    setIsParking(true);
    await onParkSale(label);
    setLabel("");
    setIsParking(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="parked-sales-title"
    >
      <button type="button" className="absolute inset-0" aria-label="Fechar gaveta" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col gap-4 border-l border-white/10 bg-card p-5 shadow-glow">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <PauseCircle className="h-5 w-5 text-amber-400" />
            <div>
              <h2 id="parked-sales-title" className="text-base font-bold text-white">
                Vendas em Espera / Comandas
              </h2>
              <p className="text-xs text-muted-foreground">Suspenda ou retome atendimentos rapidamente</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Estacionar Venda Atual */}
        {cart.length > 0 ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-amber-300">
                Colocar Venda Atual em Espera
              </span>
              <Badge variant="warning">{cart.length} {cart.length === 1 ? "item" : "itens"}</Badge>
            </div>

            <div className="flex gap-2">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Identificação (ex: Mesa 04, Cliente João...)"
                className="h-10 text-xs bg-black/30 border-amber-500/30"
                aria-label="Identificação da venda em espera"
                onKeyDown={(e) => e.key === "Enter" && handlePark()}
              />
              <Button
                type="button"
                onClick={handlePark}
                disabled={isParking}
                className="h-10 gap-1 bg-amber-500 font-semibold text-black hover:bg-amber-400"
              >
                <Plus className="h-4 w-4" />
                <span>Salvar</span>
              </Button>
            </div>
            <p className="text-[11px] text-amber-200/70">
              O carrinho atual será guardado e o caixa ficará livre para o próximo cliente.
            </p>
          </div>
        ) : null}

        {/* Lista de Vendas em Espera */}
        <div className="flex-1 space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Comandas Ativas ({parkedSales.length})
            </span>
          </div>

          {parkedSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 p-8 text-center text-muted-foreground">
              <Tag className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">Nenhuma venda em espera no momento.</p>
              <p className="text-xs text-muted-foreground/80">
                Monte um carrinho e clique em &quot;Colocar em Espera&quot; para suspender um pedido.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {parkedSales.map((item) => {
                const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ptBR });
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 transition hover:border-amber-400/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400">{item.code}</span>
                          <span className="text-sm font-semibold text-white">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{timeAgo}</span>
                          {item.customer?.name ? <span>· {item.customer.name}</span> : null}
                        </div>
                      </div>
                      <span className="font-mono text-base font-bold text-primary">R$ {item.total.toFixed(2)}</span>
                    </div>

                    {/* Preview de Itens */}
                    <div className="rounded-xl bg-black/30 p-2.5 text-[11px] space-y-1 text-muted-foreground">
                      {item.cart.slice(0, 3).map((ci, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate pr-2">{ci.quantity}x {ci.name}</span>
                          <span className="font-mono text-white/90">R$ {(ci.quantity * ci.unitPrice).toFixed(2)}</span>
                        </div>
                      ))}
                      {item.cart.length > 3 ? (
                        <p className="text-[10px] text-muted-foreground italic">
                          + {item.cart.length - 3} outro(s) item(ns)...
                        </p>
                      ) : null}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => {
                          onResumeSale(item);
                          onClose();
                        }}
                        className="flex-1 gap-1.5 h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Retomar Venda no Caixa
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onDeleteParkedSale(item.id)}
                        className="h-9 px-3 text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                        aria-label="Excluir comanda"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
