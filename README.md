# FjjPDV

FjjPDV é um ponto de venda offline-first construído para mostrar arquitetura, experiência de operação e capacidade de execução em um produto realista de varejo.

O projeto combina checkout rápido, gestão de caixa, controle de estoque, painel administrativo e sincronização com nuvem numa interface pensada para operar em tela cheia de monitor de caixa — com teclado, com leitor de código de barras e mesmo quando a conexão cai.

## Destaques

- Checkout em tela única, sem rolagem: carrinho, total e forma de pagamento sempre visíveis.
- Visor de total no estilo LED de registradora, com alto contraste para leitura rápida.
- Busca por nome, SKU, categoria ou código de barras, com filtro rápido por categoria.
- Múltiplas formas de pagamento (Pix, cartão, dinheiro) com cálculo automático de troco.
- Movimentação de caixa (suprimento e sangria) em gaveta lateral, sem interromper o checkout.
- Cancelamento de venda com reposição automática de estoque, motivo obrigatório e trilha de auditoria — restrito ao papel admin.
- Painel administrativo com faturamento, ticket médio, estoque com margem e histórico de vendas.
- Modo offline com IndexedDB, fila local de sincronização e reconciliação posterior com Supabase.
- Login com Supabase Auth e perfis de acesso separados entre operador e admin.
- PWA instalável, com manifest e service worker (network-first na navegação, para nunca travar numa versão desatualizada).

## Por que este projeto existe

PDVs precisam ser rápidos, estáveis e previsíveis. A proposta aqui foi montar uma solução que demonstre:

- consistência transacional com PostgreSQL;
- operação resiliente sem depender de internet;
- separação clara entre fluxo operacional e área administrativa, inclusive na interface;
- controles de integridade que qualquer PDV comercial exige (reposição de estoque, auditoria de cancelamento, conferência de caixa);
- uma experiência de caixa pensada para produtividade real de um operador, não apenas para demo visual.

## Stack

- Frontend: Next.js 15, React 19, TypeScript e Tailwind CSS.
- UI: componentes próprios inspirados em shadcn/ui, com tokens de design em CSS variables.
- Backend e banco: Supabase (PostgreSQL, Auth e Row Level Security).
- Offline-first: IndexedDB (via `idb`) para persistência local e fila de sincronização.
- PWA: manifest e service worker para instalação e uso contínuo.

## Arquitetura

A lógica é separada em hooks reutilizáveis, e a interface é dividida por papel de usuário — não existe uma tela única que mistura checkout e gestão.

```
lib/hooks/
  use-auth.ts            autenticação Supabase + modo demo local
  use-offline-store.ts   produtos, vendas, caixa, fila de sync e IndexedDB
  use-cart.ts            carrinho, totais e troco

components/
  auth/login-screen.tsx      tela de login e cadastro
  operator/operator-screen.tsx   checkout do operador (tela cheia, sem rolagem)
  admin/admin-dashboard.tsx      painel administrativo
  shared/                        peças reutilizadas pelas duas telas
  pdv-app.tsx                    orquestrador: liga os hooks e roteia por papel
```

Essa separação existe para que a tela de operador fique enxuta de propósito: ela só mostra o que quem está no caixa precisa decidir naquele instante. Estoque com margem, histórico completo e sincronização técnica ficam no painel administrativo.

## Funcionalidades implementadas

### Frente de caixa

- Pesquisa rápida de produtos por nome, SKU, categoria ou código de barras.
- Filtro por categoria em formato de pills, para reduzir digitação.
- Inclusão de itens no carrinho com um clique ou leitura de código de barras.
- Ajuste de quantidade, remoção de item e desconto por venda.
- Finalização com cálculo de total, valor recebido e troco, e confirmação visual da venda concluída.
- Atalhos de teclado: `F2` foca a busca, `F4` finaliza a venda, `Ctrl+S` abre e confirma suprimento.

### Movimentação de caixa

- Abertura de sessão de caixa com saldo inicial.
- Registro de suprimentos e sangrias numa gaveta lateral, sem sair do checkout.
- Persistência local dos movimentos para uso offline.

### Cancelamento de venda

- Disponível apenas no painel administrativo, nunca na tela do operador.
- Exige motivo por escrito antes de confirmar.
- Repõe o estoque dos itens automaticamente.
- Ajusta o total do caixa quando a venda cancelada era em dinheiro.
- Mantém a venda no histórico com status, motivo e responsável — nada é apagado.

### Estoque e produto

- Cadastro estruturado com custo, preço, margem e estoque mínimo.
- Baixa automática no estoque ao concluir uma venda, reposição automática ao cancelar.
- Indicadores visuais para itens em baixo estoque.

### Painel administrativo

- Faturamento do dia e ticket médio, calculados apenas sobre vendas válidas (cancelamentos não entram na conta).
- Estoque com margem por produto.
- Histórico de vendas recentes, com destaque visual para vendas canceladas.
- Visão técnica da fila de sincronização e dos perfis de acesso.

### Autenticação e perfis

- Login com Supabase Auth.
- Perfis separados entre `operator` e `admin`, definidos na tabela `profiles`.
- Operador acessa só o fluxo de checkout e caixa; admin também vê o painel administrativo.
- Em `localhost`, o app entra em modo de demonstração local (sem depender do Supabase) e mostra um seletor Operador/Admin na barra superior, só para facilitar testes — esse seletor não existe em produção.

## Setup local

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env.local`.
3. Preencha as variáveis do Supabase (opcional para rodar em modo demo local).
4. Rode `npm run dev`.

Em `localhost` sem as variáveis do Supabase preenchidas, o app funciona sozinho em modo demo, com o seletor de papel Operador/Admin na barra superior.

## Variáveis de ambiente

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Como testar o login

1. Crie o projeto no Supabase e copie a Project URL e a anon public key.
2. Preencha o arquivo `.env.local` com os valores do projeto.
3. Rode `supabase/schema.sql` no SQL editor do projeto.
4. Execute o app e faça o cadastro pelo modal de acesso.
5. Confirme o registro gerado na tabela `profiles`.
6. Para testar a experiência administrativa, altere o campo `role` para `admin` diretamente no Supabase.

## Banco no Supabase

O schema está em `supabase/schema.sql`, incluindo as colunas de cancelamento de venda (`status`, `canceled_at`, `canceled_by`, `cancel_reason`). As instruções `alter table ... add column if not exists` são seguras de rodar de novo em um banco que já existia antes dessas colunas.

## Observações de produto

- O app foi estruturado para continuar operando sem internet e sincronizar quando a conexão retornar.
- O service worker usa network-first para a navegação — garante instalação como PWA sem correr o risco de prender o operador numa versão desatualizada da tela.
- O foco principal é demonstrar um PDV com boa UX de operador, boa base técnica e controles de integridade equivalentes aos de um produto comercial.
