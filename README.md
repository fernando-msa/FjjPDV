# FjjPDV

PDV offline-first com Next.js, TypeScript, Tailwind CSS, Supabase e IndexedDB.

## O que esta pronto

- Frente de caixa com busca por nome, SKU e codigo de barras.
- Carrinho com ajuste de quantidade, descontos e meios de pagamento.
- Movimentacao de caixa com suprimento e sangria.
- Estoque, dashboard e ultimas vendas persistidos localmente.
- Manifest, service worker e base para operacao PWA.
- Login com Supabase Auth e perfis `operator` / `admin`.

## Como rodar

1. Instale as dependencias com `npm install`.
2. Copie `.env.example` para `.env.local` e preencha as variaveis do Supabase.
3. Rode `npm run dev`.

## Variaveis de ambiente

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Autenticacao e perfis

- Novos cadastros entram como `operator` por padrao.
- A tabela `profiles` fica em `supabase/schema.sql`.
- Para promover um usuario a `admin`, altere o campo `role` na tabela `profiles` no Supabase.
- Operadores veem o fluxo de caixa e um resumo operacional; admins veem as telas completas de estoque e painel.

## Teste de login

1. Crie o projeto no Supabase e copie a `Project URL` e a `anon public key`.
2. Preencha `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Execute o app, crie um usuario no modal de acesso e confirme a linha correspondente em `profiles`.
4. Para testar o papel `admin`, atualize `profiles.role` para `admin` no dashboard do Supabase.

## Banco no Supabase

O schema inicial esta em `supabase/schema.sql`.

## Atalhos

- `F2` para focar a busca.
- `F4` para finalizar a venda.
- `Ctrl+S` para registrar suprimento.
