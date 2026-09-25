import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'A senha e obrigatoria'),
})

const registerSchema = z.object({
  fullName: z.string().trim().min(3, 'Informe seu nome completo'),
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'A senha deve ter no minimo 6 caracteres'),
})

export default function Login() {
  const { signIn, signUp, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true })
    }
  }, [authLoading, navigate, user])

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  })

  const onLogin = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true)
    const { error } = await signIn(values.email, values.password)
    setIsLoading(false)

    if (error) {
      let message = 'Erro ao realizar login.'

      if (error.message.includes('Invalid login credentials')) {
        message = 'Email ou senha incorretos.'
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Email nao confirmado. Verifique sua caixa de entrada.'
      } else if (error.message.includes('aguardando aprovacao')) {
        message =
          'Sua conta esta aguardando aprovacao de um administrador.'
      } else if (error.message.includes('solicitacao de acesso foi recusada')) {
        message =
          'Sua solicitacao de acesso foi recusada. Procure um administrador.'
      } else {
        console.error(error)
      }

      toast.error(message)
      return
    }

    toast.success('Login realizado com sucesso!')
  }

  const onRegister = async (values: z.infer<typeof registerSchema>) => {
    setIsLoading(true)
    const { error } = await signUp(
      values.fullName,
      values.email,
      values.password,
    )
    setIsLoading(false)

    if (error) {
      console.error(error)
      toast.error('Erro ao registrar: ' + error.message)
      return
    }

    toast.success(
      'Solicitacao recebida. Sua conta ficara aguardando aprovacao de um administrador.',
    )
    setActiveTab('login')
    loginForm.setValue('email', values.email)
    registerForm.reset({ fullName: '', email: '', password: '' })
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-[450px] animate-fade-in border-t-4 border-t-primary shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="break-words text-center text-xl font-bold text-primary md:text-2xl">
            Gestao da Producao NBS Petroleo e Gas
          </CardTitle>
          <CardDescription className="text-center">
            Lancamento e gestao da producao
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Solicitar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form
                  onSubmit={loginForm.handleSubmit(onLogin)}
                  className="space-y-4"
                >
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="seu@email.com"
                            type="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Senha</FormLabel>
                          <Link
                            to="/forgot-password"
                            className="text-xs text-primary hover:underline"
                          >
                            Esqueceu a senha?
                          </Link>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input
                              aria-label="Senha"
                              type={showPassword ? 'text' : 'password'}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={
                                showPassword ? 'Ocultar senha' : 'Mostrar senha'
                              }
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form
                  onSubmit={registerForm.handleSubmit(onRegister)}
                  className="space-y-4"
                >
                  <FormField
                    control={registerForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome completo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Seu nome completo"
                            type="text"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="seu@email.com"
                            type="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              aria-label="Senha"
                              type={showPassword ? 'text' : 'password'}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={
                                showPassword ? 'Ocultar senha' : 'Mostrar senha'
                              }
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {isLoading ? 'Enviando...' : 'Solicitar acesso'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Ao se registrar, sua conta entra em fila de aprovacao. Um
                    administrador precisa liberar o acesso antes do primeiro
                    login.
                  </p>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center text-xs text-muted-foreground">
          Gestao da Producao NBS &copy; {new Date().getFullYear()}
        </CardFooter>
      </Card>
    </div>
  )
}
