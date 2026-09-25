import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'
import { Wrench, Factory } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="container mx-auto p-6 h-[calc(100vh-100px)] flex flex-col justify-center items-center animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Card
          className="group hover:border-primary/50 transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] border-2 h-80 flex flex-col justify-center items-center text-center"
          onClick={() => navigate('/producao-nbs')}
          role="button"
          tabIndex={0}
          aria-label="Abrir Sistema de Gestão Integrada da Produção"
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/producao-nbs')
            }
          }}
        >
          <CardHeader>
            <div className="mx-auto bg-primary/10 p-6 rounded-full mb-4 group-hover:bg-primary/20 transition-colors">
              <Factory className="h-16 w-16 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold text-primary">
              PRODUÇÃO NBS
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              Sistema de Gestão Integrada da Produção
            </CardDescription>
          </CardHeader>
        </Card>

        <Card
          className="group hover:border-orange-500/50 transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] border-2 h-80 flex flex-col justify-center items-center text-center"
          onClick={() => navigate('/manutencao-nbs')}
          role="button"
          tabIndex={0}
          aria-label="Abrir Sistema de Gestão Integrada da Manutenção"
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/manutencao-nbs')
            }
          }}
        >
          <CardHeader>
            <div className="mx-auto bg-orange-100 p-6 rounded-full mb-4 group-hover:bg-orange-200 transition-colors">
              <Wrench className="h-16 w-16 text-orange-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-orange-600">
              MANUTENÇÃO NBS
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              Sistema de Gestão Integrada da Manutenção
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
