import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ShieldAlert,
  Briefcase,
  Wrench,
  Users,
  Activity,
  FileBarChart,
  Eye,
  Scale,
} from 'lucide-react'

export function AccessLevelsSummary() {
  const approvalText =
    '• Aprovação, conferência e fechamento de boletins diários de produção.'

  return (
    <div className="space-y-6">
      {/* Strategic Level */}
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-700">
          <ShieldAlert className="h-5 w-5" />
          Nível Estratégico
        </h3>
        <Card className="border-l-4 border-l-blue-500 shadow-sm bg-blue-50/20">
          <CardHeader className="py-3 px-4 pb-2">
            <CardTitle className="text-base font-medium flex items-center justify-between">
              <span>Administrador & Diretor</span>
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700 border-blue-200"
              >
                Acesso Total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4 text-sm text-muted-foreground space-y-1">
            <p>
              • Controle total do sistema, configurações e gestão de usuários.
            </p>
            <p>
              • Acesso irrestrito a todos os projetos, tanques e relatórios.
            </p>
            <p>• Visibilidade total dos logs de auditoria e segurança.</p>
            <p className="font-medium text-blue-800">{approvalText}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tactical Level */}
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-purple-700">
          <Briefcase className="h-5 w-5" />
          Nível Tático
        </h3>
        <div className="grid gap-3 sm:grid-cols-1">
          <Card className="border-l-4 border-l-purple-500 shadow-sm bg-purple-50/20">
            <CardHeader className="py-3 px-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Scale className="h-4 w-4 text-purple-600" />
                Regulação
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3 px-4 text-sm text-muted-foreground">
              <p>• Conformidade regulatória e auditoria interna.</p>
              <p className="font-medium text-purple-800">{approvalText}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-sm bg-purple-50/20">
            <CardHeader className="py-3 px-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-600" />
                Gerente de Operações
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3 px-4 text-sm text-muted-foreground">
              <p>• Acesso aos logs de auditoria e supervisão operacional.</p>
              <p>• Acompanhamento de métricas e desempenho.</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-sm bg-purple-50/20">
            <CardHeader className="py-3 px-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileBarChart className="h-4 w-4 text-purple-600" />
                Engenheiro de Petróleo
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3 px-4 text-sm text-muted-foreground">
              <p>• Gestão e edição de tabelas de calibração de tanques.</p>
              <p>• Análise técnica e validação de dados de produção.</p>
              <p className="font-medium text-purple-800">{approvalText}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-sm bg-purple-50/20">
            <CardHeader className="py-3 px-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-purple-600" />
                Supervisor
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3 px-4 text-sm text-muted-foreground">
              <p>• Leitura global de checklists de poços para conformidade.</p>
              <p>• Monitoramento de segurança e anomalias em campo.</p>
              <p className="font-medium text-purple-800">{approvalText}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Operational Level */}
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-green-700">
          <Users className="h-5 w-5" />
          Nível Operacional
        </h3>
        <p className="text-xs text-muted-foreground mb-2 px-1 italic">
          * Acesso restrito aos projetos atribuídos.
        </p>
        <div className="grid gap-3 sm:grid-cols-1">
          <Card className="border-l-4 border-l-green-500 shadow-sm bg-green-50/20">
            <CardHeader className="py-3 px-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wrench className="h-4 w-4 text-green-600" />
                Operador
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3 px-4 text-sm text-muted-foreground">
              <p>
                • Entrada de dados: Medições de Estoque, Drenagem e
                Transferência.
              </p>
              <p>• Realização e registro de checklists operacionais.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
