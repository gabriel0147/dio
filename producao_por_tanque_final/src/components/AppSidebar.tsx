import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronsUpDown,
  ChevronRight,
  GalleryVerticalEnd,
  LayoutDashboard,
  Settings2,
  History,
  FileSpreadsheet,
  LogOut,
  ShieldCheck,
  Database,
  Calculator,
  Bell,
  Users,
  Notebook,
  Group,
  ClipboardList,
  Map as MapIcon,
  Ruler,
  Lock,
  FileText,
  ListPlus,
  Briefcase,
  Network,
  TestTube,
  Truck,
  Timer,
  FlaskConical,
  Droplets,
  StopCircle,
  BarChart2,
  Home,
  Factory,
  Wrench,
  Grid,
  Box,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useProject } from '@/context/ProjectContext'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function AppSidebar() {
  const { user, role, avatarUrl, signOut } = useAuth()
  const { currentProject, logoUrl, productionFields } = useProject()
  const location = useLocation()
  const navigate = useNavigate()
  const [activeProject, setActiveProject] = useState(currentProject)
  const { state } = useSidebar()

  useEffect(() => {
    setActiveProject(currentProject)
  }, [currentProject])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const projectLogo = activeProject?.logoUrl
  const displayLogo = projectLogo || logoUrl

  // Role Checks
  const canViewAdmin = role === 'admin' || role === 'director'
  const canViewSupervision =
    role === 'admin' ||
    role === 'director' ||
    role === 'approver' ||
    role === 'supervisor' ||
    role === 'operations_manager'
  const canViewAudit =
    role === 'admin' || role === 'director' || role === 'operations_manager'
  const canViewDirector = role === 'admin' || role === 'director'

  // Context Detection
  const isSrtFcvRoute = location.pathname.includes('/fcv-calculation')
  const isSrtContext = location.pathname.startsWith('/srt') || isSrtFcvRoute
  const isSgpaContext = location.pathname.startsWith('/sgpa')
  const isSmtContext = location.pathname.includes('/smt')
  const isSbpContext = location.pathname.includes('/sbp')
  const isHomeRoute = location.pathname === '/'
  const isProductionHubRoute = location.pathname.startsWith('/producao-nbs')
  const isProjectProductionRoute =
    location.pathname.includes('/hub') ||
    location.pathname.includes('/dashboard') ||
    location.pathname.includes('/maintenance') ||
    location.pathname.includes('/operations-history') ||
    location.pathname.includes('/transfer-history') ||
    location.pathname.includes('/test-history') ||
    location.pathname.includes('/alerts') ||
    location.pathname.includes('/registrations') ||
    location.pathname.includes('/seals') ||
    location.pathname.includes('/sheet/')

  // Production should only be active on production-specific routes.
  const isProductionContext =
    !isHomeRoute &&
    !location.pathname.startsWith('/manutencao-nbs') &&
    !isSmtContext &&
    !isSbpContext &&
    (isProductionHubRoute ||
      isProjectProductionRoute ||
      isSrtContext ||
      isSgpaContext)

  // Group tanks by Production Field
  const tankGroups = useMemo(() => {
    if (!activeProject) return []

    // Sort tanks by tag
    const sortedTanks = [...activeProject.tanks].sort((a, b) =>
      a.tag.localeCompare(b.tag, undefined, { numeric: true }),
    )

    const groups: {
      id: string
      name: string
      tanks: typeof sortedTanks
    }[] = []
    const processedIds = new Set<string>()

    // 1. Group by defined Production Fields
    productionFields.forEach((pf) => {
      const tanksInField = sortedTanks.filter(
        (t) => t.productionFieldId === pf.id,
      )

      if (tanksInField.length > 0) {
        tanksInField.forEach((t) => processedIds.add(t.id))
      }

      groups.push({
        id: pf.id,
        name: pf.name,
        tanks: tanksInField,
      })
    })

    // 2. Unassigned / Others
    const otherTanks = sortedTanks.filter((t) => !processedIds.has(t.id))
    if (otherTanks.length > 0) {
      groups.push({
        id: 'other',
        name: 'Outros',
        tanks: otherTanks,
      })
    }

    return groups
  }, [activeProject, productionFields])

  const getSheetIcon = (type: string) => {
    switch (type) {
      case 'production':
        return ListPlus
      case 'checklist':
        return ClipboardList
      case 'calibration':
        return Ruler
      case 'seal':
        return Lock
      case 'reports':
        return FileText
      default:
        return FileSpreadsheet
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-all duration-200"
              onClick={() => navigate('/')}
            >
              {displayLogo ? (
                <div
                  className={cn(
                    'flex items-center justify-center rounded-lg overflow-hidden bg-white/95 shadow-sm transition-all duration-300',
                    state === 'collapsed'
                      ? 'size-8 aspect-square p-0.5'
                      : projectLogo
                        ? 'h-10 w-full max-w-full p-1 object-contain'
                        : 'h-10 w-full max-w-[180px] p-1',
                  )}
                >
                  <img
                    src={displayLogo}
                    alt="Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
              )}

              {(!projectLogo || state === 'collapsed') && (
                <div className="grid flex-1 text-left text-sm leading-tight ml-1">
                  <span className="truncate font-semibold">
                    {activeProject ? activeProject.name : 'NBS System'}
                  </span>
                  {!displayLogo && (
                    <span className="truncate text-xs">Gestão Integrada</span>
                  )}
                </div>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Top Level Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="sm"
                isActive={location.pathname === '/'}
                tooltip="Home"
              >
                <Link to="/">
                  <Home />
                  <span>Home</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="sm"
                isActive={isProductionContext}
                tooltip="Hub de Produção"
              >
                <Link to="/producao-nbs">
                  <Factory />
                  <span>Produção</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="sm"
                isActive={
                  location.pathname.startsWith('/manutencao-nbs') ||
                  isSmtContext ||
                  isSbpContext
                }
                tooltip="Hub de Manutenção"
              >
                <Link to="/manutencao-nbs">
                  <Wrench />
                  <span>Manutenção</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {isSrtContext ? (
          /* SRT SIDEBAR CONTENT */
          <SidebarGroup>
            <SidebarGroupLabel>Módulo SRT</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  isActive={location.pathname === '/srt'}
                  tooltip="Dashboard SRT"
                >
                  <Link to="/srt">
                    <LayoutDashboard />
                    <span>Visão Geral</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  isActive={location.pathname.includes('/srt/sessions')}
                  tooltip="Planejamento de Testes"
                >
                  <Link to="/srt/sessions">
                    <Timer />
                    <span>Planejamento de Testes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  isActive={
                    location.pathname === '/srt/tests/new' ||
                    /^\/srt\/tests\/[^/]+$/.test(location.pathname)
                  }
                  tooltip="Lançamento de Teste"
                >
                  <Link to="/srt/tests/new">
                    <TestTube />
                    <span>Lançamento de Teste</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  isActive={location.pathname.includes('/srt/bsw-management')}
                  tooltip="BSW Total — Medição"
                >
                  <Link to="/srt/bsw-management">
                    <Droplets className="mr-2" />
                    <span>BSW Total — Medição</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  isActive={
                    location.pathname.includes('/srt/bsw') &&
                    !location.pathname.includes('/srt/bsw-management')
                  }
                  tooltip="BSW da Emulsão — Laboratório"
                >
                  <Link to="/srt/bsw">
                    <FlaskConical />
                    <span>BSW da Emulsão — Laboratório</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {activeProject && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    size="sm"
                    isActive={location.pathname.includes('/fcv-calculation')}
                    tooltip="Cálculo do FCV"
                  >
                    <Link to={`/project/${activeProject.id}/fcv-calculation`}>
                      <Calculator />
                      <span>Cálculo do FCV</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  isActive={location.pathname.includes('/srt/tanks')}
                  tooltip="Cadastro de Tanques"
                >
                  <Link to="/srt/tanks">
                    <Truck />
                    <span>Cadastro de Tanques</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        ) : isSgpaContext ? (
          /* SGPA SIDEBAR CONTENT */
          <SidebarGroup>
            <SidebarGroupLabel>Módulo SGPA</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  isActive={location.pathname === '/sgpa'}
                  tooltip="Diário de Paradas"
                >
                  <Link to="/sgpa">
                    <StopCircle />
                    <span>Diário de Paradas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  isActive={location.pathname.includes('/sgpa/analysis')}
                  tooltip="Análise Operacional"
                >
                  <Link to="/sgpa/analysis">
                    <BarChart2 />
                    <span>Análise Operacional</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  isActive={location.pathname.includes('/sgpa/settings')}
                  tooltip="Configurações"
                >
                  <Link to="/sgpa/settings">
                    <Settings2 />
                    <span>Catálogos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        ) : isSmtContext ? (
          /* SMT SIDEBAR CONTENT */
          <SidebarGroup>
            <SidebarGroupLabel>Módulo SMT</SidebarGroupLabel>
            <SidebarMenu>
              {activeProject ? (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      size="sm"
                      isActive={location.pathname.endsWith('/smt')}
                      tooltip="Dashboard SMT"
                    >
                      <Link to="/smt?view=dashboard">
                        <LayoutDashboard />
                        <span>Visão Geral</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* Additional SMT specific links if needed later */}
                </>
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled size="sm">
                    <span className="text-muted-foreground">
                      Selecione um projeto
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>
        ) : isSbpContext ? (
          /* SBP SIDEBAR CONTENT */
          <SidebarGroup>
            <SidebarGroupLabel>Módulo SBP</SidebarGroupLabel>
            <SidebarMenu>
              {activeProject ? (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      size="sm"
                      isActive={location.pathname.endsWith('/sbp')}
                      tooltip="Dashboard SBP"
                    >
                      <Link to="/sbp">
                        <Box />
                        <span>Controle de Ativos</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled size="sm">
                    <span className="text-muted-foreground">
                      Selecione um projeto
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>
        ) : isProductionContext ? (
          /* STANDARD SRP / PROJECT CONTEXT CONTENT */
          <>
            {activeProject && (
              <SidebarGroup>
                <SidebarGroupLabel>
                  Projeto: {activeProject.name}
                </SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      size="sm"
                      isActive={location.pathname.includes('/hub')}
                      tooltip="Hub do Projeto"
                    >
                      <Link to={`/project/${activeProject.id}/hub`}>
                        <Grid />
                        <span>Visão Geral</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      size="sm"
                      isActive={location.pathname.endsWith('/seals')}
                      tooltip="Controle de Lacres"
                    >
                      <Link to={`/project/${activeProject.id}/seals`}>
                        <Lock />
                        <span>Controle de Lacres</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      size="sm"
                      isActive={location.pathname.includes('/dashboard')}
                      tooltip="Produção (Dashboard)"
                    >
                      <Link to={`/project/${activeProject.id}/dashboard`}>
                        <LayoutDashboard />
                        <span>Produção</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      size="sm"
                      isActive={location.pathname.startsWith('/sgpa')}
                      tooltip="SGPA - Paradas"
                    >
                      <Link to="/sgpa">
                        <StopCircle />
                        <span>Paradas (SGPA)</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      size="sm"
                      isActive={location.pathname.includes(
                        '/operations-history',
                      )}
                      tooltip="Histórico das Operações"
                    >
                      <Link
                        to={`/project/${activeProject.id}/operations-history`}
                      >
                        <History />
                        <span>Histórico das Operações</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      size="sm"
                      isActive={location.pathname.includes(
                        '/transfer-history',
                      )}
                      tooltip="Histórico de Transferência"
                    >
                      <Link
                        to={`/project/${activeProject.id}/transfer-history`}
                      >
                        <FileSpreadsheet />
                        <span>Histórico de Transferência</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      size="sm"
                      isActive={location.pathname.includes('/test-history')}
                      tooltip="Histórico de Lançamento de Teste"
                    >
                      <Link to={`/project/${activeProject.id}/test-history`}>
                        <ClipboardList />
                        <span>Histórico de Lançamento de Teste</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      size="sm"
                      isActive={location.pathname.includes('/alerts')}
                      tooltip="Alertas"
                    >
                      <Link to={`/project/${activeProject.id}/alerts`}>
                        <Bell />
                        <span>Alertas</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            )}

            {activeProject ? (
              <SidebarGroup>
                <SidebarGroupLabel>Ativos (Por Campo)</SidebarGroupLabel>
                <SidebarMenu>
                  {tankGroups.map((group) => (
                    <Collapsible
                      key={group.id}
                      asChild
                      defaultOpen={false}
                      className="group/field"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={group.name}
                            size="sm"
                            className="font-semibold"
                          >
                            <MapIcon />
                            <span className="truncate">{group.name}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/field:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {group.tanks.length === 0 ? (
                              <SidebarMenuSubItem>
                                <span className="text-xs text-muted-foreground px-2 py-1 block">
                                  Nenhum tanque
                                </span>
                              </SidebarMenuSubItem>
                            ) : (
                              group.tanks.map((tank) => (
                                <Collapsible
                                  key={tank.id}
                                  asChild
                                  defaultOpen={false}
                                  className="group/tank"
                                >
                                  <SidebarMenuSubItem>
                                    <CollapsibleTrigger asChild>
                                      <SidebarMenuSubButton
                                        title={tank.tag}
                                        size="sm"
                                        className="text-[11px]"
                                      >
                                        <Database className="h-3.5 w-3.5" />
                                        <span className="truncate">
                                          {tank.tag}
                                          {tank.wellName &&
                                            ` (${tank.wellName})`}
                                        </span>
                                        <ChevronRight className="ml-auto h-3 w-3 transition-transform duration-200 group-data-[state=open]/tank:rotate-90" />
                                      </SidebarMenuSubButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <SidebarMenuSub>
                                        {tank.sheets.map((sheet) => {
                                          const Icon = getSheetIcon(sheet.type)
                                          return (
                                            <SidebarMenuSubItem key={sheet.id}>
                                              <SidebarMenuSubButton
                                                asChild
                                                size="sm"
                                                className="text-[11px]"
                                                isActive={location.pathname.includes(
                                                  sheet.id,
                                                )}
                                              >
                                                <Link
                                                  to={`/project/${activeProject.id}/sheet/${sheet.id}`}
                                                >
                                                  <Icon className="h-3 w-3 mr-2" />
                                                  <span className="truncate">
                                                    {sheet.name}
                                                  </span>
                                                </Link>
                                              </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                          )
                                        })}
                                      </SidebarMenuSub>
                                    </CollapsibleContent>
                                  </SidebarMenuSubItem>
                                </Collapsible>
                              ))
                            )}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            ) : null}
          </>
        ) : null}

        <SidebarGroup>
          <SidebarGroupLabel>Colaboração</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="sm"
                isActive={location.pathname.includes('/teams')}
                tooltip="Times"
              >
                <Link to="/teams">
                  <Group />
                  <span>Times</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {canViewSupervision && (
          <SidebarGroup>
            <SidebarGroupLabel>Supervisão</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  isActive={location.pathname.includes(
                    '/operational-management',
                  )}
                  tooltip="Gestão Operacional"
                >
                  <Link to="/operational-management">
                    <ClipboardList />
                    <span>Gestão Operacional</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible
                asChild
                defaultOpen={
                  location.pathname.includes('/management') ||
                  location.pathname.includes('/registrations')
                }
                className="group/cadastro"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Gestão de Cadastro" size="sm">
                      <Notebook />
                      <span>Gestão de Cadastro</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/cadastro:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          size="sm"
                          isActive={location.pathname.includes('/management')}
                        >
                          <Link to="/management">
                            <span>Estrutura</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      {activeProject && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            size="sm"
                            isActive={location.pathname.includes(
                              '/registrations',
                            )}
                          >
                            <Link
                              to={`/project/${activeProject.id}/registrations`}
                            >
                              <span>Tanques</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {canViewAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  isActive={location.pathname.includes('/user-management')}
                  tooltip="Gestão de Usuários"
                >
                  <Link to="/user-management">
                    <Users />
                    <span>Gestão de Usuários</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {canViewDirector && (
          <SidebarGroup>
            <SidebarGroupLabel>Corporativo</SidebarGroupLabel>
            <SidebarMenu>
              <Collapsible
                asChild
                defaultOpen={location.pathname.includes('/organogram')}
                className="group/diretoria"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Diretoria" size="sm">
                      <Briefcase />
                      <span>Diretoria</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/diretoria:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          size="sm"
                          isActive={location.pathname.includes('/organogram')}
                        >
                          <Link to="/organogram">
                            <Network className="h-4 w-4 mr-2" />
                            <span>Organograma</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg border border-sidebar-border">
                    <AvatarImage
                      src={avatarUrl || ''}
                      alt={user?.email || 'User'}
                    />
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      {user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.email?.split('@')[0]}
                    </span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg border">
                      <AvatarImage
                        src={avatarUrl || ''}
                        alt={user?.email || 'User'}
                      />
                      <AvatarFallback className="rounded-lg">
                        {user?.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user?.email?.split('@')[0]}
                      </span>
                      <span className="truncate text-xs">{user?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings2 className="mr-2 size-4" />
                  Configurações
                </DropdownMenuItem>
                {canViewAudit && (
                  <DropdownMenuItem onClick={() => navigate('/audit-logs')}>
                    <ShieldCheck className="mr-2 size-4" />
                    Auditoria
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
