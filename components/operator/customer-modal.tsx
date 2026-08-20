"use client";

import { useState } from "react";
import { Award, Check, Search, Trash2, UserCheck, UserPlus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCpfCnpj, formatPhone, validateCpf } from "@/lib/utils/formatters";
import type { CustomerInfo } from "@/lib/types";

export function CustomerModal({
  isOpen,
  onClose,
  currentCustomer,
  customers,
  onApplyCustomer,
  onSaveCustomer
}: {
  isOpen: boolean;
  onClose: () => void;
  currentCustomer: CustomerInfo | null;
  customers: CustomerInfo[];
  onApplyCustomer: (customer: CustomerInfo | null) => void;
  onSaveCustomer: (customer: CustomerInfo) => Promise<CustomerInfo>;
}) {
  const [cpfCnpj, setCpfCnpj] = useState(currentCustomer?.cpfCnpj || "");
  const [name, setName] = useState(currentCustomer?.name || "");
  const [phone, setPhone] = useState(currentCustomer?.phone || "");
  const [email, setEmail] = useState(currentCustomer?.email || "");
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  const isCpfFilled = cpfCnpj.replace(/\D/g, "").length === 11;
  const isCpfValid = isCpfFilled ? validateCpf(cpfCnpj) : true;

  const filteredCustomers = customers.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.cpfCnpj && c.cpfCnpj.includes(term)) ||
      (c.phone && c.phone.includes(term))
    );
  });

  function handleSelectExisting(cust: CustomerInfo) {
    setCpfCnpj(cust.cpfCnpj || "");
    setName(cust.name || "");
    setPhone(cust.phone || "");
    setEmail(cust.email || "");
  }

  async function handleConfirm() {
    if (!name.trim() && !cpfCnpj.trim() && !phone.trim()) {
      onClose();
      return;
    }

    const customerObj: CustomerInfo = {
      id: currentCustomer?.id,
      name: name.trim() || "Cliente Balcão",
      cpfCnpj: cpfCnpj.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      loyaltyPoints: currentCustomer?.loyaltyPoints || 0
    };

    const saved = await onSaveCustomer(customerObj);
    onApplyCustomer(saved);
    onClose();
  }

  function handleRemove() {
    onApplyCustomer(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-modal-title"
    >
      <button type="button" className="absolute inset-0" aria-label="Fechar" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-card p-6 shadow-glow">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 id="customer-modal-title" className="text-base font-bold text-white">
                Identificação do Cliente / CPF na Nota
              </h2>
              <p className="text-xs text-muted-foreground">Vincule o cliente à venda para fidelidade e recibo</p>
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

        <div className="grid flex-1 gap-6 overflow-y-auto py-4 md:grid-cols-[1.2fr_1fr]">
          {/* Formulário de Identificação Rápida */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <UserPlus className="h-4 w-4 text-primary" />
              Dados do Cliente
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-medium text-white flex justify-between">
                <span>CPF ou CNPJ</span>
                {isCpfFilled ? (
                  isCpfValid ? (
                    <span className="text-[11px] font-semibold text-emerald-400">✓ Válido</span>
                  ) : (
                    <span className="text-[11px] font-semibold text-rose-400">✗ Inválido</span>
                  )
                ) : null}
              </label>
              <Input
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                placeholder="000.000.000-00"
                className={`h-11 ${isCpfFilled && !isCpfValid ? "border-rose-500/60 focus-visible:ring-rose-500" : ""}`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-white">Nome do Cliente</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="h-11"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-white">WhatsApp / Telefone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="h-11"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-white">E-mail (opcional)</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="h-11"
              />
            </div>
          </div>

          {/* Lista de Clientes Cadastrados para Seleção Rápida */}
          <div className="flex flex-col space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                Clientes Cadastrados
              </h3>
              <Badge variant="outline" className="text-[10px]">
                {customers.length}
              </Badge>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente..."
                className="h-8 pl-8 text-xs"
              />
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px] pr-1">
              {filteredCustomers.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Nenhum cliente cadastrado encontrado.</p>
              ) : (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id || c.cpfCnpj}
                    type="button"
                    onClick={() => handleSelectExisting(c)}
                    className="w-full text-left rounded-xl border border-white/10 bg-black/20 p-2.5 transition hover:border-primary/50 hover:bg-primary/10"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-white truncate">{c.name}</p>
                      {c.loyaltyPoints ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-400">
                          <Award className="h-3 w-3" />
                          {c.loyaltyPoints} pts
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-col text-[10px] text-muted-foreground">
                      {c.cpfCnpj ? <span>CPF: {c.cpfCnpj}</span> : null}
                      {c.phone ? <span>Tel: {c.phone}</span> : null}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Rodapé e Botões */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 pt-4">
          {currentCustomer ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              className="gap-1.5 text-xs text-rose-400 hover:bg-rose-950/30 hover:text-rose-300"
            >
              <Trash2 className="h-4 w-4" />
              Remover da Venda
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="text-xs">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="gap-1.5 text-xs font-semibold"
            >
              <Check className="h-4 w-4" />
              Aplicar na Venda
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
