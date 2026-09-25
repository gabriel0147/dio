import { Outlet, Navigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { AppSidebar } from '@/components/AppSidebar'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { NotificationsPopover } from '@/components/notifications/NotificationsPopover'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { cn } from '@/lib/utils'

export default function Layout() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/') return 'Home'
    if (path === '/producao-nbs') return 'Hub de Produção'
    if (path === '/manutencao-nbs') return 'Hub de Manutenção'
    if (path === '/srp') return 'SRP - Projetos'
    if (path === '/sgp') return 'SGP - Projetos'
    if (path === '/smt') return 'SMT - Projetos'
    if (path === '/sbp') return 'SBP - Projetos'
    if (path.includes('/hub')) return 'Project Hub'
    if (path.includes('/maintenance')) return 'Manutenção & Ativos'
    if (path.includes('/dashboard')) return 'Dashboard de Produção'
    if (path.includes('/transfer-history')) return 'Histórico de Transferência'
    if (path.includes('/test-history'))
      return 'Histórico de Lançamento de Teste'
    if (path.includes('/operations-history')) return 'Histórico de Operações'
    if (path.includes('/fcv-calculation')) return 'Cálculo do FCV'
    if (path.includes('/alerts')) return 'Alertas'
    if (path.endsWith('/seals')) return 'Controle de Lacres'
    if (path.includes('/operational-management')) return 'Gestão Operacional'
    if (path.includes('/user-management')) return 'Gestão de Usuários'
    if (path.includes('/audit-logs')) return 'Logs de Auditoria'
    if (path.includes('/settings')) return 'Configurações'
    if (path.includes('/teams')) return 'Times'
    if (path.includes('/management')) return 'Gestão de Cadastro'
    if (path.includes('/registrations')) return 'Cadastros do Projeto'
    if (path.includes('/organogram')) return 'Organograma'
    // SRT
    if (path.includes('/srt/sessions')) return 'Planejamento de Testes'
    if (path.includes('/srt/tanks')) return 'Tanques Móveis'
    if (path.includes('/srt/tests')) return 'Lançamento de Teste'
    if (path === '/srt') return 'Dashboard SRT'
    // SGPA
    if (path === '/sgpa') return 'Dashboard SGPA'
    if (path.includes('/sgpa/analysis')) return 'Análise SGPA'
    if (path.includes('/sgpa/settings')) return 'Configurações SGPA'

    return 'Plataforma'
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 overflow-hidden border-b bg-background transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex min-w-0 items-center gap-2 px-4 w-full overflow-hidden">
            <SidebarTrigger className="-ml-1 shrink-0" />
            <Separator orientation="vertical" className="mr-2 h-4 shrink-0" />
            <Breadcrumb className="min-w-0 flex-1 overflow-hidden">
              <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden whitespace-nowrap">
                {location.pathname !== '/' && (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to="/">Home</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
                )}
                {/* Add intermediate hubs to breadcrumb if applicable */}
                {location.pathname.startsWith('/srt') ||
                location.pathname.startsWith('/sgpa') ||
                location.pathname.startsWith('/srp') ||
                location.pathname.startsWith('/sgp') ? (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to="/producao-nbs">Produção</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
                ) : null}
                {location.pathname.startsWith('/smt') ||
                location.pathname.startsWith('/sbp') ? (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to="/manutencao-nbs">Manutenção</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
                ) : null}
                <BreadcrumbItem>
                  <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* Unified Module Navigation */}
            <nav className="hidden shrink-0 items-center gap-6 mx-6 text-sm font-medium border-l pl-6 h-8 xl:flex">
              <Link
                to="/producao-nbs"
                className={cn(
                  'transition-colors hover:text-primary',
                  location.pathname.startsWith('/producao-nbs') ||
                    location.pathname.startsWith('/srt') ||
                    location.pathname.startsWith('/sgpa') ||
                    location.pathname.startsWith('/project')
                    ? 'text-foreground font-semibold'
                    : 'text-muted-foreground',
                )}
              >
                Produção
              </Link>
              <Link
                to="/manutencao-nbs"
                className={cn(
                  'transition-colors hover:text-primary',
                  location.pathname.startsWith('/manutencao-nbs') ||
                    location.pathname.startsWith('/smt') ||
                    location.pathname.startsWith('/sbp')
                    ? 'text-foreground font-semibold'
                    : 'text-muted-foreground',
                )}
              >
                Manutenção
              </Link>
            </nav>

            <div className="ml-auto shrink-0">
              <NotificationsPopover />
            </div>
          </div>
        </header>
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-hidden p-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
