"use client";

import { useState } from "react";
import type { CartItem, PaymentMethod, Product } from "@/lib/types";

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerDiscount, setCustomerDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [cashReceived, setCashReceived] = useState(0);

  const subtotal = cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const total = Math.max(subtotal - customerDiscount, 0);
  const isCashSale = paymentMethod === "cash";
  const totalPaid = isCashSale ? cashReceived : total;
  const change = Math.max(totalPaid - total, 0);
  const canFinalize = cart.length > 0 && total > 0 && (!isCashSale || cashReceived >= total);

  function addItem(product: Product) {
    setCart((current) => {
      const existingItem = current.find((item) => item.productId === product.id);
      if (existingItem) {
        return current.map((item) => (item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }

      return [
        { productId: product.id, name: product.name, barcode: product.barcode, quantity: 1, unitPrice: product.price },
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

  function resetSaleForm() {
    setCart([]);
    setCustomerDiscount(0);
    setCashReceived(0);
    setPaymentMethod("pix");
  }

  return {
    cart,
    subtotal,
    total,
    totalPaid,
    change,
    isCashSale,
    canFinalize,
    customerDiscount,
    setCustomerDiscount,
    paymentMethod,
    setPaymentMethod,
    cashReceived,
    setCashReceived,
    addItem,
    removeItem,
    adjustItem,
    resetSaleForm
  };
}
