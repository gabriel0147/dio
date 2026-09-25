import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'
import { useProject } from '@/context/ProjectContext'
import { LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { UserPreferencesDialog } from '@/components/users/UserPreferencesDialog'

export default function Header() {
  const { user, avatarUrl, signOut } = useAuth()
  const { currentProject } = useProject()
  const navigate = useNavigate()
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-primary px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 sticky top-0 z-10 text-primary-foreground shadow-md">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1 hover:bg-primary-foreground/10 hover:text-primary-foreground" />
      </div>

      <div className="flex flex-col justify-center">
        <span className="font-bold text-lg tracking-tight leading-none">
          Gestão da Produção NBS
        </span>
        <span className="text-[10px] font-normal leading-none text-primary-foreground/80 mt-1">
          Lançamento e Gestão da Produção
        </span>
      </div>

      <div className="ml-auto flex items-center gap-4">
        {currentProject && (
          <div className="hidden md:flex items-center text-sm text-primary-foreground/90">
            <span className="font-medium mr-1">Projeto:</span>
            {currentProject.name}
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-8 w-8 rounded-full hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Avatar className="h-8 w-8 border-2 border-primary-foreground/20">
                <AvatarImage
                  src={avatarUrl || ''}
                  alt={user?.email || 'User'}
                />
                <AvatarFallback className="text-primary bg-primary-foreground">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Minha Conta</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPreferencesOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <UserPreferencesDialog
          open={preferencesOpen}
          onOpenChange={setPreferencesOpen}
        />
      </div>
    </header>
  )
}
