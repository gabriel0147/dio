# Validacao de arqueacao no Registro de Operacoes

## Objetivo

Impedir que o sistema aceite operacoes com nivel inicial ou final fora da tabela de arqueacao cadastrada para o tanque.

Antes desta correcao, quando o usuario informava um nivel maior que o ultimo ponto da tabela de arqueacao, o sistema extrapolava o volume e aceitava a operacao. Isso podia gerar volumes calculados que nao existem oficialmente na tabela do tanque.

## Problema corrigido

Exemplo do erro anterior:

- tabela de arqueacao do tanque vai ate `198 mm`;
- usuario informa `250 mm`, `500 mm` ou outro valor acima do limite;
- o sistema calculava um volume por extrapolacao;
- a operacao podia ser salva com valor invalido.

Agora isso e bloqueado.

## Comportamento atual

Quando o usuario informa um nivel inicial ou final:

1. O sistema verifica a tabela de arqueacao carregada para aquele tanque.
2. Identifica o menor e o maior nivel cadastrado.
3. Se o valor informado estiver fora desse intervalo, o volume aparece como `N/A`.
4. Ao tentar salvar, o sistema mostra uma notificacao de erro.
5. A operacao nao e salva.

Mensagem exibida:

```text
Nivel fora da tabela de arqueacao. Informe um nivel entre X mm e Y mm para este tanque.
```

Se a arqueacao nao estiver carregada ou cadastrada, a operacao tambem e bloqueada.

## Arquivos alterados

### `src/lib/calculations.ts`

Alteracoes:

- Removida a extrapolacao linear para niveis acima do ultimo ponto da tabela.
- Valores abaixo do primeiro ponto tambem deixam de usar automaticamente o primeiro volume.
- Criada a funcao `getCalibrationLevelRange`.
- Criada a funcao `isCalibrationLevelInRange`.

Regra nova:

```text
O sistema so calcula volume se o nivel estiver dentro do intervalo da tabela de arqueacao.
```

### `src/components/operations/OperationForm.tsx`

Alteracoes:

- O formulario agora busca o intervalo real da arqueacao do tanque.
- `Nivel Inicial (mm)` e `Nivel Final (mm)` sao validados antes de salvar.
- Se algum campo estiver fora do intervalo, o formulario:
  - marca erro no campo;
  - mostra toast/notificacao;
  - impede o envio da operacao.

### `src/lib/calculations.test.ts`

Alteracoes:

- O teste antigo esperava extrapolacao.
- O teste foi atualizado para garantir que valores fora da tabela nao sejam extrapolados.
- Foi adicionado teste para validar a funcao `isCalibrationLevelInRange`.

## Validacoes executadas

Foram executados:

```bash
npx tsc --noEmit
npx vitest run src/lib/calculations.test.ts
```

Resultado:

```text
Typecheck passou.
Teste de calculos passou.
```

## Observacao sobre `dist`

Durante a verificacao final, o `git status` mostrou muitos arquivos alterados em `dist/`.

Esses arquivos nao fazem parte desta correcao e nao foram modificados manualmente nesta alteracao. A mudanca funcional desta correcao esta limitada aos arquivos:

- `src/lib/calculations.ts`
- `src/components/operations/OperationForm.tsx`
- `src/lib/calculations.test.ts`

## Resultado esperado para o usuario

Na tela:

```text
sheet/prod-445820e2-0bdf-467a-8340-5a0e0f8fba15
```

Ao registrar ou editar uma operacao:

- se o nivel estiver dentro da arqueacao, o volume e calculado normalmente;
- se o nivel estiver acima ou abaixo da arqueacao, o volume nao e calculado;
- se tentar salvar mesmo assim, o sistema bloqueia a operacao.

Isso evita que o sistema aceite volumes que nao existem na tabela de arqueacao do tanque.
