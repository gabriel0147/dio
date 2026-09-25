import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useProject } from '@/context/ProjectContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AddTankDialog } from '@/components/AddTankDialog'
import { EditTankDialog } from '@/components/EditTankDialog'
import {
  Database,
  Droplets,
  ExternalLink,
  Map as MapIcon,
  Info,
  Trash2,
} from 'lucide-react'
import type { Tank } from '@/lib/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function Registrations() {
  const { projectId } = useParams()
  const {
    currentProject,
    setCurrentProject,
    projects,
    wells,
    productionFields,
    deleteTank,
  } = useProject()
  const [tankToDelete, setTankToDelete] = useState<Tank | null>(null)

  const handleDeleteTank = async () => {
    if (!tankToDelete) return
    try {
      await deleteTank(tankToDelete.id)
      setTankToDelete(null)
    } catch {
      // A mensagem amigável é exibida pelo contexto do projeto.
    }
  }

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find((p) => p.id === projectId)
      if (project && project.id !== currentProject?.id) {
        setCurrentProject(project)
      }
    }
  }, [projectId, projects, currentProject, setCurrentProject])

  const groupedTanks = useMemo(() => {
    if (!currentProject) return {}

    const groups: Record<string, typeof currentProject.tanks> = {}
    productionFields.forEach((pf) => {
      groups[pf.id] = []
    })

    currentProject.tanks.forEach((tank) => {
      if (groups[tank.productionFieldId]) {
        groups[tank.productionFieldId].push(tank)
      } else {
        if (!groups['other']) groups['other'] = []
        groups['other'].push(tank)
      }
    })

    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) =>
        a.tag.localeCompare(b.tag, undefined, { numeric: true }),
      )
    })

    return groups
  }, [currentProject, productionFields])

  const projectWells = useMemo(() => {
    const pfIds = new Set(productionFields.map((pf) => pf.id))
    const filtered = wells.filter((w) => pfIds.has(w.productionFieldId))

    return filtered.sort((a, b) => {
      const pfA =
        productionFields.find((p) => p.id === a.productionFieldId)?.name || ''
      const pfB =
        productionFields.find((p) => p.id === b.productionFieldId)?.name || ''

      const getScore = (name: string) => {
        const n = name.toLowerCase()
        if (n.includes('mosquito')) return 1
        if (n.includes('saíra') || n.includes('saira')) return 2
        return 3
      }

      const scoreA = getScore(pfA)
      const scoreB = getScore(pfB)

      if (scoreA !== scoreB) {
        return scoreA - scoreB
      }

      return a.name.localeCompare(b.name, undefined, { numeric: true })
    })
  }, [wells, productionFields])

  const wellTanksMap = useMemo(() => {
    if (!currentProject) return {}
    const map: Record<string, string[]> = {}

    currentProject.tanks.forEach((tank) => {
      if (tank.wellId) {
        if (!map[tank.wellId]) map[tank.wellId] = []
        map[tank.wellId].push(tank.tag)
      }
    })

    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    })

    return map
  }, [currentProject])

  if (!currentProject) {
    return (
      <div className="p-8 text-center animate-pulse">Carregando projeto...</div>
    )
  }

  const getProductionFieldName = (id: string) => {
    return productionFields.find((f) => f.id === id)?.name || 'N/A'
  }

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cadastros</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie tanques e visualize os poços cadastrados no projeto{' '}
            {currentProject.name}.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle>Tanques por Campo de Produção</CardTitle>
              </div>
              <CardDescription>
                Lista de tanques organizados hierarquicamente por seus
                respectivos campos de produção.
              </CardDescription>
            </div>
            <AddTankDialog className="w-full md:w-auto" />
          </CardHeader>
          <CardContent>
            {productionFields.length === 0 && !groupedTanks['other'] ? (
              <div className="text-center py-8 text-muted-foreground border rounded-md border-dashed">
                Nenhum campo de produção cadastrado. Cadastre campos primeiro em
                Configurações ou adicione um tanque.
              </div>
            ) : (
              <Accordion
                type="multiple"
                className="w-full space-y-4"
                defaultValue={productionFields.map((pf) => pf.id)}
              >
                {productionFields.map((field) => {
                  const tanks = groupedTanks[field.id] || []
                  return (
                    <AccordionItem
                      key={field.id}
                      value={field.id}
                      className="border rounded-md px-4 bg-card"
                    >
                      <AccordionTrigger className="hover:no-underline py-2 text-sm font-semibold">
                        <div className="flex items-center gap-3">
                          <MapIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{field.name}</span>
                          <Badge
                            variant="secondary"
                            className="rounded-full text-xs"
                          >
                            {tanks.length}{' '}
                            {tanks.length === 1 ? 'Tanque' : 'Tanques'}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 pt-2">
                        <div className="rounded-md border bg-background">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[150px] text-xs h-9">
                                  Tag
                                </TableHead>
                                <TableHead className="text-xs h-9">
                                  Poço
                                </TableHead>
                                <TableHead className="text-xs h-9">
                                  Geolocalização
                                </TableHead>
                                <TableHead className="text-right text-xs h-9">
                                  Ações
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {tanks.length === 0 ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={4}
                                    className="h-24 text-center text-xs text-muted-foreground"
                                  >
                                    Nenhum tanque vinculado a este campo.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                tanks.map((tank) => (
                                  <TableRow key={tank.id}>
                                    <TableCell className="font-medium text-xs whitespace-nowrap py-2">
                                      <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
                                        {tank.tag}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs py-2">
                                      <span className="truncate block max-w-[150px]">
                                        {tank.wellName || '-'}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-xs py-2">
                                      <span className="truncate block max-w-[200px]">
                                        {tank.geolocation || '-'}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right py-2">
                                      <div className="flex items-center justify-end gap-2">
                                        <Button
                                          asChild
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                        >
                                          <Link
                                            to={`/project/${currentProject.id}/sheet/prod-${tank.id}`}
                                            title="Ir para Operações"
                                          >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                          </Link>
                                        </Button>
                                        <EditTankDialog tank={tank} />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-7 text-destructive hover:text-destructive"
                                          onClick={() => setTankToDelete(tank)}
                                          aria-label={`Excluir tanque ${tank.tag}`}
                                        >
                                          <Trash2 className="size-3.5" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}

                {groupedTanks['other'] && groupedTanks['other'].length > 0 && (
                  <AccordionItem
                    value="other"
                    className="border rounded-md px-4 border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900"
                  >
                    <AccordionTrigger className="hover:no-underline py-2 text-sm font-semibold">
                      <div className="flex items-center gap-3">
                        <MapIcon className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                        <span className="truncate text-amber-800 dark:text-amber-500">
                          Outros
                        </span>
                        <Badge
                          variant="outline"
                          className="rounded-full border-amber-500 text-amber-800 dark:text-amber-500 text-xs"
                        >
                          {groupedTanks['other'].length}{' '}
                          {groupedTanks['other'].length === 1
                            ? 'Tanque'
                            : 'Tanques'}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-2">
                      <div className="rounded-md border bg-background">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs h-9">Tag</TableHead>
                              <TableHead className="text-xs h-9">
                                Poço
                              </TableHead>
                              <TableHead className="text-xs h-9">
                                Geolocalização
                              </TableHead>
                              <TableHead className="text-right text-xs h-9">
                                Ações
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupedTanks['other'].map((tank) => (
                              <TableRow key={tank.id}>
                                <TableCell className="font-medium text-xs whitespace-nowrap py-2">
                                  {tank.tag}
                                </TableCell>
                                <TableCell className="text-xs py-2">
                                  <span className="truncate block max-w-[150px]">
                                    {tank.wellName || '-'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs py-2">
                                  <span className="truncate block max-w-[200px]">
                                    {tank.geolocation || '-'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right py-2">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      asChild
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                    >
                                      <Link
                                        to={`/project/${currentProject.id}/sheet/prod-${tank.id}`}
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </Link>
                                    </Button>
                                    <EditTankDialog tank={tank} />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-7 text-destructive hover:text-destructive"
                                      onClick={() => setTankToDelete(tank)}
                                      aria-label={`Excluir tanque ${tank.tag}`}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" />
              <CardTitle>Poços</CardTitle>
            </div>
            <CardDescription>
              Lista de todos os poços cadastrados disponíveis e seus respectivos
              tanques associados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs h-9">Poço</TableHead>
                    <TableHead className="text-xs h-9">Nome</TableHead>
                    <TableHead className="text-xs h-9">Tanque (Tag)</TableHead>
                    <TableHead className="text-xs h-9">
                      Campo de Produção
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectWells.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-xs text-muted-foreground"
                      >
                        Nenhum poço cadastrado no sistema para os campos deste
                        projeto.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectWells.map((well) => {
                      const tanks = wellTanksMap[well.id] || []
                      return (
                        <TableRow key={well.id}>
                          <TableCell className="font-medium text-xs py-2">
                            {well.name}
                          </TableCell>
                          <TableCell className="text-xs py-2">
                            {well.shortName || '-'}
                          </TableCell>
                          <TableCell className="text-xs py-2">
                            {tanks.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {tanks.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 h-5"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2">
                            {getProductionFieldName(well.productionFieldId)}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary/40 bg-muted/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold">
                Padrão de Codificação e Identificação de Tanques
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">
                Estrutura de Codificação
              </h4>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-3 bg-background border rounded-md">
                <div className="flex items-center gap-1 font-mono text-lg font-bold bg-muted px-2 py-1 rounded">
                  <span>TQ</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-primary">XX</span>
                  <span className="text-muted-foreground">-</span>
                  <span>YYY</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <span className="font-bold text-foreground">TQ:</span>{' '}
                    Prefixo fixo.
                  </p>
                  <p>
                    <span className="font-bold text-foreground">XX:</span>{' '}
                    Código da área.
                  </p>
                  <p>
                    <span className="font-bold text-foreground">YYY:</span>{' '}
                    Número sequencial.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Códigos de Área</h4>
              <ul className="grid gap-2 sm:grid-cols-3">
                <li className="p-2 border rounded-md bg-background flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Campo de Mosquito
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-bold font-mono text-primary">
                      01
                    </code>
                    <span className="text-xs text-muted-foreground">
                      (Ex: TQ-01-001)
                    </span>
                  </div>
                </li>
                <li className="p-2 border rounded-md bg-background flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Campo de Saíra
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-bold font-mono text-primary">
                      02
                    </code>
                    <span className="text-xs text-muted-foreground">
                      (Ex: TQ-02-001)
                    </span>
                  </div>
                </li>
                <li className="p-2 border rounded-md bg-background flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Estação de Tratamento
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-bold font-mono text-primary">
                      03
                    </code>
                    <span className="text-xs text-muted-foreground">
                      (Ex: TQ-03-001)
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="pt-2 border-t mt-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">
                  Nota Obrigatória:
                </span>{' '}
                A adoção deste padrão é obrigatória para todos os sistemas,
                relatórios e documentos técnicos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!tankToDelete}
        onOpenChange={(open) => !open && setTankToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tanque?</AlertDialogTitle>
            <AlertDialogDescription>
              O tanque {tankToDelete?.tag} e seus dados dependentes serão
              removidos permanentemente. Esta ação ficará registrada na
              auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTank}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
