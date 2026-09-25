# Relatorio tecnico completo do historico Git

Data da auditoria: 2026-08-04  
Repositorio: `Producao-por-tanque`  
Branch principal analisada: `main`  
Escopo: auditoria documental do historico Git, sem alteracoes funcionais no sistema.

## 1. Resumo executivo

Foi analisado o historico local completo do repositorio, com foco na branch `main` e verificacao complementar de branches locais, remotas, stash, refs auxiliares e commits orfaos. O repositorio nao esta shallow, portanto nao foi necessario buscar historico adicional.

O projeto evoluiu de um scaffold inicial amplo para uma aplicacao React/Vite com Supabase, modulos de producao, manutencao, SRT, SGPA, gestao de usuarios, tabelas de arqueacao, registro de operacoes, calculos de FCV, BSW, relatorios, graficos e regras de seguranca/RLS.

## 2. Escopo e metodologia

Foram usados comandos locais de Git para mapear:

- estado do working tree antes e depois da auditoria;
- commits em `main`;
- commits alcancaveis por todas as refs;
- branches locais e remotas;
- merges, reverts, stash, refs auxiliares e commits orfaos;
- evolucao por periodo, autores, arquivos, modulos, banco, funcoes e dependencias.

Nenhum commit, branch, migration ou arquivo funcional foi alterado. A unica alteracao autorizada e realizada foi a criacao deste relatorio em `docs/relatorio-historico-completo.md`.

## 3. Intervalo analisado

Primeiro commit em `main`: `45bf8c1` (`45bf8c16fde03843c8859af8cae19775c43d2c08`) em 2026-03-16, autor Gabriel Martins Sposito, mensagem `subindo codigo`.

Ultimo commit em `main`: `72f336f` (`72f336fe7ec89a39b7791bdf593ae1dacd4ca6f2`) em 2026-08-04, autor Lucas Raniere, mensagem `Merge pull request #20 from Luksmito/agent/corrige-sgpa-e-graficos-producao`.

Intervalo temporal principal: 2026-03-16 a 2026-08-04.

## 4. Contagem de commits

- Commits na branch `main`: 87.
- Commits no first-parent de `main`: 53.
- Commits alcancaveis por refs locais/remotas/stash inspecionadas: 91.
- Commits exclusivos identificados na branch `dev`: 1.
- Commits orfaos/unreachable identificados por `git fsck`: 6.
- Tags: nenhuma tag encontrada.

## 5. Branches e tags consideradas

Branches locais:

- `main`: ponta `72f336f`.
- `bsw_novo`: ponta `3394e3e`, sem commits exclusivos em relacao a `main`.
- `correcao_botao`: ponta `bb4d2b9`, sem commits exclusivos em relacao a `main`.
- `dev`: ponta `d7e2cfd`, com 1 commit exclusivo.

Branches remotas:

- `origin/main` / `origin/HEAD`: `72f336f`.
- `origin/bsw_novo`: `3394e3e`.
- `origin/correcao_botao`: `81bd66d`.
- `origin/dev`: `d7e2cfd`.

Tags: nenhuma.

## 6. Limitacoes da auditoria

- A auditoria foi feita sobre o clone local disponivel.
- O repositorio nao esta shallow, entao o historico principal estava completo localmente.
- Nao havia tags para correlacionar releases.
- As refs `refs/codex/turn-diffs/*` apontam para snapshots auxiliares de ferramenta, nao para commits de produto.
- Foram encontrados commits orfaos/unreachable; eles foram documentados separadamente e nao foram incorporados ao fluxo principal.
- O primeiro commit historico continha indicio de arquivo `.env`; o arquivo foi removido em commit posterior. Segredos, se existiram nesse historico, devem ser tratados como comprometidos e rotacionados.

## 7. Arquitetura atual identificada

Stack principal:

- React 19.
- Vite/Rolldown.
- TypeScript.
- Supabase.
- React Router.
- React Hook Form e Zod.
- Tailwind/Shadcn/Radix.
- Recharts.
- Vitest e Playwright.

Rotas e areas principais:

- autenticacao, recuperacao e reset de senha;
- hub de producao;
- hub de manutencao;
- modulos SRP, SGP, SMT, SBP, SRT e SGPA;
- gestao de usuarios, times, organograma e auditoria;
- dashboards, planilhas de producao, registros, relatorios e lacres;
- SRT: tanques, arqueacao, planejamentos, testes, BSW e FCV;
- SGPA: analises, eventos, anexos e configuracoes.

## 8. Evolucao por fases

Fase 1, fundacao inicial, 2026-03-16 a 2026-03-31:

- criacao do projeto;
- estrutura React/Vite/Supabase;
- migrations e funcoes iniciais;
- remocao posterior de `.env`;
- ajustes de criacao de projetos e times.

Fase 2, estabilizacao de modulos e selecao de projeto, 2026-04-01 a 2026-04-08:

- estabilizacao de selecao de projeto;
- escopo por modulo;
- SRT, gestao de producao e relatorios;
- reestruturacao para modulos dentro de um projeto unico;
- controles iniciais de BSW e criacao de pocos.

Fase 3, aprovacao, perfis e fluxo operacional, 2026-04-14 a 2026-04-16:

- fluxo de aprovacao de conta;
- roteamento por escopo;
- roles e funcionalidades;
- aceite de usuarios em projetos;
- publicacao e ajustes de nomes.

Fase 4, correcoes ortograficas, carregamento e arqueacao, 2026-06-09 a 2026-06-30:

- correcoes ortograficas em manutencao, gestao de usuarios e telas correlatas;
- correcoes de carregamento;
- remocao de arredondamentos;
- ajustes em lista de planejamentos;
- arqueacao e configuracao de Vercel.

Fase 5, registro de operacoes, seguranca e exportacoes, 2026-07-01 a 2026-07-18:

- exibicao de registros de operacoes;
- exclusao de usuarios;
- graficos;
- geracao de PDF;
- hardening de autorizacao e RLS;
- E2E publico;
- funcoes Supabase compartilhadas;
- categorias de destino de transferencia.

Fase 6, BSW, calculos, SGPA e graficos, 2026-07-24 a 2026-08-04:

- novo modelo de BSW;
- associacao de BSW por tanque;
- correcao e recorrencia de calculos;
- relatorio de modificacoes SRT;
- anexos e edicao do SGPA;
- reorganizacao de graficos de producao.

## 9. Entregas principais

- Scaffold completo da aplicacao.
- Autenticacao e gestao de usuarios.
- Projetos, times, membros e permissoes.
- Modulos operacionais de producao e manutencao.
- SRT com tanques, calibracao/arqueacao, sessoes, testes, BSW e FCV.
- SGPA com analises, eventos, anexos e graficos.
- Registro de operacoes e historico.
- Calculos de producao, volume, BSW e FCV.
- Supabase migrations, RLS, RPCs e Edge Functions.
- Deploy com Vercel rewrite.
- Testes unitarios e E2E em pontos criticos.
- Relatorios tecnicos e executivos.

## 10. Inventario de modulos atuais

Modulos de producao:

- SRP.
- SGP.
- SRT.
- SGPA.

Modulos de manutencao:

- SMT.
- SBP.

Areas administrativas:

- settings;
- management;
- operational management;
- user management;
- organogram;
- audit logs.

## 11. Banco de dados e migrations

Foram identificadas 105 migrations SQL atualmente no diretorio `supabase/migrations`. Ao longo do historico, 106 arquivos de migration apareceram em commits da `main`, indicando pelo menos uma remocao ou substituicao.

Temas recorrentes:

- criacao e ajuste de tabelas operacionais;
- project scope;
- module type;
- RLS e hardening;
- funcoes RPC;
- membros e aprovacoes;
- calibracao/arqueacao;
- BSW manual;
- categorias de transferencia;
- anexos SGPA.

Orientacao de governanca: migrations ja aplicadas em Supabase nao devem ser editadas retroativamente; novas alteracoes devem ser feitas por novas migrations.

## 12. Autenticacao, autorizacao e RLS

O historico mostra evolucao gradual de seguranca:

- remocao de `.env` do repositorio;
- criacao de politicas e funcoes para projetos/times;
- fluxo de aprovacao de usuarios;
- escopo por projeto/modulo;
- hardening em 2026-07-16;
- ajustes em Edge Functions para contexto autenticado.

Risco identificado: como o primeiro commit incluiu grande quantidade de arquivos e houve remocao posterior de `.env`, qualquer segredo que tenha sido versionado deve ser considerado exposto.

## 13. Interface e experiencia do usuario

O historico inclui ajustes extensos em:

- sidebar e navegacao;
- hubs de producao e manutencao;
- formularios SRT;
- planilhas de producao;
- registro de operacoes;
- telas de BSW;
- gestao de usuarios;
- graficos;
- SGPA;
- mensagens e ortografia.

Foram observadas muitas correcoes reativas a bugs de exibicao, loading, ordenacao, campos calculados e arredondamento.

## 14. APIs, Edge Functions e integracoes

Funcoes Supabase atuais identificadas:

- `clear-project-data`;
- `create-user`;
- `delete-user`;
- `export-calibration`;
- `export-fcv-calculation-logs`;
- `generate-seal-report`;
- `import-calibration`;
- `import-srt-calibration`;
- `invite-member`;
- `list-users`;
- `parse-excel`;
- `send-project-update`.

Tambem existe `_shared` para codigo comum.

## 15. Infraestrutura e deploy

Arquivos relevantes:

- `vite.config.ts`;
- `vercel.json`;
- `package.json`;
- `pnpm-lock.yaml`;
- `supabase/config.toml`;
- funcoes e migrations em `supabase/`.

O commit `bf4badc` adicionou correcao de Vercel com rewrite para SPA. O commit `4cb6c72` corrigiu Vite/build e atualizou lock/build artifacts.

## 16. Testes e qualidade

Testes atuais identificados:

- `src/lib/calculations.test.ts`;
- `src/lib/productionChart.test.ts`;
- `src/lib/sgpaAttachments.test.ts`;
- `e2e/public-auth.e2e.ts`.

O historico sugere que testes foram adicionados principalmente apos endurecimento de acesso e depois em areas de calculo/graficos/anexos.

## 17. Documentacao

Documentos relevantes apareceram em fases diferentes:

- contratos e docs iniciais;
- `HANDOFF.md`;
- matriz de testes;
- perguntas/checklists;
- relatorios executivos e tecnicos;
- `RELATORIO_MODIFICACOES_SRT.md`.

Parte da documentacao inicial foi removida em commits de limpeza.

## 18. Dependencias

Principais familias de dependencias:

- UI: Radix/Shadcn, Tailwind, lucide-react;
- formularios: react-hook-form, zod;
- dados: Supabase;
- graficos: Recharts;
- datas: date-fns;
- build: Vite/Rolldown;
- qualidade: TypeScript, Vitest, Playwright, ESLint/Oxlint/Prettier.

Foi observado ajuste de lockfile/build no periodo de deploy.

## 19. Estatisticas consolidadas

- Commits em `main`: 87.
- Commits em `main` por first-parent: 53.
- Commits alcancaveis por refs inspecionadas: 91.
- Merges identificados em todas as refs: 23, incluindo stash merge-like.
- Reverts explicitos por mensagem: 0.
- Objetos Git soltos: 2012.
- Tamanho de objetos soltos: 25.91 MiB.
- Tamanho de pack: 942.63 KiB.
- Migrations atuais: 105.
- Edge Functions com `index.ts`: 11.
- Arquivos `.tsx` atuais: 151.
- Arquivos `.ts` atuais: 58.
- Arquivos `.sql` atuais: 106.

## 20. Autores

Autores identificados:

- Gabriel Martins Sposito `<gabriel.gms0147@gmail.com>`;
- Lucas Raniere `<46611369+Luksmito@users.noreply.github.com>`;
- Luksmito `<lucasmaxgames@gmail.com>`.

Distribuicao em `main`:

- Gabriel Martins Sposito: 45 commits.
- Luksmito: 24 commits.
- Lucas Raniere: 18 commits.

## 21. Merges, reverts, duplicidades e branches

Merges principais:

- PR #1, #8, #9, #11, #12, #13, #14, #15, #16, #17, #18, #19 e #20.
- Varios merges manuais entre `main`, forks/branches de Luksmito e `dev`.

Reverts:

- Nao foram encontrados commits com mensagem explicita de revert.

Branches:

- `bsw_novo` e `correcao_botao` nao possuem commits exclusivos atuais em relacao ao `main`.
- `dev` possui um commit exclusivo: `d7e2cfd`, de 2026-04-08, `tirando segunda tela de manutencao`.

## 22. Funcionalidades removidas ou substituidas

Indicios pelo historico:

- Remocao de `.env` e ajuste de `.gitignore`.
- Remocao de documentacao/contratos antigos.
- Reestruturacao de arquitetura para centralizar modulos em um projeto unico.
- Ajustes em manutencao para evitar segunda tela ou projeto fixo duplicado.
- Substituicoes em regras de BSW e calculos.
- Mudancas em importacao de arqueacao, CSV/Excel e exportacoes.

## 23. Decisoes tecnicas inferidas

- Preferencia por SPA React com Vercel rewrite.
- Supabase como backend principal, com RLS e Edge Functions.
- Modelagem por projeto/modulo para reutilizar infraestrutura.
- Centralizacao de regras de calculo em libs/services.
- Uso de migrations incrementais para evolucao de schema.
- Adicao progressiva de testes nas areas com maior risco.

## 24. Riscos e dividas tecnicas

- Historico inicial possivelmente continha `.env`.
- Muitas correcoes reativas em calculos e consolidacao indicam area de alto risco.
- `dist/` aparece com muitas modificacoes historicas; se for artifact de build, convem revisar politica de versionamento.
- Migrations antigas nao devem ser alteradas se ja aplicadas.
- Nomes de commits sao pouco padronizados, dificultando auditoria fina.
- Existem refs/orfaos/stash com estados auxiliares que podem confundir contagens se nao forem separados.

## 25. Estado atual do produto

O produto atual contem:

- plataforma multi-modulo;
- controle por projeto;
- SRT com planejamento, testes, BSW, FCV e arqueacao;
- operacoes de producao, consolidacao e historico;
- SGPA com anexos/graficos;
- gestao administrativa e permissoes;
- funcoes Supabase para importacao/exportacao/usuarios/relatorios.

## 26. Pendencias e lacunas recomendadas

- Formalizar regras de calculo em documento tecnico de referencia.
- Expandir testes para consolidacao de operacoes, BSW e FCV.
- Garantir que todo campo calculado esteja readonly no frontend e protegido no backend.
- Revisar RLS de tabelas operacionais novas.
- Auditar historico de segredos e rotacionar credenciais possivelmente expostas.
- Padronizar mensagens de commit e changelog.
- Separar artefatos de build se nao forem necessarios no repositorio.

## 27. Conclusao

O historico mostra um sistema em evolucao acelerada, com muitas entregas funcionais e correcoes sucessivas em pontos sensiveis: autorizacao, escopo por modulo, calculos, BSW, consolidacao, arqueacao e SGPA. A branch `main` contem o historico principal consolidado. Branches secundarias atuais nao adicionam muito codigo exclusivo, exceto `dev` com um commit isolado.

A recomendacao principal e tratar calculos e schema como areas criticas: novas mudancas devem vir acompanhadas de tests, migrations novas e criterios claros de auditoria.

## 28. Categorias de commits

Classificacao heuristica por mensagem/impacto principal em `main`:

- Documentacao/relatorio/limpeza: 24.
- Merge/integracao: 22.
- Banco/infra/deploy/arquitetura: 18.
- Correcao funcional/UI/operacional: 16.
- Testes/qualidade: 4.
- Manutencao geral/outros: 3.

Esta classificacao e aproximada porque varios commits misturam UI, banco, servicos e documentacao.

## Apendice A - Commits analisados em `main`

| Commit | Data | Autor | Mensagem |
| --- | --- | --- | --- |
| `72f336f` | 2026-08-04 | Lucas Raniere | Merge pull request #20 from Luksmito/agent/corrige-sgpa-e-graficos-producao |
| `3a94140` | 2026-08-04 | Luksmito | reorganiza graficos de producao |
| `cca7426` | 2026-08-04 | Luksmito | corrige anexos e edicao do SGPA |
| `7052246` | 2026-07-30 | Gabriel Martins Sposito | relatorio |
| `3394e3e` | 2026-07-27 | Gabriel Martins Sposito | build |
| `ea5ac98` | 2026-07-27 | Gabriel Martins Sposito | recorrecao de calculo |
| `9788310` | 2026-07-26 | Gabriel Martins Sposito | conserto de calculo |
| `27d2e4c` | 2026-07-24 | Gabriel Martins Sposito | correcao vercel |
| `99ff5f6` | 2026-07-24 | Gabriel Martins Sposito | novo bsw |
| `5a01579` | 2026-07-18 | Gabriel Martins Sposito | correcao de criacao de transferencia |
| `ae51490` | 2026-07-17 | Gabriel Martins Sposito | correcoes pontuais |
| `4cb6c72` | 2026-07-17 | Gabriel Martins Sposito | correcao vite |
| `c364332` | 2026-07-16 | Gabriel Martins Sposito | apagando perguntas |
| `ce1e62d` | 2026-07-16 | Lucas Raniere | Merge pull request #19 from Luksmito/main |
| `a9b0087` | 2026-07-16 | Lucas Raniere | Merge branch 'gabriel0147:main' into main |
| `e970af1` | 2026-07-16 | Luksmito | fix: harden access and operational workflows |
| `fdff26f` | 2026-07-03 | Gabriel Martins Sposito | subi correcao geracao |
| `134bde7` | 2026-07-03 | Lucas Raniere | Merge pull request #18 from Luksmito/main |
| `28805b2` | 2026-07-03 | Lucas Raniere | Merge branch 'gabriel0147:main' into main |
| `82e2583` | 2026-07-03 | Luksmito | Merge branch 'main' of https://github.com/Luksmito/Producao-por-tanque merge |
| `69b023a` | 2026-07-03 | Luksmito | correcao geracao pdf |
| `375025c` | 2026-07-03 | Lucas Raniere | Merge pull request #17 from Luksmito/main |
| `b8e826d` | 2026-07-03 | Lucas Raniere | Merge branch 'gabriel0147:main' into main |
| `15b5e89` | 2026-07-03 | Luksmito | Correcao visualização grafica registros de operacao |
| `8e15d22` | 2026-07-02 | Gabriel Martins Sposito | correcao de exclui |
| `5fec095` | 2026-07-01 | Gabriel Martins Sposito | subi |
| `ffde737` | 2026-07-01 | Lucas Raniere | Merge pull request #16 from Luksmito/main |
| `1b0599a` | 2026-07-01 | Luksmito | Correcoes da exibicao do registro de operacoes |
| `bf4badc` | 2026-06-30 | Gabriel Martins Sposito | correcao vercel |
| `c9b11ba` | 2026-06-30 | Gabriel Martins Sposito | nova politica |
| `4bf28ef` | 2026-06-30 | Gabriel Martins Sposito | lista de planejamento |
| `6fb0739` | 2026-06-30 | Gabriel Martins Sposito | arqueacao |
| `ec7d62b` | 2026-06-27 | Gabriel Martins Sposito | tirando arredondamentos |
| `d98052b` | 2026-06-25 | Gabriel Martins Sposito | correcoes |
| `25dd752` | 2026-06-23 | Lucas Raniere | Merge pull request #15 from Luksmito/fix/user-approval-and-scope-cleanup |
| `8ff9871` | 2026-06-23 | Luksmito | Correcao do carregamento |
| `8546382` | 2026-06-14 | Gabriel Martins Sposito | correcao do carreagamento |
| `eba99ed` | 2026-06-09 | Gabriel Martins Sposito | correcao ortografica manutenção |
| `8a0b155` | 2026-06-09 | Gabriel Martins Sposito | correcao ortografica gestao de usuario |
| `cdb3e2d` | 2026-04-16 | Gabriel Martins Sposito | correcoes |
| `7d21896` | 2026-04-16 | Gabriel Martins Sposito | correcao fino |
| `4fdb488` | 2026-04-15 | Gabriel Martins Sposito | lancamento de teste |
| `d98abd2` | 2026-04-15 | Gabriel Martins Sposito | limpeza de nome |
| `47b8683` | 2026-04-15 | Gabriel Martins Sposito | publicar |
| `6541f61` | 2026-04-15 | Lucas Raniere | Merge pull request #14 from Luksmito/fix/user-approval-and-scope-cleanup |
| `a5175ed` | 2026-04-15 | Lucas Raniere | Merge branch 'gabriel0147:main' into fix/user-approval-and-scope-cleanup |
| `3ccff07` | 2026-04-15 | Luksmito | Usuario incluido nos projetos na aceitacao |
| `a7235ac` | 2026-04-15 | Lucas Raniere | Merge pull request #13 from Luksmito/fix/user-approval-and-scope-cleanup |
| `54f5925` | 2026-04-15 | Luksmito | docs(project): update checklist, questions and work log |
| `801258e` | 2026-04-15 | Luksmito | feat(app): stabilize scope routing and account approval flow |
| `3fe05ed` | 2026-04-14 | Luksmito | Merge branch 'main' of https://github.com/Luksmito/Producao-por-tanque |
| `5c5a022` | 2026-04-14 | Luksmito | pre merge |
| `19824df` | 2026-04-14 | Gabriel Martins Sposito | funcionalidades e roles do sistema |
| `423ae67` | 2026-04-08 | Gabriel Martins Sposito | atualizacao |
| `01d2adc` | 2026-04-08 | Gabriel Martins Sposito | atualizacao |
| `26f00c4` | 2026-04-08 | Lucas Raniere | Merge pull request #12 from gabriel0147/dev |
| `d23a9d0` | 2026-04-07 | Gabriel Martins Sposito | correcoes |
| `900ef4c` | 2026-04-07 | Gabriel Martins Sposito | traz relatorio.md da main para dev |
| `a920bbc` | 2026-04-07 | Gabriel Martins Sposito | resolve conflito |
| `1fe9582` | 2026-04-07 | Gabriel Martins Sposito | Merge branch 'main' into dev |
| `32d0e10` | 2026-04-07 | Gabriel Martins Sposito | trabalho feito na main |
| `2ac31e6` | 2026-04-07 | Gabriel Martins Sposito | te |
| `fad9904` | 2026-04-06 | Gabriel Martins Sposito | teste |
| `7c462da` | 2026-04-06 | Gabriel Martins Sposito | melhorando criacao de poco e controle de lancamento bsw |
| `4ca2ab3` | 2026-04-06 | Lucas Raniere | Merge pull request #11 from Luksmito/fix/codex-handoff-and-module-selection |
| `0056409` | 2026-04-06 | Luksmito | Reestruturacao da arquitetura para que os modulos englobem um unico projeto |
| `af4dc1d` | 2026-04-06 | Gabriel Martins Sposito | tirei o skip |
| `c370b28` | 2026-04-02 | Gabriel Martins Sposito | limpeza de contrato |
| `239144e` | 2026-04-02 | Gabriel Martins Sposito | atualizando o gitignore |
| `3185bca` | 2026-04-02 | Lucas Raniere | Merge pull request #9 from Luksmito/fix/codex-handoff-and-module-selection |
| `16d671b` | 2026-04-02 | Luksmito | docs(project): add codex handoff and testing context |
| `c5dc346` | 2026-04-02 | Luksmito | fix(projects): stabilize module scoping and selection |
| `2cd0355` | 2026-04-02 | Luksmito | Merge branch 'main' of https://github.com/Luksmito/Producao-por-tanque merge do  relatorio |
| `6f8632c` | 2026-04-02 | Luksmito | log |
| `ced75cf` | 2026-04-01 | Gabriel Martins Sposito | correcao do lacres na pagina de gestão de producao |
| `bf069fb` | 2026-04-01 | Gabriel Martins Sposito | Conserto do botoes |
| `3a4c087` | 2026-04-01 | Lucas Raniere | Merge pull request #8 from Luksmito/fix/github-issues-20260401 |
| `6e7bf2a` | 2026-04-01 | Luksmito | fix(srt): stabilize project selection and session loading |
| `45da158` | 2026-04-01 | Luksmito | fix(teams): stabilize membership and leaving flow |
| `8ded213` | 2026-03-31 | Lucas Raniere | Merge pull request #1 from gabriel0147/correcao_botao |
| `81bd66d` | 2026-03-31 | Lucas Raniere | Merge branch 'main' into correcao_botao |
| `bb4d2b9` | 2026-03-31 | Gabriel Martins Sposito | correcao |
| `e43899e` | 2026-03-31 | Luksmito | Correcoes na criacao de projetos e times |
| `6c15d62` | 2026-03-31 | Luksmito | gitignore |
| `9be91da` | 2026-03-31 | Luksmito | Adicionado o gitignore, retirado o .env e atualizadas migrations |
| `02c8fc9` | 2026-03-17 | Luksmito | documentos do projeto |
| `45bf8c1` | 2026-03-16 | Gabriel Martins Sposito | subindo codigo |

## Apendice B - Itens fora do fluxo principal

Commit exclusivo em `dev`:

- `d7e2cfd`, 2026-04-08, Gabriel Martins Sposito, `tirando segunda tela de manutenção`.

Stash identificado:

- `2236cfa`, 2026-04-07, Gabriel Martins Sposito, `On main: dev`, com 2 arquivos alterados.

Commits orfaos/unreachable identificados:

- `264d1b1`, 2026-04-06, `On main: troca dev`.
- `41f179a`, 2026-04-06, `untracked files on main: 7c462da melhorando criacao de poco e controle de lancamento bsw`.
- `19f5186`, 2026-04-06, `index on main: 7c462da melhorando criacao de poco e controle de lancamento bsw`.
- `f5f5341`, 2026-04-06, `On main: dev`.
- `36f8a5f`, 2026-04-06, `untracked files on main: 7c462da melhorando criacao de poco e controle de lancamento bsw`.
- `e1d97d6`, 2026-04-06, `index on main: 7c462da melhorando criacao de poco e controle de lancamento bsw`.

Refs auxiliares:

- `refs/codex/turn-diffs/*` existem como snapshots auxiliares de ferramenta e nao foram tratados como commits de produto.

## Validacao final

Esta auditoria e exclusivamente documental. Nenhum arquivo funcional, migration, configuracao de runtime, teste ou codigo de aplicacao foi alterado.
