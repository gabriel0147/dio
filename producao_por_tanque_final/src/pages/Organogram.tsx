import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Loader2,
  ShieldAlert,
  User,
  UserPlus,
  Info,
  CheckCircle2,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AccessLevelsSummary } from '@/components/users/AccessLevelsSummary'

// Types for the Org Chart Nodes
interface OrgNodeData {
  role: string
  name?: string
  isVacant?: boolean
  isContracted?: boolean
  type?: 'executive' | 'management' | 'technical' | 'operational'
  children?: OrgNodeData[]
  isApprover?: boolean
}

// Hardcoded Organization Structure based on User Story
const ORG_DATA: OrgNodeData = {
  role: 'CEO',
  name: 'Gelsom',
  type: 'executive',
  isApprover: true,
  children: [
    {
      role: 'CFO',
      name: 'Madson',
      type: 'executive',
      isApprover: true,
      children: [
        {
          role: 'VIX',
          isContracted: true,
          type: 'management',
        },
        {
          role: 'Jurídico',
          isContracted: true,
          type: 'management',
        },
        {
          role: 'Contábil',
          isContracted: true,
          type: 'management',
        },
      ],
    },
    {
      role: 'COO',
      name: 'Leonardo',
      type: 'executive',
      isApprover: true,
      children: [
        {
          role: 'Gerente de Operações',
          isVacant: true,
          type: 'management',
          // Ops Manager is NOT an approver based on story
          children: [
            {
              role: 'Engenheiro de Petróleo',
              isVacant: true,
              type: 'technical',
              isApprover: true,
            },
            {
              role: 'Supervisor',
              isVacant: true,
              type: 'management',
              isApprover: true,
              children: [
                {
                  role: 'Operador',
                  name: 'Eduardo',
                  type: 'operational',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      role: 'Regulação',
      isVacant: true,
      type: 'management',
      isApprover: true,
    },
  ],
}

// Component to render a single node card
const OrgCard = ({ data }: { data: OrgNodeData }) => {
  const isVacant = !!data.isVacant
  const isContracted = !!data.isContracted

  // Color schemes based on type
  const getTypeStyles = (type?: string) => {
    switch (type) {
      case 'executive':
        return 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20'
      case 'management':
        return 'border-purple-200 bg-purple-50/50 dark:bg-purple-950/20'
      case 'technical':
        return 'border-cyan-200 bg-cyan-50/50 dark:bg-cyan-950/20'
      case 'operational':
        return 'border-green-200 bg-green-50/50 dark:bg-green-950/20'
      default:
        return 'border-border bg-card'
    }
  }

  return (
    <Card
      className={cn(
        'w-36 sm:w-40 relative transition-all hover:shadow-md z-10', // Compact width
        getTypeStyles(data.type),
        isVacant && 'border-dashed opacity-90',
      )}
    >
      <CardContent className="p-2 flex flex-col items-center text-center gap-1.5">
        {' '}
        {/* Minimized padding and gap */}
        <div className="relative">
          <Avatar
            className={cn(
              'h-8 w-8 border-2', // Miniature avatar
              isVacant
                ? 'border-dashed border-muted-foreground'
                : 'border-background shadow-sm',
              isContracted && 'bg-white border-blue-100',
            )}
          >
            {!isVacant && !isContracted && <AvatarImage src="" />}
            <AvatarFallback
              className={cn(
                isVacant && 'bg-muted text-muted-foreground',
                isContracted && 'bg-blue-50 text-blue-600',
              )}
            >
              {isVacant ? (
                <UserPlus className="h-3 w-3" />
              ) : isContracted ? (
                <Building2 className="h-3.5 w-3.5" />
              ) : (
                <span className="text-[10px] font-bold">
                  {data.name?.charAt(0).toUpperCase() || (
                    <User className="h-3 w-3" />
                  )}
                </span>
              )}
            </AvatarFallback>
          </Avatar>
          {data.type === 'executive' && !isVacant && !isContracted && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
          {data.isApprover && (
            <div
              className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm border"
              title="Aprovador"
            >
              <CheckCircle2 className="h-3 w-3 text-green-600 fill-green-100" />
            </div>
          )}
        </div>
        <div className="space-y-0.5 w-full flex flex-col items-center justify-center min-h-[2.5rem]">
          <h4 className="font-bold text-[10px] sm:text-[11px] leading-tight flex items-center justify-center gap-1 break-words line-clamp-2 text-center w-full px-1">
            {data.role}
          </h4>
          {isVacant ? (
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1.5 border-dashed text-muted-foreground whitespace-nowrap"
            >
              Vago
            </Badge>
          ) : isContracted ? (
            <Badge
              variant="secondary"
              className="text-[8px] h-4 px-1 leading-none whitespace-nowrap bg-blue-100/50 text-blue-700 border-blue-200 hover:bg-blue-100 border"
            >
              Empresa contratada
            </Badge>
          ) : (
            <p className="text-[10px] sm:text-xs font-medium text-foreground truncate w-full px-1">
              {data.name}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Recursive Tree Component
const TreeNode = ({
  node,
  isRoot: _isRoot = false,
}: {
  node: OrgNodeData
  isRoot?: boolean
}) => {
  const hasChildren = node.children && node.children.length > 0

  return (
    <div className="flex flex-col items-center">
      <OrgCard data={node} />

      {hasChildren && (
        <>
          {/* Vertical line from parent down */}
          <div className="w-px h-4 bg-border"></div>{' '}
          {/* Reduced vertical height */}
          <div className="flex items-start justify-center relative">
            {/* Horizontal connecting line logic */}

            <div className="flex gap-4">
              {' '}
              {/* Reduced horizontal gap */}
              {node.children!.map((child, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center relative"
                >
                  {node.children!.length > 1 && (
                    <>
                      {/* Left Line */}
                      <div
                        className={cn(
                          'absolute top-0 right-[50%] h-px bg-border',
                          index === 0 ? 'w-0' : 'w-[calc(50%+0.5rem)]', // Adjusted for gap-4 (1rem gap -> 0.5rem half-gap)
                        )}
                      ></div>
                      {/* Right Line */}
                      <div
                        className={cn(
                          'absolute top-0 left-[50%] h-px bg-border',
                          index === node.children!.length - 1
                            ? 'w-0'
                            : 'w-[calc(50%+0.5rem)]',
                        )}
                      ></div>
                    </>
                  )}
                  {/* Vertical line to child */}
                  <div className="w-px h-4 bg-border"></div>{' '}
                  {/* Reduced vertical height */}
                  <TreeNode node={child} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function Organogram() {
  const { role, loading } = useAuth()
  const navigate = useNavigate()

  // Access control: Admin or Director only
  const canAccess = role === 'admin' || role === 'director'

  useEffect(() => {
    if (!loading && !canAccess) {
      navigate('/')
    }
  }, [loading, canAccess, navigate])

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground animate-fade-in">
        <ShieldAlert className="h-16 w-16 mb-4 text-destructive/50" />
        <h2 className="text-2xl font-bold text-foreground">Acesso Negado</h2>
        <p className="mt-2 text-center max-w-md">
          Você não tem permissão para visualizar o organograma.
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organograma</h1>
          <p className="text-muted-foreground mt-1">
            Estrutura organizacional e níveis de autoridade.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Info className="mr-2 h-4 w-4" /> Níveis de Acesso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Estrutura de Níveis de Acesso</DialogTitle>
            </DialogHeader>
            <AccessLevelsSummary />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto pb-12 pt-4">
        <div className="min-w-max flex justify-center p-4">
          <TreeNode node={ORG_DATA} isRoot />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 sm:gap-6 pt-8 border-t">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div>
          <span className="text-xs sm:text-sm text-muted-foreground">
            Executivo
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-50 border border-purple-200 rounded"></div>
          <span className="text-xs sm:text-sm text-muted-foreground">
            Gestão
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-cyan-50 border border-cyan-200 rounded"></div>
          <span className="text-xs sm:text-sm text-muted-foreground">
            Técnico
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
          <span className="text-xs sm:text-sm text-muted-foreground">
            Operacional
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border border-dashed border-muted-foreground/50 bg-card rounded"></div>
          <span className="text-xs sm:text-sm text-muted-foreground">
            Posição Vaga
          </span>
        </div>
        <div className="flex items-center gap-2 ml-2 sm:ml-4 border-l pl-4">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          <span className="text-xs sm:text-sm text-muted-foreground">
            Autoridade de Aprovação
          </span>
        </div>
      </div>
    </div>
  )
}
