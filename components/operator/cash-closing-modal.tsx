"use client";

import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Banknote, CheckCircle, CheckCircle2, Lock, Printer, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CashSession, SessionClosingSummary } from "@/lib/types";

export function CashClosingModal({
  isOpen,
  onClose,
  activeSession,
  onCloseSession
}: {
  isOpen: boolean;
  onClose: () => void;
  activeSession: CashSession;
  onCloseSession: (data: {
    reportedCash: number;
    reportedCard: number;
    reportedPix: number;
    note?: string;
  }) => Promise<SessionClosingSummary>;
}) {
  const [step, setStep] = useState<"input" | "summary">("input");
  const [reportedCash, setReportedCash] = useState<number>(0);
  const [reportedCard, setReportedCard] = useState<number>(0);
  const [reportedPix, setReportedPix] = useState<number>(0);
  const [note, setNote] = useState<string>("");
  const [summaryResult, setSummaryResult] = useState<SessionClosingSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  async function handleProceedToClose() {
    setIsSubmitting(true);
    const result = await onCloseSession({
      reportedCash,
      reportedCard,
      reportedPix,
      note
    });
    setSummaryResult(result);
    setStep("summary");
    setIsSubmitting(false);
  }

  function handlePrintSummary() {
    window.print();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cash-closing-title"
    >
      <button type="button" className="absolute inset-0" aria-label="Fechar" onClick={onClose} />
      <div className="relative flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-card p-6 shadow-glow">
        {/* Cabeçalho */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 id="cash-closing-title" className="text-base font-bold text-white">
                Fechamento de Caixa Cego & Conferência
              </h2>
              <p className="text-xs text-muted-foreground">
                Sessão iniciada em {format(new Date(activeSession.openedAt), "dd/MM/yyyy 'às' HH:mm")}
              </p>
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

        {step === "input" ? (
          <div className="flex-1 space-y-4 overflow-y-auto py-4">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-200">
              <p className="font-semibold">⚠️ Fechamento com Contagem Cega</p>
              <p className="mt-1 text-amber-200/80">
                Digite os valores físicos contados na gaveta e nos comprovantes de maquininha. O sistema calculará as
                diferenças e registrará a auditoria.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-white flex items-center gap-1.5">
                  <Banknote className="h-4 w-4 text-emerald-400" />
                  Total de Dinheiro Físico em Gaveta (R$)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={reportedCash || ""}
                  onChange={(e) => setReportedCash(Number(e.target.value))}
                  placeholder="0.00"
                  className="mt-1 h-12 font-mono text-lg font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white flex items-center gap-1.5">
                  <WalletCards className="h-4 w-4 text-blue-400" />
                  Total em Comprovantes de Cartão (Crédito + Débito) (R$)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={reportedCard || ""}
                  onChange={(e) => setReportedCard(Number(e.target.value))}
                  placeholder="0.00"
                  className="mt-1 h-12 font-mono text-lg font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-teal-400" />
                  Total em Comprovantes Pix (R$)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={reportedPix || ""}
                  onChange={(e) => setReportedPix(Number(e.target.value))}
                  placeholder="0.00"
                  className="mt-1 h-12 font-mono text-lg font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white">Observações do Turno</label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: Tudo conferido normalmente, sem intercorrências"
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleProceedToClose}
                disabled={isSubmitting}
                className="flex-1 bg-rose-600 font-bold text-white hover:bg-rose-500"
              >
                {isSubmitting ? "Calculando..." : "Realizar Fechamento"}
              </Button>
            </div>
          </div>
        ) : (
          /* Passo 2: Resumo e Auditoria de Fechamento */
          <div className="flex-1 space-y-4 overflow-y-auto py-4">
            {summaryResult ? (
              <div className="space-y-4">
                <div
                  className={`rounded-2xl border p-4 text-center ${
                    Math.abs(summaryResult.difference) < 0.01
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : summaryResult.difference > 0
                      ? "border-blue-500/30 bg-blue-500/10"
                      : "border-rose-500/30 bg-rose-500/10"
                  }`}
                >
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                    Resultado da Conferência
                  </p>
                  <p
                    className={`font-mono text-2xl font-black mt-1 ${
                      Math.abs(summaryResult.difference) < 0.01
                        ? "text-emerald-400"
                        : summaryResult.difference > 0
                        ? "text-blue-400"
                        : "text-rose-400"
                    }`}
                  >
                    {Math.abs(summaryResult.difference) < 0.01
                      ? "✓ Caixa Exato (Sem Diferença)"
                      : summaryResult.difference > 0
                      ? `+ R$ ${summaryResult.difference.toFixed(2)} (Sobra de Caixa)`
                      : `- R$ ${Math.abs(summaryResult.difference).toFixed(2)} (Quebra / Falta de Caixa)`}
                  </p>
                </div>

                {/* Tabela de Conferência Esperado vs Informado */}
                <div className="overflow-hidden rounded-2xl border border-white/10 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-white/5 text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-2.5">Modalidade</th>
                        <th className="p-2.5 text-right">Esperado</th>
                        <th className="p-2.5 text-right">Informado</th>
                        <th className="p-2.5 text-right">Diferença</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      <tr>
                        <td className="p-2.5 font-sans font-medium text-white">Dinheiro (Gaveta)</td>
                        <td className="p-2.5 text-right">R$ {summaryResult.expectedCash.toFixed(2)}</td>
                        <td className="p-2.5 text-right text-emerald-400">R$ {summaryResult.reportedCash.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold">
                          R$ {(summaryResult.reportedCash - summaryResult.expectedCash).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-sans font-medium text-white">Cartões</td>
                        <td className="p-2.5 text-right">R$ {summaryResult.expectedCard.toFixed(2)}</td>
                        <td className="p-2.5 text-right text-blue-400">R$ {summaryResult.reportedCard.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold">
                          R$ {(summaryResult.reportedCard - summaryResult.expectedCard).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-sans font-medium text-white">Pix</td>
                        <td className="p-2.5 text-right">R$ {summaryResult.expectedPix.toFixed(2)}</td>
                        <td className="p-2.5 text-right text-teal-400">R$ {summaryResult.reportedPix.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold">
                          R$ {(summaryResult.reportedPix - summaryResult.expectedPix).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="bg-white/5 font-bold">
                        <td className="p-2.5 font-sans text-white uppercase">Total Geral</td>
                        <td className="p-2.5 text-right">R$ {summaryResult.expectedTotal.toFixed(2)}</td>
                        <td className="p-2.5 text-right text-primary">R$ {summaryResult.reportedTotal.toFixed(2)}</td>
                        <td className="p-2.5 text-right text-white">R$ {summaryResult.difference.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handlePrintSummary} className="flex-1 gap-1.5 text-xs">
                    <Printer className="h-4 w-4" />
                    Imprimir Relatório de Turno
                  </Button>
                  <Button type="button" onClick={onClose} className="flex-1 text-xs font-semibold">
                    Concluir
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
