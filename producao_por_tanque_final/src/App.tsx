import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/hooks/use-auth'
import { ProjectProvider } from '@/context/ProjectContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { GlobalFormDraftGuard } from '@/components/GlobalFormDraftGuard'
import {
  ProjectAccessRoute,
  RoleRoute,
  ScopeProjectRoute,
} from '@/components/RouteGuards'
import Layout from '@/components/Layout'
import ScopeProjectRedirect from '@/components/ScopeProjectRedirect'

const Login = lazy(() => import('@/pages/Login'))
const Home = lazy(() => import('@/pages/Home'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const SheetPage = lazy(() => import('@/pages/SheetPage'))
const OperationsHistory = lazy(() => import('@/pages/OperationsHistory'))
const Alerts = lazy(() => import('@/pages/Alerts'))
const Management = lazy(() => import('@/pages/Management'))
const Registrations = lazy(() => import('@/pages/Registrations'))
const Teams = lazy(() => import('@/pages/Teams'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const Settings = lazy(() => import('@/pages/Settings'))
const ProductionHub = lazy(() => import('@/pages/ProductionHub'))
const MaintenanceHub = lazy(() => import('@/pages/MaintenanceHub'))
const FcvCalculation = lazy(() => import('@/pages/FcvCalculation'))
const OperationalManagement = lazy(
  () => import('@/pages/OperationalManagement'),
)
const UserManagement = lazy(() => import('@/pages/UserManagement'))
const AuditLogs = lazy(() => import('@/pages/AuditLogs'))
const Organogram = lazy(() => import('@/pages/Organogram'))
const ProjectHub = lazy(() => import('@/pages/ProjectHub'))
const MaintenanceDashboard = lazy(
  () => import('@/pages/project/MaintenanceDashboard'),
)
const SealReportPage = lazy(() => import('@/pages/SealReportPage'))
const SealControlPage = lazy(() => import('@/pages/SealControlPage'))
const SmtDashboard = lazy(() => import('@/pages/smt/SmtDashboard'))
const SbpDashboard = lazy(() => import('@/pages/sbp/SbpDashboard'))
const SrtDashboard = lazy(() => import('@/pages/srt/SrtDashboard'))
const MobileTanks = lazy(() => import('@/pages/srt/MobileTanks'))
const TankSessions = lazy(() => import('@/pages/srt/TankSessions'))
const TestEntry = lazy(() => import('@/pages/srt/TestEntry'))
const TestHistory = lazy(() => import('@/pages/srt/TestHistory'))
const MobileTankCalibration = lazy(
  () => import('@/pages/srt/MobileTankCalibration'),
)
const BSWEntry = lazy(() => import('@/pages/srt/BSWEntry'))
const BSWManagement = lazy(() => import('@/pages/srt/BSWManagement'))
const SgpaDashboard = lazy(() => import('@/pages/sgpa/SgpaDashboard'))
const SgpaAnalysis = lazy(() => import('@/pages/sgpa/SgpaAnalysis'))
const SgpaSettings = lazy(() => import('@/pages/sgpa/SgpaSettings'))

const AppLoading = () => (
  <div className="flex min-h-48 items-center justify-center" role="status">
    <div className="size-8 animate-spin rounded-full border-b-2 border-primary" />
    <span className="sr-only">Carregando página...</span>
  </div>
)

function App() {
  useEffect(() => {
    document.title = 'Gestão da Produção NBS Petróleo e Gás'
  }, [])

  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ErrorBoundary>
        <AuthProvider>
          <ProjectProvider>
            <GlobalFormDraftGuard />
            <Suspense fallback={<AppLoading />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />

                  <Route path="/producao-nbs" element={<ProductionHub />} />
                  <Route
                    path="/srp"
                    element={
                      <ScopeProjectRedirect
                        scope="production"
                        targetRouteResolver={(id) => `/project/${id}/dashboard`}
                      />
                    }
                  />
                  <Route
                    path="/sgp"
                    element={
                      <ScopeProjectRedirect
                        scope="production"
                        targetRouteResolver={(id) => `/project/${id}/hub`}
                      />
                    }
                  />

                  <Route path="/manutencao-nbs" element={<MaintenanceHub />} />
                  <Route path="/smt" element={<SmtDashboard />} />
                  <Route path="/sbp" element={<SbpDashboard />} />

                  <Route path="/teams" element={<Teams />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route
                    element={
                      <RoleRoute
                        allowed={[
                          'admin',
                          'director',
                          'approver',
                          'supervisor',
                          'operations_manager',
                        ]}
                      />
                    }
                  >
                    <Route path="/management" element={<Management />} />
                    <Route
                      path="/operational-management"
                      element={<OperationalManagement />}
                    />
                  </Route>
                  <Route
                    element={<RoleRoute allowed={['admin', 'director']} />}
                  >
                    <Route
                      path="/user-management"
                      element={<UserManagement />}
                    />
                    <Route path="/organogram" element={<Organogram />} />
                  </Route>
                  <Route
                    element={
                      <RoleRoute
                        allowed={['admin', 'director', 'operations_manager']}
                      />
                    }
                  >
                    <Route path="/audit-logs" element={<AuditLogs />} />
                  </Route>

                  <Route
                    path="/project/:projectId"
                    element={<ProjectAccessRoute />}
                  >
                    <Route path="hub" element={<ProjectHub />} />
                    <Route
                      path="maintenance"
                      element={<MaintenanceDashboard />}
                    />
                    <Route
                      path="smt"
                      element={<Navigate to="/smt?view=dashboard" replace />}
                    />
                    <Route
                      path="sbp"
                      element={<Navigate to="/sbp" replace />}
                    />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route
                      path="operations-history"
                      element={<OperationsHistory />}
                    />
                    <Route
                      path="transfer-history"
                      element={
                        <OperationsHistory
                          fixedType="transfer"
                          title="Histórico de Transferência"
                          description="Registro específico das operações de transferência."
                        />
                      }
                    />
                    <Route path="test-history" element={<TestHistory />} />
                    <Route
                      path="fcv-calculation"
                      element={<FcvCalculation />}
                    />
                    <Route path="alerts" element={<Alerts />} />
                    <Route path="registrations" element={<Registrations />} />
                    <Route path="reports/seals" element={<SealReportPage />} />
                    <Route path="seals" element={<SealControlPage />} />
                    <Route path="sheet/:sheetId" element={<SheetPage />} />
                  </Route>

                  <Route element={<ScopeProjectRoute scope="production" />}>
                    <Route
                      path="/srt/select"
                      element={<Navigate to="/producao-nbs" replace />}
                    />
                    <Route path="/srt" element={<SrtDashboard />} />
                    <Route path="/srt/tanks" element={<MobileTanks />} />
                    <Route
                      path="/srt/tanks/:tankId/calibration"
                      element={<MobileTankCalibration />}
                    />
                    <Route path="/srt/sessions" element={<TankSessions />} />
                    <Route path="/srt/tests/new" element={<TestEntry />} />
                    <Route path="/srt/tests/:testId" element={<TestEntry />} />
                    <Route
                      path="/srt/fcv-calculator"
                      element={<Navigate to="/producao-nbs" replace />}
                    />
                    <Route path="/srt/bsw" element={<BSWEntry />} />
                    <Route
                      path="/srt/bsw-management"
                      element={<BSWManagement />}
                    />

                    <Route
                      path="/sgpa/select"
                      element={<Navigate to="/producao-nbs" replace />}
                    />
                    <Route path="/sgpa" element={<SgpaDashboard />} />
                    <Route path="/sgpa/analysis" element={<SgpaAnalysis />} />
                    <Route path="/sgpa/settings" element={<SgpaSettings />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <Toaster />
          </ProjectProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
