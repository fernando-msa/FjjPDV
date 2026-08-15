"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function MetricCard({
  title,
  value,
  suffix,
  icon,
  accent
}: {
  title: string;
  value: number;
  suffix: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className={`bg-gradient-to-br ${accent} p-5`}>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{title}</span>
          <span className="rounded-full border border-white/10 bg-white/10 p-2 text-white">{icon}</span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-semibold tracking-tight text-white">{value.toFixed(value >= 100 ? 0 : 2)}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/65">{suffix}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Botao de forma de pagamento com alto contraste e estado selecionado bem marcado (acessivel a leitores de tela via aria-pressed). */
export function PaymentButton({
  active,
  onClick,
  label,
  icon
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-3 text-base font-semibold transition motion-safe:active:scale-[0.98] ${
        active
          ? "border-primary bg-primary/20 text-primary shadow-glow"
          : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      {active ? (
        <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-primary">
          <Check className="h-3 w-3" /> selecionado
        </span>
      ) : null}
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  disabled,
  large
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  large?: boolean;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium text-white">{label}</span>
      <Input
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className={large ? "h-14 text-lg font-semibold" : undefined}
      />
    </label>
  );
}

export function SummaryLine({
  label,
  value,
  strong
}: {
  label: string;
  value: number | string;
  strong?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1.5 ${strong ? "text-xl font-bold text-white" : "text-sm text-muted-foreground"}`}>
      <span>{label}</span>
      <span>{typeof value === "number" ? `R$ ${value.toFixed(2)}` : value}</span>
    </div>
  );
}

export function MiniStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

/** Rotulo pequeno indicando o atalho de teclado equivalente a uma acao (F2, F4, Ctrl+S...). */
export function ShortcutHint({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-white/15 bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
      {children}
    </kbd>
  );
}
