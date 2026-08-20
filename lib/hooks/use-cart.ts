"use client";

import { useState } from "react";
import type { CartItem, CustomerInfo, ParkedSale, PaymentEntry, PaymentMethod, Product } from "@/lib/types";

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerDiscount, setCustomerDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [cashReceived, setCashReceived] = useState(0);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [activeParkedSaleId, setActiveParkedSaleId] = useState<string | null>(null);

  // Subtotal bruto (soma de preço * quantidade de cada item)
  const subtotal = cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);

  // Soma dos descontos aplicados nos itens individuais
  const itemDiscountsTotal = cart.reduce((acc, item) => acc + (item.discount || 0), 0);

  // Cálculo do desconto global da venda
  const computedDiscount =
    discountType === "percent"
      ? (subtotal - itemDiscountsTotal) * (Math.min(discountPercent, 100) / 100)
      : customerDiscount;

  const totalDiscount = itemDiscountsTotal + computedDiscount;
  const total = Math.max(subtotal - totalDiscount, 0);

  // Split payment totals
  const totalSplitPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const remainingSplit = Math.max(total - totalSplitPaid, 0);

  // Single payment details
  const isCashSale = paymentMethod === "cash";
  const isSplitSale = paymentMethod === "split";

  let totalPaid = 0;
  let change = 0;

  if (isSplitSale) {
    totalPaid = totalSplitPaid;
    // Se o último pagamento em dinheiro deu troco
    const cashSplitPayment = payments.find((p) => p.method === "cash" && p.receivedAmount && p.receivedAmount > p.amount);
    change = cashSplitPayment ? (cashSplitPayment.receivedAmount! - cashSplitPayment.amount) : 0;
  } else if (isCashSale) {
    totalPaid = cashReceived;
    change = Math.max(cashReceived - total, 0);
  } else {
    totalPaid = total;
    change = 0;
  }

  const canFinalize =
    cart.length > 0 &&
    total > 0 &&
    (isSplitSale ? totalSplitPaid >= total : !isCashSale || cashReceived >= total);

  function addItem(product: Product) {
    setCart((current) => {
      const existingItem = current.find((item) => item.productId === product.id);
      if (existingItem) {
        return current.map((item) => (item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }

      return [
        { productId: product.id, name: product.name, barcode: product.barcode, quantity: 1, unitPrice: product.price, discount: 0 },
        ...current
      ];
    });
  }

  function removeItem(productId: string) {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  function adjustItem(productId: string, delta: number) {
    setCart((current) =>
      current
        .map((item) => (item.productId === productId ? { ...item, quantity: Math.max(item.quantity + delta, 1) } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function setItemDiscount(productId: string, discountAmount: number) {
    setCart((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, discount: Math.min(Math.max(discountAmount, 0), item.unitPrice * item.quantity) }
          : item
      )
    );
  }

  function addPayment(entry: Omit<PaymentEntry, "id">) {
    const newEntry: PaymentEntry = {
      ...entry,
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };
    setPayments((prev) => [...prev, newEntry]);
  }

  function removePayment(id: string) {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }

  function clearPayments() {
    setPayments([]);
  }

  function loadParkedSale(parkedSale: ParkedSale) {
    setCart(parkedSale.cart);
    setCustomerDiscount(parkedSale.customerDiscount);
    setCustomer(parkedSale.customer || null);
    setActiveParkedSaleId(parkedSale.id);
    setPayments([]);
    setCashReceived(0);
  }

  function resetSaleForm() {
    setCart([]);
    setCustomerDiscount(0);
    setDiscountPercent(0);
    setDiscountType("fixed");
    setCashReceived(0);
    setPaymentMethod("pix");
    setCustomer(null);
    setPayments([]);
    setActiveParkedSaleId(null);
  }

  return {
    cart,
    subtotal,
    total,
    totalPaid,
    change,
    isCashSale,
    isSplitSale,
    canFinalize,
    customerDiscount,
    setCustomerDiscount,
    discountType,
    setDiscountType,
    discountPercent,
    setDiscountPercent,
    totalDiscount,
    itemDiscountsTotal,
    paymentMethod,
    setPaymentMethod,
    cashReceived,
    setCashReceived,
    customer,
    setCustomer,
    payments,
    addPayment,
    removePayment,
    clearPayments,
    remainingSplit,
    activeParkedSaleId,
    addItem,
    removeItem,
    adjustItem,
    setItemDiscount,
    loadParkedSale,
    resetSaleForm
  };
}

