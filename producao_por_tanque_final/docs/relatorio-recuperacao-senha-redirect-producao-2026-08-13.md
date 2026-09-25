# Relatorio de Alteracoes - Recuperacao de Senha em Producao

Data: 13/08/2026

## Objetivo

Corrigir o fluxo de "esqueci minha senha" para que o link enviado por email nao direcione usuarios de producao para `localhost:8080`.

## Problema Identificado

O link de redefinicao de senha estava sendo montado com base em:

```ts
window.location.origin
```

Com isso, quando o pedido era feito em ambiente local, o email era enviado com destino para:

```text
http://localhost:8080/reset-password
```

Esse comportamento nao serve para clientes, pois o cliente precisa receber um link publico do ambiente de producao.

## Solucao Aplicada

Foi criada uma regra centralizada na tela de recuperacao de senha para montar a URL de redirect com prioridade para variaveis de ambiente publicas do Vercel.

A nova ordem de prioridade e:

1. `VITE_PASSWORD_RESET_REDIRECT_URL`
2. `VITE_SITE_URL`
3. `VITE_PUBLIC_SITE_URL`
4. `VITE_APP_URL`
5. Se estiver em `localhost`, usar o dominio publico padrao:

```text
https://producao-por-tanque-alpha.vercel.app/reset-password
```

6. Se estiver em producao sem variavel configurada, usar o dominio atual da pagina.

## Arquivo Alterado

### `src/pages/ForgotPassword.tsx`

Alteracoes realizadas:

- Removida a dependencia direta de `window.location.origin` como unica fonte da URL.
- Adicionada funcao `getResetRedirectUrl`.
- Adicionado fallback de producao para evitar envio de email com `localhost:8080`.
- Corrigidos textos com caracteres quebrados na tela de recuperacao de senha.
- Mantido o uso de `redirectTo`, que e a propriedade aceita pela versao atual do SDK Supabase usada no projeto.

## Configuracao Necessaria no Vercel

Adicionar a seguinte variavel de ambiente:

```env
VITE_SITE_URL=https://producao-por-tanque-alpha.vercel.app
```

Configuracao recomendada:

- Environment: `Production and Preview`
- Sensitive: desligado

Essa variavel nao e segredo, pois contem apenas a URL publica do sistema.

## Configuracao Necessaria no Supabase

No Supabase, acessar:

```text
Authentication > URL Configuration > Redirect URLs
```

Adicionar:

```text
https://producao-por-tanque-alpha.vercel.app/reset-password
```

Sem essa configuracao, o Supabase pode bloquear ou redirecionar incorretamente o link de recuperacao.

## Validacao Realizada

Foram executados os comandos:

```bash
npx tsc --noEmit
npm run build
```

Resultado:

- Typecheck executado com sucesso.
- Build de producao executado com sucesso.

## Resultado Esperado

Ao solicitar recuperacao de senha:

- Em producao, o email deve apontar para:

```text
https://producao-por-tanque-alpha.vercel.app/reset-password
```

- Em ambiente local, se nao houver variavel configurada, o sistema tambem evita enviar `localhost:8080` para o cliente e usa o dominio publico de producao como fallback.

## Observacao

Apos adicionar ou alterar variaveis de ambiente no Vercel, e necessario executar um novo deploy para que o frontend receba os novos valores no build.
