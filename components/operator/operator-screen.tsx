"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Download,
  Layers,
  Lock,
  PackageOpen,
  PauseCircle,
  Percent,
  Printer,
  QrCode,
  ScanLine,
  Search,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
  UserCheck,
  Wallet,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, MiniStatus, PaymentButton, ShortcutHint } from "@/components/shared/pdv-ui";
import { PixModal } from "@/components/operator/pix-modal";
import { ReceiptModal } from "@/components/operator/receipt-modal";
import { CustomerModal } from "@/components/operator/customer-modal";
import { ParkedSalesDrawer } from "@/components/operator/parked-sales-drawer";
import { SplitPaymentModal } from "@/components/operator/split-payment-modal";
import { CashClosingModal } from "@/components/operator/cash-closing-modal";
import { ItemDiscountModal } from "@/components/operator/item-discount-modal";
import { QuickFavoritesGrid } from "@/components/operator/quick-favorites-grid";
import { paymentLabels } from "@/lib/mock-data";
import type { useCart } from "@/lib/hooks/use-cart";
import type {
  CashMovement,
  CashSession,
  CustomerInfo,
  ParkedSale,
  Product,
  Sale,
  SessionClosingSummary
} from "@/lib/types";

export function OperatorScreen({
  products,
  activeSession,
  movements,
  cart,
  parkedSales = [],
  customers = [],
  onFinalizeSale,
  onSupplyMovement,
  onWithdrawalMovement,
  onParkSale,
  onResumeSale,
  onDeleteParkedSale,
  onSaveCustomer,
  onCloseSession
}: {
  products: Product[];
  activeSession: CashSession;
  movements: CashMovement[];
  cart: ReturnType<typeof useCart>;
  parkedSales?: ParkedSale[];
  customers?: CustomerInfo[];
  onFinalizeSale: () => Promise<Sale | null>;
  onSupplyMovement: (amount: number, note: string) => Promise<void>;
  onWithdrawalMovement: (amount: number) => Promise<void>;
  onParkSale: (label: string) => Promise<void>;
  onResumeSale: (parkedSale: ParkedSale) => void;
  onDeleteParkedSale: (parkedSaleId: string) => Promise<void>;
  onSaveCustomer: (customer: CustomerInfo) => Promise<CustomerInfo>;
  onCloseSession: (data: {
    reportedCash: number;
    reportedCard: number;
    reportedPix: number;
    note?: string;
  }) => Promise<SessionClosingSummary>;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [showCashDrawer, setShowCashDrawer] = useState(false);
  const [supplierNote, setSupplierNote] = useState("");
  const [supplyAmount, setSupplyAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);

  // Modais de Novos Recursos
  const [showPixModal, setShowPixModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showParkedDrawer, setShowParkedDrawer] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [itemForDiscount, setItemForDiscount] = useState<ReturnType<typeof useCart>["cart"][0] | null>(null);
  const [showTouchGrid, setShowTouchGrid] = useState(true);

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
    if (!cart.canFinalize) return;

    // Se a forma selecionada for Pix e o modal ainda não foi acionado, pode exibir o QR code
    const sale = await onFinalizeSale();
    if (!sale) {
      return;
    }

    setLastCompletedSale(sale);
    setShowReceiptModal(true);
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

  // Tratamento de Atalhos de Teclado (F2, F4, F6, F7, F8, F9, Ctrl+S)
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

      if (event.key === "F6") {
        event.preventDefault();
        setShowParkedDrawer((prev) => !prev);
      }

      if (event.key === "F7") {
        event.preventDefault();
        setShowCustomerModal((prev) => !prev);
      }

      if (event.key === "F8") {
        event.preventDefault();
        cart.setPaymentMethod("split");
        setShowSplitModal(true);
      }

      if (event.key === "F9") {
        event.preventDefault();
        setShowClosingModal(true);
      }

      if (event.key === "Escape") {
        if (showCashDrawer) setShowCashDrawer(false);
        if (showPixModal) setShowPixModal(false);
        if (showCustomerModal) setShowCustomerModal(false);
        if (showParkedDrawer) setShowParkedDrawer(false);
        if (showSplitModal) setShowSplitModal(false);
        if (showClosingModal) setShowClosingModal(false);
        if (itemForDiscount) setItemForDiscount(null);
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
    movements.reduce(
      (acc, movement) =>
        acc + (movement.type === "supply" ? movement.amount : movement.type === "withdrawal" ? -movement.amount : 0),
      0
    );

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.5fr_460px]">
      {/* Catálogo de Produtos e Grade Touch */}
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
                placeholder="Buscar por nome, SKU, código de barras ou categoria"
                aria-label="Buscar produto"
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
                placeholder="Leitor código barras"
                aria-label="Ler código de barras"
                className="h-14 md:w-48 font-mono"
              />
              <Button variant="outline" className="h-14 px-4" onClick={applyBarcodeSearch} aria-label="Confirmar leitura">
                <ScanLine className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar por categoria">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                    activeCategory === category
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowTouchGrid((prev) => !prev)}
              className={`hidden sm:flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                showTouchGrid
                  ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{showTouchGrid ? "Ocultar Grade Touch" : "Modo Touch"}</span>
            </button>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
          {/* Grade Rápida Touch / Favoritos */}
          {showTouchGrid && !search ? (
            <QuickFavoritesGrid products={products} onAddProduct={cart.addItem} />
          ) : null}

          {/* Lista Geral de Produtos */}
          <div>
            <div className="flex items-center justify-between pb-2 px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {activeCategory === "Todos" ? "Todos os Produtos" : `Categoria: ${activeCategory}`} (
                {filteredProducts.length})
              </span>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 text-center text-muted-foreground">
                <PackageOpen className="h-8 w-8" aria-hidden="true" />
                <p className="text-sm">Nenhum produto encontrado para essa busca.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => {
                  const lowStock = product.stock <= product.minStock;
                  return (
                    <button
                      key={product.id}
                      onClick={() => cart.addItem(product)}
                      aria-label={`Adicionar ${product.name}, R$ ${product.price.toFixed(2)}`}
                      className="group flex min-h-28 flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition motion-safe:hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div>
                        <p className="text-base font-semibold leading-tight text-white line-clamp-2">{product.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{product.category}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <strong className="font-mono text-xl text-primary">R$ {product.price.toFixed(2)}</strong>
                        {lowStock ? <Badge variant="warning">estoque {product.stock}</Badge> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Visor do Caixa — Carrinho, Cliente, Totais e Formas de Pagamento */}
      <Card className="flex min-h-0 flex-col overflow-hidden">
        {/* Cabeçalho do Carrinho com Atalhos Rápidos */}
        <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-white/5 bg-white/5 p-3.5">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4 text-primary" aria-hidden="true" />
              Carrinho
              <Badge variant="outline">
                {cart.cart.length} {cart.cart.length === 1 ? "item" : "itens"}
              </Badge>
            </CardTitle>

            {/* Botão de Vendas em Espera / Comandas */}
            <button
              type="button"
              onClick={() => setShowParkedDrawer(true)}
              className="relative flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
              title="Vendas em Espera / Comandas (Atalho F6)"
            >
              <PauseCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Comandas</span>
              {parkedSales.length > 0 ? (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-black">
                  {parkedSales.length}
                </span>
              ) : null}
              <ShortcutHint>F6</ShortcutHint>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão de Fechamento de Caixa */}
            <button
              type="button"
              onClick={() => setShowClosingModal(true)}
              className="flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
              title="Fechamento de Caixa Cego (Atalho F9)"
            >
              <Lock className="h-3 w-3" />
              <span className="hidden sm:inline">Fechar</span>
              <ShortcutHint>F9</ShortcutHint>
            </button>

            {/* Saldo em Gaveta */}
            <button
              type="button"
              onClick={() => setShowCashDrawer(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-white/20 hover:text-white"
              aria-label="Abrir movimentação de caixa"
            >
              <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
              R$ {cashBalance.toFixed(2)}
            </button>
          </div>
        </CardHeader>

        {/* Faixa de Identificação do Cliente (CPF na Nota) */}
        <div className="shrink-0 border-b border-white/5 bg-black/20 px-3.5 py-2">
          <div className="flex items-center justify-between">
            {cart.customer ? (
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <UserCheck className="h-3.5 w-3.5" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white">{cart.customer.name || "Cliente Identificado"}</span>
                  {cart.customer.cpfCnpj ? (
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                      CPF: {cart.customer.cpfCnpj}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition"
              >
                <UserCheck className="h-3.5 w-3.5 text-primary" />
                <span>Identificar Cliente / CPF na Nota</span>
                <ShortcutHint>F7</ShortcutHint>
              </button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCustomerModal(true)}
              className="h-6 px-2 text-[10px]"
            >
              {cart.customer ? "Alterar" : "+ Cliente"}
            </Button>
          </div>
        </div>

        {/* Lista de Itens do Carrinho */}
        <CardContent className="min-h-0 flex-1 overflow-y-auto p-3">
          {cart.cart.length === 0 ? (
            <div className="flex min-h-24 flex-col items-center justify-center text-center text-xs text-muted-foreground">
              <p>Escaneie ou clique em um produto para iniciar a venda.</p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">Atalhos: F2 Busca · F6 Comandas · F7 CPF</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.cart.map((item) => {
                const itemTotal = item.unitPrice * item.quantity - (item.discount || 0);
                return (
                  <div key={item.productId} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{item.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">R$ {item.unitPrice.toFixed(2)} / un.</span>
                        {item.discount && item.discount > 0 ? (
                          <span className="font-mono text-emerald-400 font-semibold">
                            - R$ {item.discount.toFixed(2)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Botão de Desconto por Item */}
                    <button
                      type="button"
                      onClick={() => setItemForDiscount(item)}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                        item.discount && item.discount > 0
                          ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                          : "border-white/10 bg-black/20 text-muted-foreground hover:border-primary/40 hover:text-white"
                      }`}
                      title="Aplicar desconto neste item"
                    >
                      <Percent className="h-3.5 w-3.5" />
                    </button>

                    {/* Ajuste de Quantidade */}
                    <div className="flex items-center rounded-lg border border-white/10 bg-black/20">
                      <button
                        type="button"
                        onClick={() => cart.adjustItem(item.productId, -1)}
                        aria-label={`Diminuir ${item.name}`}
                        className="flex h-8 w-8 items-center justify-center text-base font-semibold text-white hover:bg-white/10"
                      >
                        -
                      </button>
                      <span className="min-w-7 text-center text-sm font-semibold text-white" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => cart.adjustItem(item.productId, 1)}
                        aria-label={`Aumentar ${item.name}`}
                        className="flex h-8 w-8 items-center justify-center text-base font-semibold text-white hover:bg-white/10"
                      >
                        +
                      </button>
                    </div>

                    <div className="w-16 shrink-0 text-right font-mono text-sm font-bold text-primary">
                      R$ {itemTotal.toFixed(2)}
                    </div>

                    <button
                      type="button"
                      onClick={() => cart.removeItem(item.productId)}
                      aria-label={`Remover ${item.name}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        {/* Rodapé de Pagamento e Finalização */}
        <div className="shrink-0 space-y-3 border-t border-white/5 bg-black/10 p-4">
          {/* Seletor de Formas de Pagamento */}
          <div className="grid grid-cols-4 gap-2">
            <PaymentButton
              active={cart.paymentMethod === "pix"}
              onClick={() => {
                cart.setPaymentMethod("pix");
                setShowPixModal(true);
              }}
              label="Pix"
              icon={<QrCode className="h-4 w-4" />}
            />
            <PaymentButton
              active={cart.paymentMethod === "card"}
              onClick={() => cart.setPaymentMethod("card")}
              label="Cartão"
              icon={<CreditCard className="h-4 w-4" />}
            />
            <PaymentButton
              active={cart.paymentMethod === "cash"}
              onClick={() => cart.setPaymentMethod("cash")}
              label="Dinheiro"
              icon={<CircleDollarSign className="h-4 w-4" />}
            />
            <PaymentButton
              active={cart.paymentMethod === "split"}
              onClick={() => {
                cart.setPaymentMethod("split");
                setShowSplitModal(true);
              }}
              label="Dividido"
              icon={<Layers className="h-4 w-4" />}
            />
          </div>

          {/* Desconto Global e Dinheiro Recebido */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Desconto Geral (R$)" value={cart.customerDiscount} onChange={cart.setCustomerDiscount} />
            <Field
              label="Valor Recebido (R$)"
              value={cart.cashReceived}
              onChange={cart.setCashReceived}
              disabled={!cart.isCashSale}
            />
          </div>

          {/* Visor LED de Total */}
          <div className="pdv-visor rounded-2xl p-4">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-primary/70">
              <span>Total a pagar</span>
              {cart.isCashSale && cart.change > 0 ? (
                <span className="text-emerald-400 font-bold">Troco R$ {cart.change.toFixed(2)}</span>
              ) : cart.isSplitSale && cart.remainingSplit > 0 ? (
                <span className="text-amber-300 font-bold">Falta R$ {cart.remainingSplit.toFixed(2)}</span>
              ) : null}
            </div>
            <p className="pdv-visor-digits mt-1 text-4xl font-bold leading-none">R$ {cart.total.toFixed(2)}</p>
            {cart.totalDiscount > 0 ? (
              <p className="mt-1 font-mono text-xs text-primary/60">
                subtotal R$ {cart.subtotal.toFixed(2)} · descontos R$ {cart.totalDiscount.toFixed(2)}
              </p>
            ) : null}
          </div>

          {/* Botões de Ação Final */}
          <div className="flex gap-2">
            <Button
              className="h-14 flex-1 text-base font-bold shadow-lg"
              onClick={handleFinalize}
              disabled={!cart.canFinalize}
            >
              <CheckCircle2 className="h-5 w-5" />
              Finalizar Venda
              <ShortcutHint>F4</ShortcutHint>
            </Button>
            <Button
              variant="outline"
              className="h-14 w-20"
              onClick={cart.resetSaleForm}
              aria-label="Limpar carrinho atual"
            >
              Limpar
            </Button>
          </div>

          {cart.isCashSale && cart.cashReceived < cart.total ? (
            <p className="text-xs text-amber-300 text-center">Informe um valor recebido igual ou maior que o total.</p>
          ) : cart.isSplitSale && cart.remainingSplit > 0 ? (
            <p className="text-xs text-amber-300 text-center">
              Faltam R$ {cart.remainingSplit.toFixed(2)} a serem divididos nas formas de pagamento.
            </p>
          ) : null}
        </div>
      </Card>

      {/* MODAIS EMBARCADOS */}
      <PixModal
        isOpen={showPixModal}
        onClose={() => setShowPixModal(false)}
        total={cart.total}
        onConfirmPix={() => {
          setShowPixModal(false);
          handleFinalize();
        }}
      />

      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        sale={lastCompletedSale}
      />

      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        currentCustomer={cart.customer}
        customers={customers}
        onApplyCustomer={cart.setCustomer}
        onSaveCustomer={onSaveCustomer}
      />

      <ParkedSalesDrawer
        isOpen={showParkedDrawer}
        onClose={() => setShowParkedDrawer(false)}
        cart={cart.cart}
        customerDiscount={cart.customerDiscount}
        customer={cart.customer}
        parkedSales={parkedSales}
        onParkSale={async (label) => {
          await onParkSale(label);
          cart.resetSaleForm();
        }}
        onResumeSale={cart.loadParkedSale}
        onDeleteParkedSale={onDeleteParkedSale}
      />

      <SplitPaymentModal
        isOpen={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        total={cart.total}
        payments={cart.payments}
        onAddPayment={cart.addPayment}
        onRemovePayment={cart.removePayment}
        onConfirmSplit={() => {
          setShowSplitModal(false);
          handleFinalize();
        }}
      />

      <CashClosingModal
        isOpen={showClosingModal}
        onClose={() => setShowClosingModal(false)}
        activeSession={activeSession}
        onCloseSession={onCloseSession}
      />

      <ItemDiscountModal
        isOpen={!!itemForDiscount}
        onClose={() => setItemForDiscount(null)}
        item={itemForDiscount}
        onApplyDiscount={cart.setItemDiscount}
      />

      {/* Gaveta de Suprimento / Sangria */}
      {showCashDrawer ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Movimentação de caixa">
          <button type="button" className="absolute inset-0" aria-label="Fechar" onClick={() => setShowCashDrawer(false)} />
          <div className="relative flex h-full w-full max-w-sm flex-col gap-4 border-l border-white/10 bg-card p-5 shadow-glow">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
                Movimentação de Caixa
              </h2>
              <button
                type="button"
                onClick={() => setShowCashDrawer(false)}
                aria-label="Fechar gaveta de caixa"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <MiniStatus label="Saldo atual em gaveta" value={`R$ ${cashBalance.toFixed(2)}`} />

            <div className="grid gap-3">
              <Field label="Suprimento (Entrada)" value={supplyAmount} onChange={setSupplyAmount} />
              <Field label="Sangria (Retirada)" value={withdrawAmount} onChange={setWithdrawAmount} />
            </div>
            <Input
              value={supplierNote}
              onChange={(event) => setSupplierNote(event.target.value)}
              placeholder="Observação da movimentação"
              aria-label="Observação da movimentação"
            />
            <div className="flex flex-col gap-2">
              <Button variant="secondary" onClick={handleSupply}>
                <Download className="h-4 w-4" />
                Registrar Suprimento
                <ShortcutHint>Ctrl+S</ShortcutHint>
              </Button>
              <Button variant="outline" onClick={handleWithdrawal}>
                <Banknote className="h-4 w-4" />
                Registrar Sangria
              </Button>
            </div>
            <MiniStatus label="Status da Sessão" value={activeSession.status === "open" ? "Aberto" : "Fechado"} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
