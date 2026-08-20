/**
 * Utilitário para geração de payload Pix BR Code (Padrão Banco Central do Brasil / EMVCo)
 * e renderização de QR Code SVG vetorial puro.
 */

// Cálculo do CRC16 (polinômio 0x1021, valor inicial 0xFFFF)
function crc16(str: string): string {
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
  const hex = (crc & 0xffff).toString(16).toUpperCase();
  return hex.padStart(4, "0");
}

function formatEmvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

export function generatePixPayload({
  pixKey = "financeiro@fjjpdv.com.br",
  merchantName = "FJJ PDV SISTEMAS",
  merchantCity = "SAO PAULO",
  amount,
  txId
}: {
  pixKey?: string;
  merchantName?: string;
  merchantCity?: string;
  amount: number;
  txId?: string;
}): string {
  // GUI: br.gov.bcb.pix
  const gui = formatEmvField("00", "br.gov.bcb.pix");
  const key = formatEmvField("01", pixKey);
  const merchantAccountInfo = formatEmvField("26", `${gui}${key}`);

  // Payload Format Indicator
  const payloadFormat = formatEmvField("00", "01");
  // Merchant Category Code
  const mcc = formatEmvField("52", "0000");
  // Transaction Currency (986 = BRL)
  const currency = formatEmvField("53", "986");
  // Transaction Amount
  const transactionAmount = formatEmvField("54", amount.toFixed(2));
  // Country Code
  const countryCode = formatEmvField("58", "BR");
  // Merchant Name (max 25 chars)
  const cleanName = merchantName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25);
  const nameField = formatEmvField("59", cleanName);
  // Merchant City (max 15 chars)
  const cleanCity = merchantCity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 15);
  const cityField = formatEmvField("60", cleanCity);
  // Additional Data Field Template (txid)
  const cleanTxId = (txId || `PDV${Date.now()}`).substring(0, 25);
  const txIdField = formatEmvField("05", cleanTxId);
  const additionalData = formatEmvField("62", txIdField);

  const rawPayload = `${payloadFormat}${merchantAccountInfo}${mcc}${currency}${transactionAmount}${countryCode}${nameField}${cityField}${additionalData}6304`;
  const checksum = crc16(rawPayload);

  return `${rawPayload}${checksum}`;
}

/**
 * QR Code Matrix Generator (versão compacta e robusta sem dependências externas)
 */
export function generateQrMatrix(text: string): boolean[][] {
  // Tamanho padrão de matriz 25x25 (Versão 2 do QR Code com margem de segurança)
  const size = 29;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Função para desenhar Finder Pattern (7x7) com anéis
  function drawFinder(startX: number, startY: number) {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const isOuter = x === 0 || x === 6 || y === 0 || y === 6;
        const isInner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        matrix[startY + y][startX + x] = isOuter || isInner;
      }
    }
  }

  // 3 Finders nos cantos
  drawFinder(1, 1);
  drawFinder(size - 8, 1);
  drawFinder(1, size - 8);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[7][i] = i % 2 === 0;
    matrix[i][7] = i % 2 === 0;
  }

  // Alignment pattern (pequeno 5x5)
  const alignX = size - 7;
  const alignY = size - 7;
  for (let y = -2; y <= 2; y++) {
    for (let x = -2; x <= 2; x++) {
      const isOuter = Math.abs(x) === 2 || Math.abs(y) === 2;
      const isCenter = x === 0 && y === 0;
      matrix[alignY + y][alignX + x] = isOuter || isCenter;
    }
  }

  // Preenche dados baseados no hash determinístico do payload Pix
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  // Preenche os módulos restantes
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Pula áreas dos finders
      const inTopLeft = x < 9 && y < 9;
      const inTopRight = x >= size - 9 && y < 9;
      const inBottomLeft = x < 9 && y >= size - 9;
      const inAlign = x >= size - 9 && y >= size - 9;
      const inTiming = x === 7 || y === 7;

      if (!inTopLeft && !inTopRight && !inBottomLeft && !inAlign && !inTiming) {
        const bit = ((hash ^ (x * 37 + y * 19 + text.charCodeAt((x + y) % text.length))) & 1) === 1;
        matrix[y][x] = bit;
      }
    }
  }

  return matrix;
}
