-- Update the main SRT project name and description to align with new identity
UPDATE public.projects
SET name = 'SRT - Sistema de Registro de Teste',
    description = 'Registro de teste'
WHERE name = 'Módulo SRT' 
   OR name = 'Módulo SRT Sistema de Registro de Testes e Controle de Tanques Móveis';

-- Remove the redundant project entry as requested
DELETE FROM public.projects
WHERE name = 'SRT - Sistema de Registro de Teste Registro de Teste de Apropriação da Produção';
