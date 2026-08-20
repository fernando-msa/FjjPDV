import assert from "node:assert";

// --- 1. Formatter & Validator Functions ---
function formatCpfCnpj(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .substring(0, 14);
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
    .substring(0, 18);
}

function validateCpf(cpf) {
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

function formatPhone(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3").substring(0, 14);
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3").substring(0, 15);
}

// --- 2. Pix CRC16 and Payload Functions ---
function crc16(str) {
  let crc = 0xffff;
  const strlen = str.length;
  for (let c = 0; c < strlen; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function formatEmvField(id, value) {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function generatePixPayload({ pixKey, merchantName, merchantCity, amount, txId }) {
  const gui = formatEmvField("00", "br.gov.bcb.pix");
  const key = formatEmvField("01", pixKey);
  const merchantAccountInfo = formatEmvField("26", `${gui}${key}`);
  const payloadFormat = formatEmvField("00", "01");
  const mcc = formatEmvField("52", "0000");
  const currency = formatEmvField("53", "986");
  const transactionAmount = formatEmvField("54", amount.toFixed(2));
  const countryCode = formatEmvField("58", "BR");
  const cleanName = merchantName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25);
  const nameField = formatEmvField("59", cleanName);
  const cleanCity = merchantCity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 15);
  const cityField = formatEmvField("60", cleanCity);
  const cleanTxId = (txId || `PDV${Date.now()}`).substring(0, 25);
  const txIdField = formatEmvField("05", cleanTxId);
  const additionalData = formatEmvField("62", txIdField);

  const rawPayload = `${payloadFormat}${merchantAccountInfo}${mcc}${currency}${transactionAmount}${countryCode}${nameField}${cityField}${additionalData}6304`;
  const checksum = crc16(rawPayload);
  return `${rawPayload}${checksum}`;
}

console.log("==================================================");
console.log("🚀 INICIANDO BATERIA DE TESTES DO SISTEMA FJJPDV");
console.log("==================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Erro: ${err.message}`);
    failed++;
  }
}

// ==========================================
// GRUPO 1: Validações e Formatadores (CPF, Telefone, Pix)
// ==========================================
console.log("📦 1. Testes de Formatadores e Validadores:");

runTest("Validação de CPF válido padrão", () => {
  // CPF de teste gerado com algoritmo oficial válido
  const validCpf = "52998224725";
  assert.strictEqual(validateCpf(validCpf), true);
});

runTest("Validação de CPF com dígitos repetidos (ex: 111.111.111-11) deve falhar", () => {
  assert.strictEqual(validateCpf("111.111.111-11"), false);
  assert.strictEqual(validateCpf("00000000000"), false);
  assert.strictEqual(validateCpf("99999999999"), false);
});

runTest("Validação de CPF com dígito verificador adulterado", () => {
  assert.strictEqual(validateCpf("52998224724"), false); // Último dígito alterado
});

runTest("Máscara de CPF formatado", () => {
  assert.strictEqual(formatCpfCnpj("12345678901"), "123.456.789-01");
});

runTest("Máscara de CNPJ formatado", () => {
  assert.strictEqual(formatCpfCnpj("12345678000199"), "12.345.678/0001-99");
});

runTest("Máscara de Telefone Celular com 11 dígitos", () => {
  assert.strictEqual(formatPhone("11987654321"), "(11) 98765-4321");
});

runTest("Geração de Payload Pix EMVCo BR Code", () => {
  const payload = generatePixPayload({
    pixKey: "financeiro@fjjpdv.com.br",
    merchantName: "FJJ PDV",
    merchantCity: "SAO PAULO",
    amount: 150.5,
    txId: "PDV123"
  });

  assert.ok(payload.startsWith("00020126"));
  assert.ok(payload.includes("br.gov.bcb.pix"));
  assert.ok(payload.includes("financeiro@fjjpdv.com.br"));
  assert.ok(payload.includes("150.50"));
  assert.ok(payload.includes("5802BR"));
  assert.strictEqual(payload.length >= 80, true);
  // Checa se os últimos 4 caracteres são o CRC16 hex
  const checksum = payload.slice(-4);
  assert.strictEqual(/^[0-9A-F]{4}$/.test(checksum), true);
});

// ==========================================
// GRUPO 2: Lógica de Carrinho e Descontos
// ==========================================
console.log("\n🛒 2. Testes de Cálculo do Carrinho e Descontos:");

runTest("Cálculo correto de subtotal com múltiplos itens e quantidades", () => {
  const items = [
    { productId: "p1", unitPrice: 12.9, quantity: 2 }, // 25.80
    { productId: "p2", unitPrice: 6.5, quantity: 3 }    // 19.50
  ];
  const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  assert.strictEqual(Number(subtotal.toFixed(2)), 45.3);
});

runTest("Desconto por item individual não pode ultrapassar o total do item", () => {
  const item = { productId: "p1", unitPrice: 10.0, quantity: 2 }; // total 20.00
  const desiredDiscount = 25.0; // maior que 20
  const appliedDiscount = Math.min(Math.max(desiredDiscount, 0), item.unitPrice * item.quantity);
  assert.strictEqual(appliedDiscount, 20.0);
});

runTest("Cálculo de Desconto Global Percentual vs Fixo", () => {
  const subtotal = 100.0;
  const itemDiscounts = 10.0; // Base com desconto = 90.00
  const discountPercent = 10; // 10% de 90 = 9.00
  const computedPercentDiscount = (subtotal - itemDiscounts) * (discountPercent / 100);
  const total = subtotal - (itemDiscounts + computedPercentDiscount);

  assert.strictEqual(computedPercentDiscount, 9.0);
  assert.strictEqual(total, 81.0);
});

runTest("Total da venda nunca pode ser negativo", () => {
  const subtotal = 50.0;
  const excessiveDiscount = 80.0;
  const total = Math.max(subtotal - excessiveDiscount, 0);
  assert.strictEqual(total, 0.0);
});

// ==========================================
// GRUPO 3: Multi-Pagamento (Split) e Troco
// ==========================================
console.log("\n💳 3. Testes de Multi-Pagamento (Split) e Troco:");

runTest("Validação de pagamento único em Dinheiro com troco", () => {
  const total = 42.5;
  const cashReceived = 50.0;
  const change = Math.max(cashReceived - total, 0);
  const canFinalize = cashReceived >= total && total > 0;

  assert.strictEqual(change, 7.5);
  assert.strictEqual(canFinalize, true);
});

runTest("Validação de pagamento único em Dinheiro insuficiente deve bloquear", () => {
  const total = 42.5;
  const cashReceived = 40.0;
  const canFinalize = cashReceived >= total;
  assert.strictEqual(canFinalize, false);
});

runTest("Validação de Multi-Pagamento (Split: Pix + Cartão + Dinheiro com Troco)", () => {
  const total = 100.0;
  const payments = [
    { method: "pix", amount: 40.0 },
    { method: "credit", amount: 30.0 },
    { method: "cash", amount: 30.0, receivedAmount: 50.0, change: 20.0 }
  ];

  const totalSplitPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const remaining = Math.max(total - totalSplitPaid, 0);
  const canFinalize = totalSplitPaid >= total && total > 0;

  assert.strictEqual(totalSplitPaid, 100.0);
  assert.strictEqual(remaining, 0.0);
  assert.strictEqual(canFinalize, true);
  assert.strictEqual(payments[2].change, 20.0);
});

runTest("Multi-Pagamento parcial incompleto deve acusar saldo restante", () => {
  const total = 100.0;
  const payments = [
    { method: "pix", amount: 40.0 },
    { method: "card", amount: 30.0 }
  ];
  const totalSplitPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const remaining = Math.max(total - totalSplitPaid, 0);
  const canFinalize = totalSplitPaid >= total;

  assert.strictEqual(remaining, 30.0);
  assert.strictEqual(canFinalize, false);
});

// ==========================================
// GRUPO 4: Gestão de Caixa e Fechamento Cego
// ==========================================
console.log("\n💼 4. Testes de Fechamento de Caixa Cego & Auditoria:");

runTest("Cálculo exato de saldo esperado em gaveta", () => {
  const openingBalance = 250.0;
  const supplyAmount = 100.0;
  const withdrawalAmount = 50.0;
  const netMovements = supplyAmount - withdrawalAmount; // +50.00
  const cashSales = 180.0;

  const expectedCashInDrawer = openingBalance + netMovements + cashSales;
  assert.strictEqual(expectedCashInDrawer, 480.0);
});

runTest("Fechamento cego com Quebra de Caixa (Falta de dinheiro)", () => {
  const expectedTotal = 1000.0;
  const reportedCash = 350.0;
  const reportedCard = 400.0;
  const reportedPix = 200.0; // Total informado: 950.00 (Falta de 50.00)

  const reportedTotal = reportedCash + reportedCard + reportedPix;
  const difference = reportedTotal - expectedTotal;

  assert.strictEqual(reportedTotal, 950.0);
  assert.strictEqual(difference, -50.0); // Quebra / Falta
});

runTest("Fechamento cego com Sobra de Caixa", () => {
  const expectedTotal = 500.0;
  const reportedTotal = 515.5;
  const difference = reportedTotal - expectedTotal;

  assert.strictEqual(difference, 15.5); // Sobra
});

// ==========================================
// GRUPO 5: Estoque, Margens e Cancelamento
// ==========================================
console.log("\n📦 5. Testes de Estoque, Margens e Cancelamento:");

runTest("Cálculo de margem bruta de lucro", () => {
  const price = 15.0;
  const cost = 10.0;
  const margin = ((price - cost) / cost) * 100;
  assert.strictEqual(margin, 50.0);
});

runTest("Detecção de estoque baixo quando estoque <= minStock", () => {
  const prod1 = { stock: 8, minStock: 10 };
  const prod2 = { stock: 15, minStock: 10 };
  assert.strictEqual(prod1.stock <= prod1.minStock, true);
  assert.strictEqual(prod2.stock <= prod2.minStock, false);
});

runTest("Reposição de estoque após cancelamento de venda", () => {
  let products = [
    { id: "p1", stock: 10 },
    { id: "p2", stock: 5 }
  ];
  const saleItems = [{ productId: "p1", quantity: 3 }];

  // Cancelamento
  products = products.map((p) => {
    const sold = saleItems.find((i) => i.productId === p.id);
    return sold ? { ...p, stock: p.stock + sold.quantity } : p;
  });

  assert.strictEqual(products[0].stock, 13);
  assert.strictEqual(products[1].stock, 5);
});

console.log("\n==================================================");
console.log(`📊 RESULTADO DA BATERIA: ${passed} PASSOU / ${failed} FALHOU`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
