-- A arquitetura passa a tratar cada projeto como contexto integrado entre modulos.
-- `module_type` deixa de ser usado para separar projetos por modulo.

UPDATE public.projects
SET module_type = NULL
WHERE module_type IS NOT NULL;
