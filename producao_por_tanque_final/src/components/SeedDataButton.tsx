import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Database } from 'lucide-react'
import { seedDatabase } from '@/lib/seed'
import { useAuth } from '@/hooks/use-auth'
import { useProject } from '@/context/ProjectContext'

export function SeedDataButton() {
  const { user } = useAuth()
  const { projects } = useProject()
  const [loading, setLoading] = useState(false)

  // Only show if no projects exist
  if (projects.length > 0) return null

  const handleSeed = async () => {
    if (!user) return
    setLoading(true)
    try {
      await seedDatabase(user.id)
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/10">
      <Database className="h-10 w-10 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">Banco de Dados Vazio</h3>
      <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
        Parece que você ainda não tem projetos. Deseja carregar os dados de
        exemplo para começar?
      </p>
      <Button onClick={handleSeed} disabled={loading}>
        {loading ? 'Migrando Dados...' : 'Carregar Dados de Exemplo'}
      </Button>
    </div>
  )
}
