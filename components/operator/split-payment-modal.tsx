"use client";

import { useState } from "react";
import {
  Banknote,
  Check,
  CircleDollarSign,
  CreditCard,
  Layers,
  Plus,
  QrCode,
  Receipt,
  Trash2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { paymentLabels } from "@/lib/mock-data";
import type { PaymentEntry, PaymentMethod } from "@/lib/types";

export function SplitPaymentModal({
  isOpen,
  onClose,
  total,
  payments,
  onAddPayment,
  onRemovePayment,
  onConfirmSplit
}: {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  payments: PaymentEntry[];
  onAddPayment: (entry: Omit<PaymentEntry, "id">) => void;
  onRemovePayment: (id: string) => void;
  onConfirmSplit: () => void;
}) {
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const remaining = Math.max(total - totalPaid, 0);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("pix");
  const [sliceAmount, setSliceAmount] = useState<number>(remaining || 0);
  const [cashReceived, setCashReceived] = useState<number>(remaining || 0);

  if (!isOpen) return null;

  function handleSelectMethod(method: PaymentMethod) {
    setSelectedMethod(method);
    setSliceAmount(remaining > 0 ? remaining : 0);
    setCashReceived(remaining > 0 ? remaining : 0);
  }

  function handleAddSlice() {
    if (sliceAmount <= 0) return;

    const amountToAdd = Math.min(sliceAmount, remaining);
    const isCash = selectedMethod === "cash";
    const change = isCash && cashReceived > amountToAdd ? cashReceived - amountToAdd : 0;

    onAddPayment({
      method: selectedMethod,
      amount: amountToAdd,
      receivedAmount: isCash ? Math.max(cashReceived, amountToAdd) : amountToAdd,
      change
    });

    const nextRemaining = Math.max(remaining - amountToAdd, 0);
    setSliceAmount(nextRemaining);
    setCashReceived(nextRemaining);
  }

  const isCompleted = totalPaid >= total && total > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="split-modal-title"
    >
      <button type="button" className="absolute inset-0" aria-label="Fechar" onClick={onClose} />
      <div className="relative flex max-h-[95vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-card p-6 shadow-glow">
        {/* Cabeçalho */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 id="split-modal-title" className="text-base font-bold text-white">
                Multi-Pagamento (Pagamento Dividido)
              </h2>
              <p className="text-xs text-muted-foreground">Divida a conta em diferentes cartões, Pix ou dinheiro</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Visor de Saldo / Resumo */}
        <div className="my-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total da Venda</p>
            <p className="font-mono text-xl font-bold text-white">R$ {total.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Total Adicionado</p>
            <p className="font-mono text-xl font-bold text-emerald-400">R$ {totalPaid.toFixed(2)}</p>
          </div>
          <div
            className={`rounded-2xl border p-3 text-center ${
              remaining > 0 ? "border-amber-500/30 bg-amber-500/10" : "border-emerald-500/30 bg-emerald-500/10"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">Saldo Restante</p>
            <p className={`font-mono text-xl font-bold ${remaining > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              R$ {remaining.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto py-2 md:grid-cols-[1.3fr_1fr]">
          {/* Seletor de Nova Parcela */}
          <div className="space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Adicionar Parcela de Pagamento
            </span>

            {/* Grid de Métodos */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectMethod("pix")}
                className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                  selectedMethod === "pix"
                    ? "border-teal-400 bg-teal-500/20 text-teal-300"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:text-white"
                }`}
              >
                <QrCode className="h-4 w-4" /> Pix
              </button>
              <button
                type="button"
                onClick={() => handleSelectMethod("credit")}
                className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                  selectedMethod === "credit"
                    ? "border-blue-400 bg-blue-500/20 text-blue-300"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:text-white"
                }`}
              >
                <CreditCard className="h-4 w-4" /> Crédito
              </button>
              <button
                type="button"
                onClick={() => handleSelectMethod("debit")}
                className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                  selectedMethod === "debit"
                    ? "border-indigo-400 bg-indigo-500/20 text-indigo-300"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:text-white"
                }`}
              >
                <CreditCard className="h-4 w-4" /> Débito
              </button>
              <button
                type="button"
                onClick={() => handleSelectMethod("cash")}
                className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                  selectedMethod === "cash"
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:text-white"
                }`}
              >
                <CircleDollarSign className="h-4 w-4" /> Dinheiro
              </button>
            </div>

            {/* Campos de Valor */}
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <div>
                <label className="text-xs font-medium text-white flex justify-between">
                  <span>Valor a Pagar nesta Forma (R$)</span>
                  {remaining > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSliceAmount(remaining)}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Pagar restante (R$ {remaining.toFixed(2)})
                    </button>
                  ) : null}
                </label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={sliceAmount || ""}
                  onChange={(e) => setSliceAmount(Number(e.target.value))}
                  className="mt-1 h-11 text-base font-bold font-mono"
                  placeholder="0.00"
                />
              </div>

              {selectedMethod === "cash" ? (
                <div>
                  <label className="text-xs font-medium text-white flex justify-between">
                    <span>Valor em Dinheiro Recebido (p/ troco)</span>
                    {cashReceived > sliceAmount ? (
                      <span className="text-[10px] text-emerald-400 font-bold">
                        Troco: R$ {(cashReceived - sliceAmount).toFixed(2)}
                      </span>
                    ) : null}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashReceived || ""}
                    onChange={(e) => setCashReceived(Number(e.target.value))}
                    className="mt-1 h-10 font-mono text-sm"
                    placeholder="0.00"
                  />
                </div>
              ) : null}

              <Button
                type="button"
                onClick={handleAddSlice}
                disabled={sliceAmount <= 0 || remaining <= 0}
                className="w-full gap-2 font-semibold h-11"
              >
                <Plus className="h-4 w-4" />
                Adicionar {paymentLabels[selectedMethod]} (R$ {sliceAmount.toFixed(2)})
              </Button>
            </div>
          </div>

          {/* Lista de Parcelas Adicionadas */}
          <div className="flex flex-col space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Parcelas Inclusas ({payments.length})
              </span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-[240px] pr-1">
              {payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center text-xs text-muted-foreground">
                  <Receipt className="h-6 w-6 text-muted-foreground/40" />
                  <p>Nenhuma parcela adicionada ainda.</p>
                  <p className="text-[10px] text-muted-foreground/70">Adicione ao lado os valores parciais.</p>
                </div>
              ) : (
                payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-2.5"
                  >
                    <div>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {paymentLabels[p.method] || p.method}
                      </Badge>
                      {p.receivedAmount && p.receivedAmount > p.amount ? (
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                          Recebido R$ {p.receivedAmount.toFixed(2)} · Troco R$ {(p.receivedAmount - p.amount).toFixed(2)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white">R$ {p.amount.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => onRemovePayment(p.id)}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                        aria-label="Remover parcela"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Rodapé com Conclusão */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Voltar
          </Button>

          <Button
            type="button"
            onClick={() => {
              onConfirmSplit();
              onClose();
            }}
            disabled={!isCompleted}
            className="gap-2 bg-purple-600 px-6 font-bold text-white hover:bg-purple-500"
          >
            <Check className="h-4 w-4" />
            Concluir Multi-Pagamento
          </Button>
        </div>
      </div>
    </div>
  );
}
