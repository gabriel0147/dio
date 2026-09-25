import { Project, ProjectModule } from './types'

const moduleKeywords: Record<ProjectModule, string[]> = {
  srp: ['srp', 'registro da producao', 'registro de producao'],
  sgp: ['sgp', 'gestao da producao', 'gestao de producao'],
  smt: ['smt', 'manutencao', 'maintenance'],
  sbp: ['sbp', 'bens patrimoniais', 'patrimonio'],
  srt: ['srt', 'sistema de registro de teste', 'registro de teste'],
  sgpa: ['sgpa', 'sistema de gestao de paradas', 'gestao de paradas', 'parada'],
}

const normalize = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export function inferProjectModuleFromText(
  name?: string | null,
  description?: string | null,
): ProjectModule | null {
  const text = `${normalize(name)} ${normalize(description)}`

  for (const [module, keywords] of Object.entries(moduleKeywords) as [
    ProjectModule,
    string[],
  ][]) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return module
    }
  }

  return null
}

export function getProjectModule(project: Partial<Project>): ProjectModule | null {
  return project.moduleType || inferProjectModuleFromText(project.name, project.description)
}

export function projectMatchesModule(
  project: Partial<Project>,
  module: ProjectModule,
): boolean {
  return getProjectModule(project) === module
}
