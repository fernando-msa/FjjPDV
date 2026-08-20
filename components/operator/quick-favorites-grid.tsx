"use client";

import { Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/types";

const categoryColors: Record<string, string> = {
  Bebidas: "from-blue-500/20 to-blue-900/10 border-blue-500/30 text-blue-300",
  Padaria: "from-amber-500/20 to-amber-900/10 border-amber-500/30 text-amber-300",
  Lanchonete: "from-orange-500/20 to-orange-900/10 border-orange-500/30 text-orange-300",
  Mercearia: "from-emerald-500/20 to-emerald-900/10 border-emerald-500/30 text-emerald-300",
  Higiene: "from-purple-500/20 to-purple-900/10 border-purple-500/30 text-purple-300",
  Confeitaria: "from-pink-500/20 to-pink-900/10 border-pink-500/30 text-pink-300"
};

export function QuickFavoritesGrid({
  products,
  onAddProduct
}: {
  products: Product[];
  onAddProduct: (product: Product) => void;
}) {
  const favoriteProducts = products.slice(0, 10);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          Itens Rápidos / Mais Vendidos (Modo Touch)
        </span>
        <span className="text-[10px] text-muted-foreground">Toque para incluir direto</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {favoriteProducts.map((product) => {
          const colorClass =
            categoryColors[product.category] || "from-white/10 to-white/5 border-white/10 text-white";
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onAddProduct(product)}
              className={`group flex flex-col justify-between rounded-2xl border bg-gradient-to-b p-3 text-left transition motion-safe:active:scale-95 hover:border-primary/50 ${colorClass}`}
            >
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-75 truncate block">
                  {product.category}
                </span>
                <p className="mt-0.5 font-semibold text-xs text-white leading-tight line-clamp-2">
                  {product.name}
                </p>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-sm font-black text-white">R$ {product.price.toFixed(2)}</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white group-hover:bg-primary group-hover:text-black transition">
                  +
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
