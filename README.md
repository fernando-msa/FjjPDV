# FjjPDV - Ponto de Venda Moderno & Offline-First

**FjjPDV** é um sistema completo de Ponto de Venda (PDV / POS) moderno, ágil e de alta performance, construído com arquitetura **offline-first** para atender às exigências reais do comércio e varejo físico moderno, espelhando os melhores padrões de mercado de softwares como *Square, Clover, Toast, Linx, Totvs, ContaAzul e Hiper*.

O projeto combina uma frente de caixa ultra-rápida, múltiplos métodos de pagamento (split payment), gestão de comandas e vendas em espera, identificação de cliente com CPF na nota e programa de fidelidade, emissão e impressão de cupom térmico (80mm/58mm), envio de comprovante via WhatsApp, geração dinâmica de Pix com QR Code em tela, fechamento de caixa cego com conferência de valores, controle de estoque com CRUD completo no painel administrativo e sincronização resiliente com PostgreSQL / Supabase.

---

## 🚀 Recursos e Funcionalidades de Mercado

### ⚡ 1. Frente de Caixa & Operação Ágil
- **Checkout em tela única (Single-Screen)**: layout otimizado para monitores de caixa, mantendo catálogo, carrinho, visor de LED ambar, formas de pagamento e atalhos sempre visíveis sem rolagem desnecessária.
- **Grade Rápida Touch / Favoritos**: painel visual de acesso rápido para itens de alto giro com categorização por cores, perfeito para telas touch screen.
- **Busca Multicritério**: pesquisa instantânea por nome, SKU, código de barras (EAN-13) ou categoria via pills de navegação.
- **Descontos Flexíveis**: aplicação de desconto geral na venda (em R$ ou %) ou desconto individualizado por item no carrinho.
- **Vendas em Espera / Comandas (`F6`)**: suspenda atendimentos em andamento (ex: cliente que esqueceu a carteira, mesa em atendimento) e retome com 1 clique.
- **Identificação do Cliente / "CPF na Nota" (`F7`)**: validação de dígitos verificadores de CPF/CNPJ, máscara automática, pontuação de fidelidade e seleção de clientes cadastrados.

### 💳 2. Pagamentos & Comprovantes Digitais
- **Multi-Pagamento / Pagamento Dividido (`F8`)**: suporte a divisão de uma mesma venda em múltiplas modalidades (Pix + Dinheiro + Cartão de Crédito/Débito + Vale) com cálculo de saldo restante e troco em tempo real.
- **PIX Dinâmico com QR Code em Tela**: geração automática de payload Pix padrão Banco Central / EMVCo BR Code com valor exato da venda, exibição de QR Code vetorial SVG e botão de Copia-e-Cola com simulação de confirmação.
- **Cupom Térmico Não Fiscal (80mm/58mm)**: visual fiel de bobina térmica com dados da loja, operador, cliente, lista detalhada de itens, totalizadores, forma de pagamento e código de barras.
- **Impressão Nativa**: estilização `@media print` pronta para impressoras térmicas ESC/POS (Elgin, Bematech, Daruma, Epson).
- **Envio Direto por WhatsApp**: disparo de mensagem formatada via link direto `wa.me` com o comprovante completo para o WhatsApp do cliente.

### 💼 3. Gestão Financeira & Auditoria de Caixa
- **Fechamento de Caixa Cego (`F9`)**: contagem cega informada pelo operador (dinheiro em gaveta, comprovantes de cartão e pix); o sistema apura o saldo esperado, calcula eventuais quebras ou sobras de caixa e gera relatório impresso de turno.
- **Suprimento e Sangria (`Ctrl+S`)**: gaveta lateral para movimentações de entrada e retirada sem travar a venda.
- **Cancelamento e Estorno de Vendas**: restrito ao papel Admin, exigindo justificativa por escrito, trilha de auditoria e reposição automática do estoque.

### 📊 4. Painel Administrativo & Gestão de Estoque
- **CRUD Completo de Produtos**: cadastro e edição de produtos com gerador automático de código de barras EAN-13, SKU, cálculo de margem de lucro bruta em tempo real e alerta de estoque mínimo.
- **Exportação de Vendas para CSV**: download de relatórios detalhados com 1 clique para análise em Excel ou Google Sheets.
- **Auditoria de Fechamentos**: histórico consolidado das conferências de turnos de caixa fechados.
- **Métricas em Tempo Real**: faturamento do dia, ticket médio, vendas realizadas e saldo em dinheiro na gaveta.

---

## ⌨️ Mapa Completo de Atalhos de Teclado

O FjjPDV foi desenhado para operação rápida por teclado, eliminando o uso obrigatório de mouse:

| Atalho | Ação Executada |
|---|---|
| `F2` | Focar na barra de busca de produtos / SKU / Cód. Barras |
| `F4` | Finalizar a venda atual |
| `F6` | Abrir gaveta de Comandas / Vendas em Espera |
| `F7` | Abrir modal de Identificação de Cliente (CPF na Nota) |
| `F8` | Abrir modal de Multi-Pagamento (Pagamento Dividido) |
| `F9` | Abrir modal de Fechamento de Caixa Cego & Conferência |
| `Ctrl + S` | Abrir gaveta de Suprimento / Sangria de Caixa |
| `Esc` | Fechar qualquer gaveta ou modal ativo |

---

## 🛠️ Stack Tecnológica

- **Frontend**: Next.js 15, React 19, TypeScript e Tailwind CSS.
- **UI & Ícones**: Lucide Icons, design system com tokens em CSS variables (visor de LED âmbar e alto contraste).
- **Backend & Banco de Dados**: Supabase (PostgreSQL com Row Level Security, Auth e Triggers).
- **Offline-First**: IndexedDB (`idb` v2) com persistência local resiliente, detecção automática de conexão e fila de sincronização em segundo plano.
- **PWA**: Web App Manifest e Service Worker com estratégia *network-first* na navegação.

---

## 📁 Estrutura e Arquitetura do Projeto

```
app/
  globals.css              design tokens, visor LED e regras @media print para bobina térmica
  layout.tsx               configuração de fontes, viewport e metadados
  manifest.ts              manifesto PWA para instalação
  page.tsx                 ponto de entrada

components/
  operator/
    operator-screen.tsx      checkout do operador com visor, catálogo e atalhos
    pix-modal.tsx            modal de QR Code Pix dinâmico e payload Copia-e-Cola
    receipt-modal.tsx        cupom térmico 80mm com impressão nativa e envio via WhatsApp
    customer-modal.tsx       identificação rápida de cliente com CPF/CNPJ e fidelidade
    parked-sales-drawer.tsx  gaveta de comandas e vendas em espera (Park & Resume)
    split-payment-modal.tsx  modal de divisão em múltiplas formas de pagamento
    cash-closing-modal.tsx   fechamento de caixa cego com conferência esperada vs informada
    item-discount-modal.tsx  desconto individual por item no carrinho (R$ ou %)
    quick-favorites-grid.tsx grade rápida touch de produtos mais vendidos
  admin/
    admin-dashboard.tsx      painel de métricas, estoque, relatórios e auditoria de caixa
    product-form-modal.tsx   cadastro e edição de produtos com gerador EAN e margem
  shared/
    status-bar.tsx           barra de status online/offline, seletor de papel e sincronização
    pdv-ui.tsx               componentes compartilhados (MetricCard, PaymentButton, etc.)
  auth/
    login-screen.tsx         tela de login e criação de conta
  pdv-app.tsx                orquestrador principal que liga hooks e rotas

lib/
  hooks/
    use-auth.ts              autenticação Supabase + modo de demonstração local
    use-offline-store.ts     persistência IndexedDB, produtos, vendas, comandas, caixa e sync
    use-cart.ts              carrinho, split payments, descontos por item e cliente
  utils/
    pix.ts                   gerador de payload Pix EMV BR Code e matriz QR Code pura
    formatters.ts            máscaras e validadores de CPF/CNPJ, telefone e formatador de recibo
  local-db.ts                camada IndexedDB (v2) com stores para produtos, vendas, comandas e clientes
  mock-data.ts               dados iniciais de demonstração para operação imediata
  types.ts                   tipagem estrita TypeScript de todas as entidades
  supabase.ts                cliente Supabase para sincronização
```

---

## 🧪 Guias de Teste dos Fluxos Principais

### 1. Testando Multi-Pagamento (Pagamento Dividido)
1. Adicione itens ao carrinho somando qualquer valor (ex: R$ 40,00).
2. Pressione `F8` ou clique no botão **Dividido**.
3. Adicione R$ 20,00 no Pix e R$ 20,00 no Dinheiro (com R$ 30,00 recebidos).
4. Observe o cálculo do saldo restante zerando e a apuração do troco.
5. Clique em **Concluir Multi-Pagamento** e finalize a venda.

### 2. Testando Vendas em Espera (Comandas)
1. Adicione produtos ao carrinho.
2. Pressione `F6` ou clique no botão **Comandas**.
3. Digite um nome (ex: "Mesa 02") e clique em **Salvar**.
4. O carrinho será guardado e o caixa liberado para o próximo atendimento.
5. Pressione `F6` novamente e clique em **Retomar Venda no Caixa**.

### 3. Testando Identificação do Cliente & Envio por WhatsApp
1. Pressione `F7` ou clique em **Identificar Cliente**.
2. Digite um CPF válido ou selecione um cliente da lista (ex: "Mariana Silva").
3. Clique em **Aplicar na Venda**.
4. Finalize a venda; o comprovante abrirá automaticamente com os dados do cliente e o botão **WhatsApp** pronto para envio.

### 4. Testando PIX Dinâmico com QR Code Real
1. Selecione a opção **Pix** e finalize a venda ou abra o modal.
2. O QR Code vetorial será renderizado com o payload oficial BR Code no valor exato.
3. Teste o botão **Copiar Código Pix** ou clique em **Confirmar Pix Recebido**.

### 5. Testando Fechamento de Caixa Cego
1. Pressione `F9` ou clique em **Fechar Caixa**.
2. Digite os valores físicos contados em dinheiro, comprovantes de cartão e pix.
3. Clique em **Realizar Fechamento** e visualize o relatório de auditoria comparando o valor apurado pelo sistema versus o informado.

### 6. Testando Gestão de Produtos no Admin
1. Alterne para a visão **Painel administrativo** na barra superior.
2. Clique em **Novo Produto**.
3. Clique em **Gerar EAN** para criar um código de barras randômico, informe custo e preço para ver o cálculo da margem em tempo real e salve.
4. Volte para a tela de **Caixa** e pesquise pelo produto recém-criado.

---

## 💻 Executando o Projeto

### Pré-requisitos
- Node.js 18+ instalado.

### Passo a Passo
1. Instale as dependências:
   ```bash
   npm install
   ```

2. (Opcional) Configure as variáveis do Supabase em `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
   ```

3. Execute em modo de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Acesse no navegador: `http://localhost:3000`.

> **Modo Demo Local**: Em `localhost` sem as credenciais do Supabase configuradas, o app entra automaticamente em modo de demonstração local, persistindo todas as operações em IndexedDB e exibindo um seletor de papel **Operador / Admin** na barra superior para testes completos.
