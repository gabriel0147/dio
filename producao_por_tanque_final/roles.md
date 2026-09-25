# Roles do Sistema

Este documento resume as roles identificadas no sistema com base nas tipagens e usos do projeto. Hoje existem três camadas principais de papel: role global de usuário, role dentro do projeto e role dentro do time.

## 1. Roles globais de usuário

As roles globais vêm do tipo `UserRole`.

### `operator`

- Perfil operacional.
- Atua no lançamento de dados de campo.
- Usado no acesso ao contexto de produção.

### `supervisor`

- Perfil de supervisão.
- Acessa gestão operacional.
- Pode auditar rotinas e acompanhar pendências.
- Tem uso específico em fluxos de checklist e supervisão.

### `petroleum_engineer`

- Perfil técnico.
- Relacionado a análise técnica e calibração/FCV.
- Tem permissão especial em telas como cálculo de FCV.

### `regulation`

- Perfil regulatório.
- Voltado a conformidade e aprovação/conferência em contexto corporativo.
- Também aparece no contexto de acesso à produção.

### `approver`

- Perfil de aprovador.
- Marcado no sistema como obsoleto em alguns pontos da interface.
- Ainda existe no tipo global e em checagens de acesso.

### `operations_manager`

- Gerente de operações.
- Tem acesso ampliado a supervisão, auditoria e manutenção.

### `director`

- Perfil executivo.
- Possui acesso amplo ao sistema.
- Pode acessar administração, auditoria e visão corporativa.

### `admin`

- Administrador do sistema.
- Possui acesso total.
- Pode gerir usuários, auditoria, configurações e acesso amplo aos projetos.

### `maintenance`

- Perfil dedicado à manutenção.
- Usado especialmente nas permissões do hub/manutenção.
- Existe na tipagem global mesmo quando não aparece em todos os formulários de criação/edição de usuário.

## 2. Roles de projeto

As roles de projeto vêm do tipo `ProjectRole`.

### `owner`

- Maior nível dentro do projeto.
- Pode administrar colaboradores e equipes do projeto.
- Pode acessar ações mais sensíveis, como limpeza de dados.
- Em vários fluxos equivale ao papel de gestão plena do projeto.

### `editor`

- Pode editar dados do projeto.
- Pode operar cadastros e registros conforme o módulo.
- Não possui o mesmo nível administrativo do `owner`.

### `viewer`

- Pode visualizar dados do projeto.
- Normalmente não pode editar nem salvar alterações operacionais.
- É usado no sistema para bloquear planilhas e formulários de edição.

## 3. Roles de time

As roles de time vêm do tipo `TeamRole`.

### `team_admin`

- Administrador do time.
- Pode gerenciar membros e papéis do time.
- É a role atribuída ao criador do time.

### `team_member`

- Membro comum do time.
- Participa do time sem poderes administrativos.

## 4. Como as roles se combinam

- A role global define o nível institucional do usuário no sistema.
- A role de projeto define o que ele pode fazer dentro de um projeto específico.
- A role de time define a posição dele dentro de um time colaborativo.

Exemplo prático:

- Um usuário pode ser `supervisor` globalmente.
- No projeto A ele pode ser `viewer`.
- No projeto B ele pode ser `editor`.
- Em um time ele pode ser `team_admin`.

## 5. Observações importantes

- O sistema usa tanto permissões globais quanto permissões por projeto.
- Em vários módulos, o acesso real depende mais da role no projeto do que da role global.
- `admin` e `director` costumam receber acesso ampliado ou total em múltiplos fluxos.
- `viewer` é a role mais restritiva dentro do projeto.
- A role `approver` ainda existe no código, mas já aparece marcada como obsoleta em partes da interface.
