"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Check, MessageCircle, Printer, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { paymentLabels } from "@/lib/mock-data";
import { buildWhatsAppLink, buildWhatsAppReceiptMessage, formatPhone } from "@/lib/utils/formatters";
import type { Sale } from "@/lib/types";

export function ReceiptModal({
  sale,
  isOpen,
  onClose
}: {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState(sale?.customer?.phone || "");
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !sale) return null;

  function handlePrint() {
    window.print();
  }

  function handleSendWhatsApp() {
    if (!sale) return;
    const message = buildWhatsAppReceiptMessage(sale);
    const targetPhone = phone || sale?.customer?.phone || "";
    if (targetPhone) {
      const link = buildWhatsAppLink(targetPhone, message);
      window.open(link, "_blank");
    } else {
      const genericLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(genericLink, "_blank");
    }
  }

  async function handleCopyReceiptText() {
    if (!sale) return;
    const message = buildWhatsAppReceiptMessage(sale);
    await navigator.clipboard.writeText(message);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }


  const paymentBreakdown =
    sale.payments && sale.payments.length > 0
      ? sale.payments.map((p) => ({
          label: paymentLabels[p.method] || p.method,
          amount: p.amount
        }))
      : [{ label: paymentLabels[sale.paymentMethod] || sale.paymentMethod, amount: sale.total }];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
    >
      <button type="button" className="absolute inset-0" aria-label="Fechar" onClick={onClose} />
      <div className="relative flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-card shadow-glow">
        {/* Cabeçalho do Modal */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            <h2 id="receipt-modal-title" className="text-base font-bold text-white">
              Comprovante de Venda {sale.number}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar comprovante"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Visualizador de Cupom Térmico (Estilo Bobina 80mm) */}
        <div className="flex-1 overflow-y-auto p-4">
          <div
            id="printable-thermal-receipt"
            className="mx-auto max-w-sm rounded-xl border border-zinc-300 bg-amber-50/95 p-6 font-mono text-xs text-zinc-900 shadow-lg select-text"
          >
            {/* Cabeçalho da Loja */}
            <div className="text-center">
              <h3 className="text-sm font-black tracking-wider uppercase">FJJ PDV - VAREJO & CONVENIÊNCIA</h3>
              <p className="text-[11px] text-zinc-600">CNPJ: 12.345.678/0001-90 · IE: 123.456.789.000</p>
              <p className="text-[11px] text-zinc-600">Av. Paulista, 1000 - Bela Vista - São Paulo / SP</p>
              <p className="text-[11px] text-zinc-600">Tel: (11) 3456-7890</p>
              <div className="my-2 border-b border-dashed border-zinc-400" />
              <p className="font-bold uppercase tracking-widest text-[11px]">CUPOM NÃO FISCAL</p>
              <div className="my-2 border-b border-dashed border-zinc-400" />
            </div>

            {/* Metadados da Venda */}
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>DOC: {sale.number}</span>
                <span>{format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm:ss")}</span>
              </div>
              <div className="flex justify-between">
                <span>OPERADOR: {sale.cashier}</span>
                <span>SESSÃO: #{sale.cashierSessionId.slice(-6)}</span>
              </div>
              {sale.customer ? (
                <div className="mt-1 rounded bg-zinc-200/70 p-1 text-[11px]">
                  <p className="font-bold">CLIENTE: {sale.customer.name || "Consumidor Identificado"}</p>
                  {sale.customer.cpfCnpj ? <p>CPF/CNPJ: {sale.customer.cpfCnpj}</p> : null}
                  {sale.customer.phone ? <p>TEL: {sale.customer.phone}</p> : null}
                </div>
              ) : null}
            </div>

            <div className="my-2 border-b border-dashed border-zinc-400" />

            {/* Cabeçalho de Itens */}
            <div className="grid grid-cols-[1.5fr_0.6fr_0.8fr_0.8fr] font-bold text-[10px] uppercase text-zinc-700">
              <span>Item / Descrição</span>
              <span className="text-center">Qtd</span>
              <span className="text-right">Unit.</span>
              <span className="text-right">Total</span>
            </div>
            <div className="my-1 border-b border-zinc-300" />

            {/* Lista de Itens */}
            <div className="space-y-1.5 text-[11px]">
              {sale.items.map((item, index) => {
                const itemTotal = item.quantity * item.unitPrice - (item.discount || 0);
                return (
                  <div key={index} className="space-y-0.5">
                    <div className="flex justify-between font-semibold">
                      <span className="truncate pr-1">
                        {String(index + 1).padStart(2, "0")} {item.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1.5fr_0.6fr_0.8fr_0.8fr] text-[10px] text-zinc-600">
                      <span className="truncate text-zinc-400">SKU/Item</span>
                      <span className="text-center">{item.quantity} un</span>
                      <span className="text-right">R$ {item.unitPrice.toFixed(2)}</span>
                      <span className="text-right font-bold text-zinc-900">R$ {itemTotal.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="my-2 border-b border-dashed border-zinc-400" />

            {/* Totais */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>QTD. TOTAL DE ITENS:</span>
                <span>{sale.items.reduce((acc, item) => acc + item.quantity, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>R$ {sale.subtotal.toFixed(2)}</span>
              </div>
              {sale.discount > 0 ? (
                <div className="flex justify-between font-semibold text-emerald-800">
                  <span>DESCONTO:</span>
                  <span>- R$ {sale.discount.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm font-black border-t border-b border-zinc-800 py-1 my-1">
                <span>TOTAL A PAGAR:</span>
                <span>R$ {sale.total.toFixed(2)}</span>
              </div>

              {/* Formas de Pagamento */}
              <div className="pt-1">
                <p className="font-bold text-[11px] uppercase">Forma(s) de Pagamento:</p>
                {paymentBreakdown.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span>• {p.label}:</span>
                    <span>R$ {p.amount.toFixed(2)}</span>
                  </div>
                ))}
                {sale.change > 0 ? (
                  <div className="flex justify-between font-bold text-[11px] pt-1">
                    <span>TROCO:</span>
                    <span>R$ {sale.change.toFixed(2)}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="my-3 border-b border-dashed border-zinc-400" />

            {/* Rodapé e Código de Barras Decorativo */}
            <div className="text-center space-y-1">
              <p className="text-[10px] text-zinc-500 uppercase">Sistema FjjPDV - Alta Performance</p>
              <div className="flex justify-center py-1">
                {/* Linhas de código de barras simulado em SVG */}
                <div className="flex h-8 items-center gap-[2px] overflow-hidden">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-black"
                      style={{
                        width: i % 3 === 0 ? "3px" : i % 2 === 0 ? "2px" : "1px",
                        height: "100%"
                      }}
                    />
                  ))}
                </div>
              </div>
              <p className="text-[9px] text-zinc-500 tracking-widest">{sale.id}</p>
              <p className="text-[10px] font-semibold text-zinc-700 pt-1">OBRIGADO PELA PREFERÊNCIA!</p>
            </div>
          </div>
        </div>

        {/* Rodapé com Ações de Impressão e WhatsApp */}
        <div className="shrink-0 space-y-3 border-t border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2">
            <Input
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="WhatsApp do cliente (11) 99999-9999"
              className="h-10 text-sm"
              aria-label="WhatsApp do cliente"
            />
            <Button
              type="button"
              onClick={handleSendWhatsApp}
              className="h-10 gap-1.5 bg-emerald-600 font-semibold text-white hover:bg-emerald-500"
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp</span>
            </Button>
          </div>

          <div className="flex gap-2">
            <Button type="button" onClick={handlePrint} className="h-12 flex-1 gap-2 text-sm font-semibold">
              <Printer className="h-4 w-4" />
              Imprimir Cupom
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyReceiptText}
              className="h-12 gap-2 text-xs text-muted-foreground hover:text-white"
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
              {copiedLink ? "Copiado!" : "Copiar Texto"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
