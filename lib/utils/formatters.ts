import { format } from "date-fns";
import type { Sale } from "@/lib/types";
import { paymentLabels } from "@/lib/mock-data";

export function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .substring(0, 14);
  }
  // CNPJ: 00.000.000/0000-00
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
    .substring(0, 18);
}

export function validateCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(10))) return false;

  return true;
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3").substring(0, 14);
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3").substring(0, 15);
}

export function buildWhatsAppReceiptMessage(sale: Sale, storeName = "FjjPDV - Mercadinho & Conveniência"): string {
  const dateStr = format(new Date(sale.createdAt), "dd/MM/yyyy 'às' HH:mm");
  const itemsText = sale.items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.name}*\n   ${item.quantity}x R$ ${item.unitPrice.toFixed(2)} = *R$ ${(
          item.quantity * item.unitPrice - (item.discount || 0)
        ).toFixed(2)}*`
    )
    .join("\n");

  const paymentDesc =
    sale.payments && sale.payments.length > 0
      ? sale.payments.map((p) => `${paymentLabels[p.method] || p.method}: R$ ${p.amount.toFixed(2)}`).join(" + ")
      : `${paymentLabels[sale.paymentMethod] || sale.paymentMethod}: R$ ${sale.total.toFixed(2)}`;

  let text = `🧾 *COMPROVANTE DE VENDA - ${storeName}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `*Venda:* ${sale.number}\n`;
  text += `*Data:* ${dateStr}\n`;
  text += `*Operador:* ${sale.cashier}\n`;
  if (sale.customer) {
    text += `*Cliente:* ${sale.customer.name || "Consumidor"}\n`;
    if (sale.customer.cpfCnpj) text += `*CPF/CNPJ:* ${sale.customer.cpfCnpj}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `*ITENS DA COMPRA:*\n\n`;
  text += `${itemsText}\n\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Subtotal: R$ ${sale.subtotal.toFixed(2)}\n`;
  if (sale.discount > 0) {
    text += `Desconto: -R$ ${sale.discount.toFixed(2)}\n`;
  }
  text += `*TOTAL PAGO: R$ ${sale.total.toFixed(2)}*\n`;
  text += `Forma de pagamento: ${paymentDesc}\n`;
  if (sale.change > 0) {
    text += `Troco: R$ ${sale.change.toFixed(2)}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Obrigado pela preferência! Volte sempre! ✨`;

  return text;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const internationalPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  return `https://wa.me/${internationalPhone}?text=${encodeURIComponent(message)}`;
}
