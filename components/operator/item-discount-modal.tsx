"use client";

import { useState } from "react";
import { Percent, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CartItem } from "@/lib/types";

export function ItemDiscountModal({
  item,
  isOpen,
  onClose,
  onApplyDiscount
}: {
  item: CartItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyDiscount: (productId: string, discount: number) => void;
}) {
  const [mode, setMode] = useState<"fixed" | "percent">("fixed");
  const [fixedVal, setFixedVal] = useState<number>(item?.discount || 0);
  const [percentVal, setPercentVal] = useState<number>(0);

  if (!isOpen || !item) return null;

  const itemTotal = item.unitPrice * item.quantity;

  function handleApply() {
    if (!item) return;
    let finalDiscount = 0;
    if (mode === "fixed") {
      finalDiscount = Math.min(Math.max(fixedVal, 0), itemTotal);
    } else {
      finalDiscount = itemTotal * (Math.min(Math.max(percentVal, 0), 100) / 100);
    }

    onApplyDiscount(item.productId, finalDiscount);
    onClose();
  }


  function handlePreset(p: number) {
    setMode("percent");
    setPercentVal(p);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-discount-title"
    >
      <button type="button" className="absolute inset-0" aria-label="Fechar" onClick={onClose} />
      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-white/10 bg-card p-5 shadow-glow">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <div>
              <h2 id="item-discount-title" className="text-sm font-bold text-white">
                Desconto no Item
              </h2>
              <p className="text-xs text-muted-foreground truncate max-w-[220px]">{item.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1 text-muted-foreground hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Resumo do Item */}
        <div className="flex justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
          <div>
            <span className="text-muted-foreground">Valor Bruto:</span>
            <p className="font-mono text-sm font-bold text-white">
              {item.quantity}x R$ {item.unitPrice.toFixed(2)} = R$ {itemTotal.toFixed(2)}
            </p>
          </div>
          {item.discount ? (
            <div className="text-right">
              <span className="text-emerald-400">Desconto Atual:</span>
              <p className="font-mono text-sm font-bold text-emerald-400">- R$ {item.discount.toFixed(2)}</p>
            </div>
          ) : null}
        </div>

        {/* Tipo de Desconto */}
        <div className="flex gap-2 rounded-xl bg-black/20 p-1">
          <button
            type="button"
            onClick={() => setMode("fixed")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
              mode === "fixed" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"
            }`}
          >
            Reais (R$)
          </button>
          <button
            type="button"
            onClick={() => setMode("percent")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
              mode === "percent" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"
            }`}
          >
            Porcentagem (%)
          </button>
        </div>

        {/* Campo de Entrada */}
        {mode === "fixed" ? (
          <div>
            <label className="text-xs font-medium text-white">Valor do Desconto em Reais</label>
            <Input
              type="number"
              min="0"
              max={itemTotal}
              step="0.01"
              value={fixedVal || ""}
              onChange={(e) => setFixedVal(Number(e.target.value))}
              className="mt-1 h-11 font-mono text-base font-bold"
              placeholder="0.00"
            />
          </div>
        ) : (
          <div>
            <label className="text-xs font-medium text-white">Porcentagem de Desconto (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              step="1"
              value={percentVal || ""}
              onChange={(e) => setPercentVal(Number(e.target.value))}
              className="mt-1 h-11 font-mono text-base font-bold"
              placeholder="Ex: 10"
            />
          </div>
        )}

        {/* Atalhos Rápidos de Porcentagem */}
        <div className="flex gap-1.5">
          {[5, 10, 15, 20].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePreset(p)}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-white"
            >
              {p}%
            </button>
          ))}
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onApplyDiscount(item.productId, 0);
              onClose();
            }}
            className="text-xs text-rose-400 hover:bg-rose-950/20"
          >
            Zerar
          </Button>
          <Button type="button" onClick={handleApply} className="flex-1 text-xs font-semibold">
            Aplicar Desconto
          </Button>
        </div>
      </div>
    </div>
  );
}
