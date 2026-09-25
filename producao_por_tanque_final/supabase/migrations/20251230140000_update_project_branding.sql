UPDATE projects 
SET name = 'SRP - Sistema de Registro da Produção', 
    description = 'Cálculo de produção diária de óleo/água por tanque, incluindo correção térmica' 
WHERE name = 'Projeto de Produção por Tanque' 
   OR name = 'Gestão da Produção NBS Petróleo e Gás';
