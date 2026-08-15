"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Download,
  PackageOpen,
  ScanLine,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, MiniStatus, PaymentButton, ShortcutHint } from "@/components/shared/pdv-ui";
import type { useCart } from "@/lib/hooks/use-cart";
import type { CashMovement, CashSession, Product, Sale } from "@/lib/types";

type SaleConfirmation = {
  number: string;
  total: number;
  change: number;
  paymentMethod: Sale["paymentMethod"];
};

const paymentLabelsPt: Record<Sale["paymentMethod"], string> = { pix: "Pix", card: "Cartao", cash: "Dinheiro" };

export function OperatorScreen({
  products,
  activeSession,
  movements,
  cart,
  onFinalizeSale,
  onSupplyMovement,
  onWithdrawalMovement
}: {
  products: Product[];
  activeSession: CashSession;
  movements: CashMovement[];
  cart: ReturnType<typeof useCart>;
  onFinalizeSale: () => Promise<Sale | null>;
  onSupplyMovement: (amount: number, note: string) => Promise<void>;
  onWithdrawalMovement: (amount: number) => Promise<void>;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [showCashDrawer, setShowCashDrawer] = useState(false);
  const [supplierNote, setSupplierNote] = useState("");
  const [supplyAmount, setSupplyAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [confirmation, setConfirmation] = useState<SaleConfirmation | null>(null);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((product) => product.category)));
    return ["Todos", ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = activeCategory === "Todos" || product.category === activeCategory;
      if (!matchesCategory) return false;
      if (!query) return true;

      return (
        product.name.toLowerCase().includes(query) ||
        product.barcode.includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    });
  }, [products, search, activeCategory]);

  function applyBarcodeSearch() {
    const product = products.find((item) => item.barcode === scanValue.trim());
    if (!product) {
      return;
    }

    cart.addItem(product);
    setScanValue("");
  }

  async function handleFinalize() {
    const sale = await onFinalizeSale();
    if (!sale) {
      return;
    }

    setConfirmation({ number: sale.number, total: sale.total, change: sale.change, paymentMethod: sale.paymentMethod });
    setSearch("");
  }

  async function handleSupply() {
    if (supplyAmount <= 0) {
      return;
    }
    await onSupplyMovement(supplyAmount, supplierNote);
    setSupplierNote("");
    setSupplyAmount(0);
  }

  async function handleWithdrawal() {
    if (withdrawAmount <= 0) {
      return;
    }
    await onWithdrawalMovement(withdrawAmount);
    setWithdrawAmount(0);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (event.key === "F4") {
        event.preventDefault();
        handleFinalize();
      }

      if (event.key === "Escape" && showCashDrawer) {
        setShowCashDrawer(false);
      }

      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        setShowCashDrawer(true);
        handleSupply();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, supplyAmount, supplierNote, showCashDrawer]);

  const cashBalance =
    activeSession.openingBalance +
    movements.reduce((acc, movement) => acc + (movement.type === "supply" ? movement.amount : movement.type === "withdrawal" ? -movement.amount : 0), 0);

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.5fr_440px]">
      {/* Catalogo — unica area com rolagem interna da tela */}
      <Card className="flex min-h-0 flex-col overflow-hidden">
        <CardHeader className="shrink-0 space-y-3 border-b border-white/5 bg-white/5 p-4">
          <CardTitle className="sr-only">Buscar produto</CardTitle>
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-14 pl-12 text-lg"
                placeholder="Buscar por nome, SKU ou categoria"
                aria-label="Buscar produto por nome, SKU ou categoria"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <ShortcutHint>F2</ShortcutHint>
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                value={scanValue}
                onChange={(event) => setScanValue(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && applyBarcodeSearch()}
                placeholder="Codigo de barras"
                aria-label="Ler codigo de barras"
                className="h-14 md:w-44"
              />
              <Button variant="outline" className="h-14 px-4" onClick={applyBarcodeSearch} aria-label="Confirmar leitura de codigo de barras">
                <ScanLine className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar por categoria">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={activeCategory === category}
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeCategory === category
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 text-center text-muted-foreground">
              <PackageOpen className="h-8 w-8" aria-hidden="true" />
              <p>Nenhum produto encontrado para essa busca.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const lowStock = product.stock <= product.minStock;
                return (
                  <button
                    key={product.id}
                    onClick={() => cart.addItem(product)}
                    aria-label={`Adicionar ${product.name}, R$ ${product.price.toFixed(2)}, ao carrinho`}
                    className="group flex min-h-28 flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition motion-safe:hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div>
                      <p className="text-base font-semibold leading-tight text-white">{product.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{product.category}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <strong className="font-mono text-xl text-primary">R$ {product.price.toFixed(2)}</strong>
                      {lowStock ? <Badge variant="warning">estoque baixo</Badge> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visor do caixa — carrinho, pagamento e total sempre visiveis, sem rolagem */}
      <Card className="flex min-h-0 flex-col overflow-hidden">
        <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-white/5 bg-white/5 p-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4 text-primary" aria-hidden="true" />
            Carrinho
            <Badge variant="outline">{cart.cart.length} {cart.cart.length === 1 ? "item" : "itens"}</Badge>
          </CardTitle>
          <button
            type="button"
            onClick={() => setShowCashDrawer(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-white/20 hover:text-white"
            aria-label="Abrir movimentacao de caixa"
          >
            <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
            R$ {cashBalance.toFixed(2)}
          </button>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-y-auto p-3">
          {cart.cart.length === 0 ? (
            <div className="flex min-h-24 items-center justify-center text-center text-sm text-muted-foreground">
              Escaneie ou clique em um produto para comecar a venda.
            </div>
          ) : (
            <div className="space-y-2">
              {cart.cart.map((item) => (
                <div key={item.productId} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{item.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">R$ {item.unitPrice.toFixed(2)} / un.</p>
                  </div>
                  <div className="flex items-center rounded-lg border border-white/10 bg-black/20">
                    <button
                      type="button"
                      onClick={() => cart.adjustItem(item.productId, -1)}
                      aria-label={`Diminuir quantidade de ${item.name}`}
                      className="flex h-8 w-8 items-center justify-center text-base font-semibold text-white hover:bg-white/10"
                    >
                      -
                    </button>
                    <span className="min-w-7 text-center text-sm font-semibold text-white" aria-live="polite">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => cart.adjustItem(item.productId, 1)}
                      aria-label={`Aumentar quantidade de ${item.name}`}
                      className="flex h-8 w-8 items-center justify-center text-base font-semibold text-white hover:bg-white/10"
                    >
                      +
                    </button>
                  </div>
                  <div className="w-16 shrink-0 text-right font-mono text-sm font-semibold text-primary">R$ {(item.unitPrice * item.quantity).toFixed(2)}</div>
                  <button
                    type="button"
                    onClick={() => cart.removeItem(item.productId)}
                    aria-label={`Remover ${item.name} do carrinho`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <div className="shrink-0 space-y-3 border-t border-white/5 bg-black/10 p-4">
          {confirmation ? (
            <div role="status" className="flex items-start justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-accent">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Venda {confirmation.number} concluida
                </p>
                <p className="mt-1 font-mono text-xs text-accent/90">
                  Total R$ {confirmation.total.toFixed(2)} via {paymentLabelsPt[confirmation.paymentMethod]}
                  {confirmation.change > 0 ? ` | Troco R$ ${confirmation.change.toFixed(2)}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => setConfirmation(null)} aria-label="Fechar confirmacao de venda" className="rounded-lg p-1 text-accent hover:bg-accent/20">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            <PaymentButton active={cart.paymentMethod === "pix"} onClick={() => cart.setPaymentMethod("pix")} label="Pix" icon={<Banknote className="h-5 w-5" />} />
            <PaymentButton active={cart.paymentMethod === "card"} onClick={() => cart.setPaymentMethod("card")} label="Cartao" icon={<CreditCard className="h-5 w-5" />} />
            <PaymentButton active={cart.paymentMethod === "cash"} onClick={() => cart.setPaymentMethod("cash")} label="Dinheiro" icon={<CircleDollarSign className="h-5 w-5" />} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Desconto (R$)" value={cart.customerDiscount} onChange={cart.setCustomerDiscount} />
            <Field label="Recebido" value={cart.cashReceived} onChange={cart.setCashReceived} disabled={!cart.isCashSale} />
          </div>

          {/* Visor de total — elemento de assinatura, sempre visivel, nunca exige rolagem */}
          <div className="pdv-visor rounded-2xl p-4">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-primary/70">
              <span>Total a pagar</span>
              {cart.isCashSale ? <span>Troco R$ {cart.change.toFixed(2)}</span> : null}
            </div>
            <p className="pdv-visor-digits mt-1 text-4xl font-bold leading-none">R$ {cart.total.toFixed(2)}</p>
            {cart.customerDiscount > 0 ? (
              <p className="mt-1 font-mono text-xs text-primary/60">subtotal R$ {cart.subtotal.toFixed(2)} · desconto R$ {cart.customerDiscount.toFixed(2)}</p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button className="h-14 flex-1 text-base" onClick={handleFinalize} disabled={!cart.canFinalize}>
              <CheckCircle2 className="h-5 w-5" />
              Finalizar venda
              <ShortcutHint>F4</ShortcutHint>
            </Button>
            <Button variant="outline" className="h-14 w-24" onClick={cart.resetSaleForm} aria-label="Limpar carrinho atual">
              Limpar
            </Button>
          </div>
          {cart.isCashSale && cart.cashReceived < cart.total ? (
            <p className="text-xs text-amber-300">Informe um valor recebido igual ou maior que o total.</p>
          ) : null}
        </div>
      </Card>

      {/* Gaveta de movimentacao de caixa — sobreposta, nao empurra o layout principal */}
      {showCashDrawer ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" role="dialog" aria-modal="true" aria-label="Movimentacao de caixa">
          <button type="button" className="absolute inset-0" aria-label="Fechar" onClick={() => setShowCashDrawer(false)} />
          <div className="relative flex h-full w-full max-w-sm flex-col gap-4 border-l border-white/10 bg-card p-5 shadow-glow">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
                Movimentacao de caixa
              </h2>
              <button type="button" onClick={() => setShowCashDrawer(false)} aria-label="Fechar gaveta de caixa" className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <MiniStatus label="Saldo atual" value={`R$ ${cashBalance.toFixed(2)}`} />

            <div className="grid gap-3">
              <Field label="Suprimento" value={supplyAmount} onChange={setSupplyAmount} />
              <Field label="Sangria" value={withdrawAmount} onChange={setWithdrawAmount} />
            </div>
            <Input value={supplierNote} onChange={(event) => setSupplierNote(event.target.value)} placeholder="Observacao do suprimento" aria-label="Observacao do movimento de suprimento" />
            <div className="flex flex-col gap-2">
              <Button variant="secondary" onClick={handleSupply}>
                <Download className="h-4 w-4" />
                Registrar suprimento
                <ShortcutHint>Ctrl+S</ShortcutHint>
              </Button>
              <Button variant="outline" onClick={handleWithdrawal}>
                <Banknote className="h-4 w-4" />
                Registrar sangria
              </Button>
            </div>
            <MiniStatus label="Status do caixa" value={activeSession.status === "open" ? "Aberto" : "Fechado"} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
