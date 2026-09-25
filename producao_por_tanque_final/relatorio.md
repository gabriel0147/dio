# RelatÃ³rio de AlteraÃ§Ãµes

## 2026-03-31

### CorreÃ§Ã£o da navegaÃ§Ã£o lateral

Foi ajustada a lÃ³gica de estado ativo da sidebar em [src/components/AppSidebar.tsx](d:/Desktop_git/Producao-por-tanque/src/components/AppSidebar.tsx).

Problema corrigido:
- Na rota `/`, os itens `Home` e `ProduÃ§Ã£o` estavam sendo marcados como ativos ao mesmo tempo.

SoluÃ§Ã£o aplicada:
- Foi criada a verificaÃ§Ã£o `isHomeRoute`.
- O contexto de produÃ§Ã£o (`isProductionContext`) passou a ignorar explicitamente a rota inicial `/`.

Resultado esperado:
- Em `/`, apenas o item `Home` permanece destacado na navegaÃ§Ã£o.
## 2026-04-01

### CorreÃƒÂ§ÃƒÂ£o do destaque indevido entre `Times` e `ProduÃƒÂ§ÃƒÂ£o`

Foi ajustada a lÃƒÂ³gica de estado ativo da sidebar em [src/components/AppSidebar.tsx](d:/Desktop_git/Producao-por-tanque/src/components/AppSidebar.tsx).

Problema corrigido:
- Ao acessar `Times`, o item `ProduÃƒÂ§ÃƒÂ£o` tambÃƒÂ©m permanecia destacado indevidamente.

SoluÃƒÂ§ÃƒÂ£o aplicada:
- Foi criada uma distinÃƒÂ§ÃƒÂ£o explÃƒÂ­cita entre rotas do hub de produÃƒÂ§ÃƒÂ£o e rotas de produÃƒÂ§ÃƒÂ£o por projeto.
- O `isProductionContext` deixou de ser um contexto genÃƒÂ©rico e passou a ativar apenas em rotas realmente ligadas ao mÃƒÂ³dulo de produÃƒÂ§ÃƒÂ£o.

Resultado esperado:
- Em `/teams`, apenas o item `Times` permanece destacado na navegaÃƒÂ§ÃƒÂ£o.
- O item `ProduÃƒÂ§ÃƒÂ£o` fica ativo apenas nas rotas do mÃƒÂ³dulo de produÃƒÂ§ÃƒÂ£o.

### CorreÃ§Ã£o do 404 no RelatÃƒrio de Lacres

Foi adicionada a rota faltante do relatÃƒÂ³rio de lacres em [src/App.tsx](d:/Desktop_git/Producao-por-tanque/src/App.tsx).

Problema corrigido:
- O botÃƒÂ£o `RelatÃƒÂ³rios de Lacre`, acessado a partir do dashboard de produÃƒÂ§ÃƒÂ£o, redirecionava para uma URL sem rota registrada.
- Como consequÃƒÂªncia, a navegaÃƒÂ§ÃƒÂ£o caÃƒÂ­a em `NotFound`/404.

SoluÃƒÂ§ÃƒÂ£o aplicada:
- Foi importada a pÃƒÂ¡gina [src/pages/SealReportPage.tsx](d:/Desktop_git/Producao-por-tanque/src/pages/SealReportPage.tsx).
- Foi adicionada a rota `/project/:projectId/reports/seals`.

Resultado esperado:
- O acesso ao relatÃƒÂ³rio de lacres agora abre a tela correta em vez de cair em 404.

### Bugs:

Highlight itens do menu lateral inconsistentes.

Projeto: ajustado o fluxo de criacao para nao depender de `insert().select()` em `projects`, reduzindo conflito com RLS no retorno do insert.

Projeto: adicionada migration para corrigir policies/trigger de criacao de projetos e garantir visibilidade imediata do projeto para o criador.

Projeto: corrigido o timing da trigger `on_project_created` para `AFTER INSERT`, evitando erro de foreign key em `project_members`.

Infra: publicada a Edge Function `list-users`, necessaria para localizar usuarios por e-mail ao adicionar membros em times.

Infra: substituida a dependencia da Edge Function `list-users` por uma RPC `list_users_with_profiles()`, para tornar a busca/listagem de usuarios mais estavel em times, projetos e gestao de usuarios.

Banco: adicionada compatibilidade para a coluna `full_name` em `user_profiles`, usada pelo frontend em usuarios, times e relatorios.

SRT: ajustada a regra de listagem de tanques no planejamento de testes para fazer fallback para todos os tanques ativos quando sessoes abertas antigas esconderem toda a lista; a validacao de sessao duplicada permanece no salvamento.
SRT: a selecao de projeto passou a influenciar o contexto do modulo, filtrando pocos do projeto atual e exigindo projeto selecionado nas telas principais do SRT; como as tabelas do modulo nao possuem project_id, manteve-se um filtro plausivel baseado nos pocos vinculados.
Times: o criador do time agora entra automaticamente como `team_admin`, com migration para corrigir registros antigos, e a tela de membros passou a bloquear remocao ou troca de papel do criador.
Times: adicionada a acao de sair do time para membros nao criadores, mantendo o criador como responsavel permanente pelo time.
SGPA: a dashboard do Diario de Paradas passou a exigir projeto selecionado e a consultar eventos filtrando explicitamente pelo `projectId` atual, alinhando o modulo ao fluxo de selecao de projeto.
SRT: estabilizado o carregamento da visao geral e do planejamento de testes, evitando disparos repetidos durante a sincronizacao do projeto atual e dos pocos do contexto.
Times: a listagem de times passou a ser montada explicitamente a partir dos times do usuario (criador ou membro), reduzindo inconsistencias apos sair de um time, e a mensagem de sucesso foi normalizada em ASCII.
SRT: simplificada a leitura de planejamentos de teste para buscar `srt_tank_sessions` sem joins enriquecidos no mesmo select, resolvendo nomes de tanque, poco e responsavel em consultas separadas para evitar falhas de relacionamento no carregamento.
Infra: banco remoto limpo via migration, preservando apenas autenticacao e perfis de usuario para isolar erros de dados legados nos modulos.
SRT: o acesso pelo hub de Producao agora passa sempre pela tela intermediaria de selecao/criacao de projeto, sem pular direto para o unico projeto existente.
Analise funcional: consolidado um mapeamento de casos de uso por interface e por modulos/servicos, com matriz inicial de testes manuais em `matriz-testes.md`.
Regras de negocio: adicionados novos questionamentos em `perguntas.md` sobre tipagem de projetos, escopo por projeto no SGPA, limpeza de dados, ciclo de vida de projetos e modelo de permissao.
SGPA: a tela de analise operacional passou a exigir projeto selecionado e a buscar eventos filtrando explicitamente pelo projeto atual, evitando consolidacao cruzada entre projetos.
Projetos: iniciado o endurecimento da selecao por modulo com um campo estruturado `module_type` em `projects`, mantendo compatibilidade com projetos legados por inferencia e vinculando novos projetos ao modulo correto no momento da criacao.
Infra: consolidada a migration de `module_type` para evitar duplicidade e remover a dependencia de `unaccent()`, que estava quebrando o `supabase db push`.
Infra: adicionada migration para restaurar os dados de teste originais de campos, pocos e tanque base, e o script de limpeza do banco passou a preservar `projects`, `project_members`, `production_fields`, `wells` e `tanks`.
Infra: adicionada uma nova migration de limpeza total do banco, preservando apenas `auth.users` e `public.user_profiles`, incluindo remocao de projetos, tanques, pocos e campos de producao.
SRT: ajustado o fluxo de criacao de planejamento para restringir os tanques oferecidos ao escopo atual do projeto quando possivel e exibir imediatamente a sessao retornada pelo insert, evitando o efeito de sucesso sem item visivel na lista.
SRT: endurecido o carregamento de planejamentos na tela de lancamento de testes, esperando o contexto de projeto atual e carregando apenas sessoes abertas no modo de criacao, para evitar dropdown vazio ou fora do escopo.
Projetos: seletores e hub de producao passaram a usar `module_type` explicito quando existir, mantendo fallback por texto apenas para projetos legados; a criacao de projeto via seletor agora grava o modulo diretamente.
SRT: iniciada a correcao estrutural do modulo com `project_id` em `srt_mobile_tanks` e `srt_tank_sessions`, migrando o frontend e os servicos para filtrar planejamentos e tanques explicitamente pelo projeto atual em vez de depender apenas de inferencia por `well_id`.
Infra: executada nova limpeza total do banco remoto, preservando apenas `auth.users` e `public.user_profiles` para reiniciar os testes com base limpa.
SRT: corrigido o erro de runtime `useMemo is not defined` na tela de criacao de planejamento de testes, restaurando o import faltante em `NewSessionDialog`.
SRT: endurecida a leitura de planejamentos para nao derrubar a tela por falhas no enrich de nomes (tanque, poco, responsavel) ou por problema pontual no filtro por `project_id`, mantendo a renderizacao das sessoes base sempre que possivel.
Arquitetura: projetos passaram a ser tratados como contexto integrado entre modulos, removendo a separacao por `module_type` na navegacao e na criacao de projetos; SRP, SGP, SRT e SGPA agora compartilham a mesma lista de projetos.
Infra: executada nova limpeza total do banco remoto apos a unificacao arquitetural, preservando apenas `auth.users` e `public.user_profiles`.
Navegacao: a aba de Producao passou a funcionar em duas etapas, listando primeiro os projetos e exibindo os modulos SRP, SGP, SRT e SGPA apenas apos a escolha do projeto.
Navegacao: adicionada a criacao de projeto diretamente na aba de Producao e corrigido o botao de trocar projeto, limpando tambem o `currentProject` para retornar corretamente a lista.

## 2026-04-06

### Reorganizacao de cadastros e configuracoes

Foi ajustada a separacao entre dados operacionais e administracao do projeto para deixar mais evidente onde ficam os cadastros estruturais.

Alteracoes aplicadas:
- A pagina [src/pages/Settings.tsx](d:/Desktop_git/Producao-por-tanque/src/pages/Settings.tsx) passou a concentrar apenas configuracoes administrativas do projeto, com foco em `Geral`, `Colaboradores` e `Zona de Perigo`.
- A pagina [src/pages/Management.tsx](d:/Desktop_git/Producao-por-tanque/src/pages/Management.tsx) foi reforcada como area principal de cadastro estrutural, com destaque visual para `Campos de Producao`, `Pocos` e `Categorias de Destino`.
- A navegacao lateral em [src/components/AppSidebar.tsx](d:/Desktop_git/Producao-por-tanque/src/components/AppSidebar.tsx) passou a expor uma secao propria de `Cadastros`, reduzindo a dependencia exclusiva do bloco de supervisao para encontrar essa area.

Resultado esperado:
- Fica mais claro para o usuario onde cadastrar estrutura operacional do projeto.
- `Configuracoes` deixa de misturar parametros administrativos com dados mestres do processo.

### Correcao do carregamento infinito no lancamento de BSW

Foi corrigido um loop de recarregamento na tela [src/pages/srt/BSWManagement.tsx](d:/Desktop_git/Producao-por-tanque/src/pages/srt/BSWManagement.tsx), que mantinha a tabela presa em `Carregando registros...`.

Problema corrigido:
- O conjunto `allowedWellIds` era recriado a cada render.
- Isso mudava a referencia do `loadData`, disparando o `useEffect` continuamente e recolocando a tela em estado de carregamento.

Solucao aplicada:
- `allowedWellIds` passou a ser memorizado com `useMemo`.
- O carregamento passou a aguardar a finalizacao do estado `isLoadingProjects` antes de buscar os dados.

Resultado esperado:
- A tela de lancamento de BSW deixa de entrar em loop de loading.
- Os registros passam a carregar normalmente ou exibir estado vazio quando nao houver dados para os filtros selecionados.

## 2026-04-07

Checklist: o salvamento de checklist de tanque deixou de depender de `insert().select().single()` em [src/services/checklistService.ts](d:/Desktop_git/Producao-por-tanque/src/services/checklistService.ts), passando a gerar o `id` antes do insert para evitar leitura imediata sensivel a RLS.
Banco: criada a migration [supabase/migrations/20260407113000_fix_checklist_user_profiles_rls_recursion.sql](d:/Desktop_git/Producao-por-tanque/supabase/migrations/20260407113000_fix_checklist_user_profiles_rls_recursion.sql) para reimpor helpers seguros de papel e recriar as policies de `user_profiles` sem recursao.
Checklist: a policy de leitura global de checklists para supervisores passou a usar helper seguro, reduzindo dependencia direta de `user_profiles` durante a avaliacao de acesso.
Infra: a correcao completa do erro `infinite recursion detected in policy for relation "user_profiles"` depende da aplicacao da nova migration no banco Supabase remoto.
Layout: o header principal passou a respeitar `min-w-0` e `overflow-x-hidden` em [src/components/Layout.tsx](d:/Desktop_git/Producao-por-tanque/src/components/Layout.tsx) e [src/components/ui/sidebar.tsx](d:/Desktop_git/Producao-por-tanque/src/components/ui/sidebar.tsx), evitando que breadcrumb e navegacao superior invadam a sidebar em larguras menores.
SRT: a tela de lancamento de teste em [src/components/srt/TestForm.tsx](d:/Desktop_git/Producao-por-tanque/src/components/srt/TestForm.tsx) passou a herdar automaticamente `poço`, inicio e observacoes do planejamento selecionado, alem de exibir um resumo do planejamento no topo do formulario.
SRT: o botao de acao em [src/components/srt/SessionList.tsx](d:/Desktop_git/Producao-por-tanque/src/components/srt/SessionList.tsx) foi renomeado de `Testar` para `Lançar Teste`, reduzindo ambiguidade com a tela de visualizacao do historico de medicoes.
Hub: o acesso a `Manutenção (SMT)` e `Ativos (SBP)` em [src/pages/ProjectHub.tsx](d:/Desktop_git/Producao-por-tanque/src/pages/ProjectHub.tsx) passou a considerar tambem o papel do usuario no projeto atual (`owner`, `editor` ou `viewer`), alinhando o hub com a navegacao lateral.
SGPA: o filtro de `Causa Especifica` em [src/components/sgpa/EventForm.tsx](d:/Desktop_git/Producao-por-tanque/src/components/sgpa/EventForm.tsx) passou a comparar categorias de forma normalizada, limpando causas invalidas ao trocar a categoria e exibindo aviso explicito quando nao houver causa ativa disponivel.
SGPA: a edicao de eventos no Diario de Paradas passou a preencher `Fim` automaticamente ao marcar status `Fechado` e a limpar a duracao ao reabrir/cancelar o evento, com ajuste complementar em [src/services/sgpaService.ts](d:/Desktop_git/Producao-por-tanque/src/services/sgpaService.ts).
SGPA: o payload de edicao/criacao de eventos em [src/components/sgpa/EventForm.tsx](d:/Desktop_git/Producao-por-tanque/src/components/sgpa/EventForm.tsx) passou a normalizar `causeId`, `assetId`, `workOrderRef` e `notes`, evitando falhas por envio de strings vazias para campos opcionais e melhorando a mensagem de erro no salvamento.
Arquitetura: os projetos voltaram a ser separados por area fixa em `Produção` e `Manutenção`, com novo campo `project_scope` na migration [supabase/migrations/20260409110000_add_project_scope.sql](d:/trab/trabalhoPetroleo/Porducao-por-tanque/supabase/migrations/20260409110000_add_project_scope.sql) e filtro de listagem/criacao atualizado em [src/services/projectService.ts](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/services/projectService.ts), [src/context/ProjectContext.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/context/ProjectContext.tsx), [src/pages/ProjectSelection.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/pages/ProjectSelection.tsx), [src/pages/ProductionHub.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/pages/ProductionHub.tsx) e [src/pages/MaintenanceHub.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/pages/MaintenanceHub.tsx).
Navegacao: as rotas de selecao de projeto em [src/App.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/App.tsx) agora filtram por `production` para `SRP`, `SGP`, `SRT` e `SGPA`, e por `maintenance` para `SMT` e `SBP`.
UI: o card de entrada do modulo SRT passou a usar icone de gota em [src/pages/ProductionHub.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/pages/ProductionHub.tsx) e [src/pages/Index.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/pages/Index.tsx), substituindo o icone de frasco no acesso principal.
Arquitetura: a escolha/criacao manual de projetos foi removida dos hubs, e [src/pages/ProductionHub.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/pages/ProductionHub.tsx) e [src/pages/MaintenanceHub.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/pages/MaintenanceHub.tsx) agora entram direto nos projetos fixos de `Producao` e `Manutencao`.
Navegacao: as rotas diretas para `SRP`, `SGP`, `SMT` e `SBP` passaram a resolver automaticamente o projeto fixo por escopo via [src/components/ScopeProjectRedirect.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/components/ScopeProjectRedirect.tsx), e os antigos caminhos de selecao de `SRT`/`SGPA` redirecionam para o hub de producao em [src/App.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/App.tsx).
Banco: a limpeza solicitada foi consolidada na migration [supabase/migrations/20260409123000_reset_preserve_users_and_seed_fixed_projects.sql](d:/trab/trabalhoPetroleo/Porducao-por-tanque/supabase/migrations/20260409123000_reset_preserve_users_and_seed_fixed_projects.sql), que apaga os dados operacionais, preserva usuarios e recria os projetos fixos `Producao` e `Manutencao` com acesso para os usuarios existentes.
Auth: a tela de registro em [src/pages/Login.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/pages/Login.tsx) deixou de prometer sempre envio de email quando o `signUp` nao retorna erro, e o hook [src/hooks/use-auth.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/hooks/use-auth.tsx) agora retorna tambem `data.session` para distinguir cadastro confirmado automaticamente de confirmacao pendente no Supabase Auth.
Usuarios: a Edge Function [supabase/functions/create-user/index.ts](d:/trab/trabalhoPetroleo/Porducao-por-tanque/supabase/functions/create-user/index.ts) foi corrigida para usar apenas `inviteUserByEmail` no fluxo de criacao administrativa, evitando criar e convidar o mesmo usuario em seguida, e agora valida no servidor se quem chamou a rota e `admin` ou `director`.
Usuarios: foi corrigido um erro de execucao na Edge Function [supabase/functions/create-user/index.ts](d:/trab/trabalhoPetroleo/Porducao-por-tanque/supabase/functions/create-user/index.ts), que estava sem o import de `createClient` apos a refatoracao do fluxo de convite.
Usuarios: a Edge Function [supabase/functions/create-user/index.ts](d:/trab/trabalhoPetroleo/Porducao-por-tanque/supabase/functions/create-user/index.ts) foi endurecida para validar o JWT do chamador diretamente com `supabaseAdmin.auth.getUser(token)`, removendo a dependencia de `SUPABASE_ANON_KEY` no runtime e corrigindo um erro de import duplicado que impedia a execucao.
Usuarios: o fluxo administrativo de criacao por convite foi ajustado para fazer `upsert` em `user_profiles` na function [supabase/functions/create-user/index.ts](d:/trab/trabalhoPetroleo/Porducao-por-tanque/supabase/functions/create-user/index.ts), evitando falha quando o perfil ainda nao existe no momento da resposta do Auth, e [src/services/userService.ts](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/services/userService.ts) passou a extrair a mensagem real do corpo de erro da Edge Function mesmo quando o erro nao vem tipado exatamente como `FunctionsHttpError`.
Usuarios: [src/services/userService.ts](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/services/userService.ts) passou a enviar explicitamente o `Authorization: Bearer <access_token>` nas chamadas das Edge Functions administrativas `create-user` e `delete-user`, eliminando a dependencia do repasse implicito da sessao e atacando o erro `401` retornado pela `create-user`.
Usuarios: as Edge Functions administrativas `create-user` e `delete-user` foram redeployadas com `--no-verify-jwt`, porque o gateway do Supabase estava recusando previamente os JWTs assinados em `ES256` com `UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM`; a validacao do chamador permanece no codigo da function via `supabaseAdmin.auth.getUser(token)` e checagem de papel `admin/director`.
Usuarios: foi implantado um fluxo de aprovacao de contas com a migration [supabase/migrations/20260415220000_add_user_approval_workflow.sql](d:/trab/trabalhoPetroleo/Porducao-por-tanque/supabase/migrations/20260415220000_add_user_approval_workflow.sql), adicionando `approval_status`, `approved_at` e `approved_by` em `user_profiles`, ajustando o trigger `handle_new_user()` para criar novos cadastros como `pending` e expandindo a RPC `list_users_with_profiles()` para devolver o status de aprovacao.
Auth: [src/hooks/use-auth.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/hooks/use-auth.tsx) e [src/pages/Login.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/pages/Login.tsx) passaram a tratar cadastro como solicitacao de acesso, enviar `full_name` no signup, encerrar sessao criada automaticamente antes da aprovacao e bloquear login de contas `pending` ou `rejected` com mensagens especificas.
Usuarios: [src/pages/UserManagement.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/pages/UserManagement.tsx), [src/components/users/UsersTable.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/components/users/UsersTable.tsx), [src/services/userService.ts](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/services/userService.ts) e [supabase/functions/create-user/index.ts](d:/trab/trabalhoPetroleo/Porducao-por-tanque/supabase/functions/create-user/index.ts) foram ajustados para separar `Solicitacoes Pendentes`, `Usuarios Ativos` e `Solicitacoes Recusadas`, permitir aprovar/recusar contas pelo admin e garantir que usuarios criados administrativamente entrem como `active`.
Auth: [src/hooks/use-auth.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/hooks/use-auth.tsx) foi endurecido para nao promover `session/user` ao estado global do app antes de validar `approval_status`, corrigindo o caso em que o usuario acabava entrando automaticamente logo apos se cadastrar mesmo estando pendente.
Auth: foi corrigida a ordem de inicializacao em [src/hooks/use-auth.tsx](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/hooks/use-auth.tsx), resolvendo o erro `Cannot access 'fetchProfile' before initialization` introduzido durante o endurecimento do fluxo de aprovacao.
Usuarios: contas aprovadas e usuarios criados administrativamente passaram a receber automaticamente vinculos `viewer` nos projetos fixos `Producao` e `Manutencao`, via [src/services/userService.ts](d:/trab/trabalhoPetroleo/Porducao-por-tanque/src/services/userService.ts) e [supabase/functions/create-user/index.ts](d:/trab/trabalhoPetroleo/Porducao-por-tanque/supabase/functions/create-user/index.ts), eliminando o erro `Projeto fixo de producao nao encontrado` para usuarios novos.
Banco: a migration [supabase/migrations/20260415223000_backfill_fixed_project_memberships.sql](d:/trab/trabalhoPetroleo/Porducao-por-tanque/supabase/migrations/20260415223000_backfill_fixed_project_memberships.sql) foi aplicada para retroalimentar os usuarios ja ativos com acesso `viewer` aos dois projetos base do sistema.
SRT: [src/components/srt/TestForm.tsx](d:/Desktop_git/Producao-por-tanque/src/components/srt/TestForm.tsx) passou a avisar explicitamente quando o tanque da sessao nao possui tabela de arqueacao, evitando que volumes e potenciais fiquem zerados sem contexto durante o lancamento de testes.
Navegacao: [src/components/AppSidebar.tsx](d:/Desktop_git/Producao-por-tanque/src/components/AppSidebar.tsx) passou a exibir o bloco `Projeto: ...` e os atalhos operacionais da producao apenas no contexto de Producao, evitando misturar menu de projeto produtivo com o fluxo de Manutencao.
Hub: [src/pages/ProjectHub.tsx](d:/Desktop_git/Producao-por-tanque/src/pages/ProjectHub.tsx) foi simplificado para o contexto produtivo, removendo os cards de `Manutencao (SMT)` e `Ativos (SBP)` e o resumo de ativos monitorados; o indicador de pendencias foi renomeado para `Paradas Pendentes`.
Manutencao: corrigido o clique dos cards `SMT` e `SBP` em [src/pages/MaintenanceHub.tsx](d:/Desktop_git/Producao-por-tanque/src/pages/MaintenanceHub.tsx), substituindo a referencia quebrada a `selectedProject.id` pelo uso correto de `maintenanceProject.id`.
Navegacao: removida a duplicidade de `Gestao de Cadastro` em [src/components/AppSidebar.tsx](d:/Desktop_git/Producao-por-tanque/src/components/AppSidebar.tsx), mantendo o acesso apenas dentro de `Supervisao`.
Usuarios: [src/services/userService.ts](d:/Desktop_git/Producao-por-tanque/src/services/userService.ts) e [src/components/users/UsersTable.tsx](d:/Desktop_git/Producao-por-tanque/src/components/users/UsersTable.tsx) foram ajustados para mapear `created_at` corretamente e tratar datas invalidas na listagem, eliminando o `Invalid Date` em solicitacoes pendentes.
Usuarios: a Edge Function [supabase/functions/delete-user/index.ts](d:/Desktop_git/Producao-por-tanque/supabase/functions/delete-user/index.ts) passou a tratar exclusao como operacao idempotente quando o usuario ja foi removido manualmente do Auth, evitando erro ao tentar excluir novamente pela interface administrativa.
