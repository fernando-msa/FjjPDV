# FjjPDV

FjjPDV é um ponto de venda offline-first construído para mostrar arquitetura, experiência de operação e capacidade de execução em um produto realista de varejo.

O projeto combina checkout rápido, gestão de caixa, controle de estoque, painel administrativo e sincronização com nuvem em uma interface pensada para operar com teclado, mesmo quando a conexão cai.

## Destaques

- Checkout de alta velocidade com busca por nome, SKU e código de barras.
- Carrinho com ajuste rápido de quantidade, desconto e múltiplas formas de pagamento.
- Fluxo de caixa com abertura, suprimento, sangria e fechamento.
- Estoque com custo, preço de venda, margem e alerta de reposição.
- Dashboard com faturamento diário, ticket médio e produtos mais vendidos.
- Modo offline com IndexedDB, fila local e sincronização posterior com Supabase.
- Login com Supabase Auth e perfis de acesso separados entre operador e admin.
- Base PWA com manifest e service worker.

## Por que este projeto existe

PDVs precisam ser rápidos, estáveis e previsíveis. A proposta aqui foi montar uma solução que demonstre:

- consistência transacional com PostgreSQL;
- operação resiliente sem depender de internet;
- separação clara entre fluxo operacional e área administrativa;
- uma experiência de caixa pensada para produtividade real, não apenas para demo visual.

## Stack

- Frontend: Next.js, TypeScript e Tailwind CSS.
- UI: componentes próprios inspirados em shadcn/ui.
- Backend e banco: Supabase com PostgreSQL.
- Offline-first: IndexedDB para persistência local e fila de sincronização.
- PWA: manifest e service worker para instalação e uso contínuo.

## Funcionalidades implementadas

### Frente de caixa

- Pesquisa rápida de produtos por nome, SKU ou código de barras.
- Inclusão de itens no carrinho com um clique ou leitura simulada de código de barras.
- Finalização de venda com cálculo de total, desconto, recebido e troco.

### Movimentação de caixa

- Abertura de sessão de caixa.
- Registro de suprimentos e sangrias.
- Persistência local dos movimentos para uso offline.

### Estoque e produto

- Cadastro estruturado com custo, preço, margem e estoque mínimo.
- Baixa automática no estoque ao concluir uma venda.
- Indicadores visuais para itens em baixo estoque.

### Painel administrativo

- Faturamento do dia.
- Ticket médio.
- Produtos mais vendidos.
- Visão resumida da operação para tomada de decisão.

### Autenticação e perfis

- Login com Supabase Auth.
- Perfis separados entre operator e admin.
- Operator acessa o fluxo operacional.
- Admin tem visão completa de estoque, painel e controles administrativos.
- Em localhost, o app pode entrar em modo de demonstração local quando o Supabase exigir confirmação de e-mail ou limitar o login, para permitir testes rápidos do fluxo.

## Setup local

1. Instale as dependências com npm install.
2. Copie .env.example para .env.local.
3. Preencha as variáveis do Supabase.
4. Rode npm run dev.

## Variáveis de ambiente

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## Como testar o login

1. Crie o projeto no Supabase e copie a Project URL e a anon public key.
2. Preencha o arquivo .env.local com os valores do projeto.
3. Execute o app e faça o cadastro pelo modal de acesso.
4. Confirme o registro gerado na tabela profiles.
5. Para testar a experiência administrativa, altere o campo role para admin no Supabase.

## Banco no Supabase

O schema inicial está em supabase/schema.sql.

## Atalhos do operador

- F2 foca a busca de produtos.
- F4 finaliza a venda.
- Ctrl+S registra suprimento.

## Observações de produto

- O app foi estruturado para continuar operando sem internet e sincronizar quando a conexão retornar.
- O foco principal é demonstrar um PDV com boa UX, boa base técnica e narrativa forte de portfólio.
