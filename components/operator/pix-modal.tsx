"use client";

import { useMemo, useState } from "react";
import { Check, CheckCircle2, Copy, QrCode, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generatePixPayload, generateQrMatrix } from "@/lib/utils/pix";

export function PixModal({
  isOpen,
  onClose,
  total,
  saleNumber,
  onConfirmPix
}: {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  saleNumber?: string;
  onConfirmPix: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const payload = useMemo(() => {
    return generatePixPayload({
      pixKey: "financeiro@fjjpdv.com.br",
      merchantName: "FJJ PDV VAREJO",
      merchantCity: "SAO PAULO",
      amount: total,
      txId: saleNumber?.replace(/\D/g, "") || `TX${Date.now().toString().slice(-6)}`
    });
  }, [total, saleNumber]);

  const qrMatrix = useMemo(() => {
    return generateQrMatrix(payload);
  }, [payload]);

  if (!isOpen) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  }

  function handleSimulatePayment() {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      onConfirmPix();
    }, 1000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pix-modal-title"
    >
      <button type="button" className="absolute inset-0" aria-label="Fechar" onClick={onClose} />
      <div className="relative flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-white/10 bg-card p-6 shadow-glow">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 id="pix-modal-title" className="text-lg font-bold text-white">
                Pagamento via Pix
              </h2>
              <p className="text-xs text-muted-foreground">Aproxime a câmera do celular no QR Code</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal Pix"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Visor de Valor */}
        <div className="w-full rounded-2xl border border-teal-500/20 bg-teal-950/20 p-3 text-center">
          <p className="text-xs uppercase tracking-widest text-teal-400/80">Valor a ser pago</p>
          <p className="font-mono text-3xl font-extrabold text-teal-300">R$ {total.toFixed(2)}</p>
        </div>

        {/* Visualização do QR Code SVG de Alta Resolução */}
        <div className="flex aspect-square w-60 items-center justify-center rounded-2xl border-4 border-white bg-white p-3 shadow-xl">
          <svg viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`} className="h-full w-full shape-rendering-crispEdges">
            {qrMatrix.map((row, y) =>
              row.map((cell, x) =>
                cell ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#09090b" /> : null
              )
            )}
          </svg>
        </div>

        {/* Chave e Código Copia e Cola */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Chave Pix:</span>
            <span className="font-mono font-medium text-white">financeiro@fjjpdv.com.br</span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="w-full gap-2 border-white/15 bg-white/5 py-5 text-xs text-white hover:bg-white/10"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Código Pix Copiado com Sucesso!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-teal-400" />
                <span>Copiar Código Pix (Copia e Cola)</span>
              </>
            )}
          </Button>
        </div>

        {/* Ações */}
        <div className="flex w-full gap-2">
          <Button
            type="button"
            className="flex-1 gap-2 bg-teal-500 py-6 text-base font-bold text-black hover:bg-teal-400"
            onClick={handleSimulatePayment}
            disabled={simulating}
          >
            {simulating ? (
              <span className="animate-pulse">Confirmando recebimento...</span>
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Confirmar Pix Recebido
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
