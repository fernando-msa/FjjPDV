"use client";

import { useState } from "react";
import { Barcode, DollarSign, Package, Percent, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@/lib/types";

export function ProductFormModal({
  product,
  isOpen,
  onClose,
  onSave
}: {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => Promise<void>;
}) {
  const [name, setName] = useState(product?.name || "");
  const [barcode, setBarcode] = useState(product?.barcode || "");
  const [sku, setSku] = useState(product?.sku || "");
  const [category, setCategory] = useState(product?.category || "Geral");
  const [price, setPrice] = useState<number>(product?.price || 0);
  const [cost, setCost] = useState<number>(product?.cost || 0);
  const [stock, setStock] = useState<number>(product?.stock || 0);
  const [minStock, setMinStock] = useState<number>(product?.minStock || 5);
  const [unit, setUnit] = useState(product?.unit || "un");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const margin = cost > 0 ? ((price - cost) / cost) * 100 : 100;

  function generateRandomEan() {
    const prefix = "789"; // Código do Brasil
    let randomDigits = "";
    for (let i = 0; i < 9; i++) {
      randomDigits += Math.floor(Math.random() * 10).toString();
    }
    const fullCode = `${prefix}${randomDigits}0`;
    setBarcode(fullCode);
    if (!sku) {
      setSku(`SKU-${randomDigits.slice(-4)}`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || price <= 0) return;

    setIsSubmitting(true);
    const updated: Product = {
      id: product?.id || `p-${Date.now()}`,
      name: name.trim(),
      barcode: barcode.trim() || `789${Date.now().toString().slice(-10)}`,
      sku: sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      category: category.trim() || "Geral",
      price,
      cost,
      stock,
      minStock,
      unit: unit.trim() || "un",
      active: true
    };

    await onSave(updated);
    setIsSubmitting(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-form-title"
    >
      <button type="button" className="absolute inset-0" aria-label="Fechar" onClick={onClose} />
      <div className="relative flex max-h-[95vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-card p-6 shadow-glow">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 id="product-form-title" className="text-base font-bold text-white">
                {product ? "Editar Produto" : "Novo Cadastro de Produto"}
              </h2>
              <p className="text-xs text-muted-foreground">Cadastre informações completas de estoque e precificação</p>
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

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto py-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-white">Nome do Produto / Descrição *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Café Torrado Tradicional 500g"
              required
              className="h-11"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-white">Categoria</label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Bebidas, Padaria, Higiene..."
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-white">Unidade de Medida</label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="un, kg, cx, lt, pct..."
                className="h-10"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-white">Código de Barras (EAN-13)</label>
                <button
                  type="button"
                  onClick={generateRandomEan}
                  className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                >
                  <RefreshCw className="h-3 w-3" /> Gerar EAN
                </button>
              </div>
              <Input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="7890000000000"
                className="h-10 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-white">SKU / Código Interno</label>
              <Input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="REF-001"
                className="h-10 font-mono"
              />
            </div>
          </div>

          {/* Precificação e Margem */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Precificação & Margem
            </span>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-white">Preço de Custo (R$)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost || ""}
                  onChange={(e) => setCost(Number(e.target.value))}
                  placeholder="0.00"
                  className="mt-1 h-10 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white">Preço de Venda (R$) *</label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={price || ""}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  placeholder="0.00"
                  required
                  className="mt-1 h-10 font-mono font-bold text-primary"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-2.5 flex flex-col justify-center text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Margem Bruta</span>
                <span className={`font-mono text-lg font-black ${margin >= 30 ? "text-emerald-400" : "text-amber-400"}`}>
                  {margin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Estoque */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-white">Estoque Atual</label>
              <Input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="h-10 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-white">Estoque Mínimo (Alerta)</label>
              <Input
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value))}
                className="h-10 font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-white/10">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 font-semibold">
              {isSubmitting ? "Salvando..." : "Salvar Produto"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
