import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { UserApprovalStatus, UserRole } from '@/lib/types'

type AuthProfile = {
  role: UserRole | null
  avatarUrl: string | null
  approvalStatus: UserApprovalStatus | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  role: UserRole | null
  avatarUrl: string | null
  setAvatarUrl: (url: string | null) => void
  signUp: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<{
    error: any
    data: {
      user: User | null
      session: Session | null
    } | null
  }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(false)

  const fetchProfile = useCallback(
    async (userId: string): Promise<AuthProfile> => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('role, avatar_url, approval_status')
          .eq('id', userId)
          .single()

        if (error) {
          console.error('[useAuth] Error querying user_profiles:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          })

          if (error.code === 'PGRST116') {
            console.warn(
              '[useAuth] User profile not found (0 rows). This might be a new user pending profile creation.',
            )
          } else if (
            error.code === '42501' ||
            error.message?.includes('policy')
          ) {
            console.error(
              '[useAuth] RLS Policy Violation (403/42501). User may not have permission to view their profile.',
            )
          }

          return { role: null, avatarUrl: null, approvalStatus: null }
        }
        return {
          role: data?.role as UserRole,
          avatarUrl: data?.avatar_url || null,
          approvalStatus: (data?.approval_status as UserApprovalStatus) || null,
        }
      } catch (e: any) {
        console.error('[useAuth] Exception fetching user role:', e)
        return { role: null, avatarUrl: null, approvalStatus: null }
      }
    },
    [],
  )

  const clearAuthState = useCallback(() => {
    if (!mounted.current) return
    setUser(null)
    setSession(null)
    setRole(null)
    setAvatarUrl(null)
  }, [])

  const applyApprovedSession = useCallback(
    async (currentSession: Session | null) => {
      const currentUser = currentSession?.user ?? null

      if (!currentUser) {
        clearAuthState()
        return { approved: false }
      }

      const {
        role: fetchedRole,
        avatarUrl: fetchedAvatarUrl,
        approvalStatus,
      } = await fetchProfile(currentUser.id)

      if (!approvalStatus || approvalStatus !== 'active') {
        await supabase.auth.signOut()
        clearAuthState()
        return { approved: false, approvalStatus }
      }

      if (mounted.current) {
        setSession(currentSession)
        setUser(currentUser)
        setRole(fetchedRole)
        setAvatarUrl(fetchedAvatarUrl)
      }

      return { approved: true, approvalStatus }
    },
    [clearAuthState, fetchProfile],
  )

  useEffect(() => {
    mounted.current = true

    const initializeAuth = async () => {
      try {
        console.log('[useAuth] Initializing auth...')
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession()

        if (mounted.current) {
          if (initialSession?.user) {
            await applyApprovedSession(initialSession)
          } else {
            clearAuthState()
          }
        }
      } catch (error) {
        console.error('[useAuth] Auth initialization error:', error)
      } finally {
        if (mounted.current) {
          console.log(
            '[useAuth] Auth initialization complete. Setting loading to false.',
          )
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted.current) return

      console.log('[useAuth] Auth State Change:', event)

      if (event === 'PASSWORD_RECOVERY') {
        if (currentSession?.user) {
          setSession(currentSession)
          setUser(currentSession.user)
        } else {
          clearAuthState()
        }
        setLoading(false)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (currentSession?.user) {
          applyApprovedSession(currentSession)
        } else {
          clearAuthState()
          setLoading(false)
        }
      } else if (event === 'SIGNED_OUT') {
        clearAuthState()
        setLoading(false)
      } else {
        if (currentSession?.user) {
          applyApprovedSession(currentSession).finally(() => {
            if (mounted.current) {
              setLoading(false)
            }
          })
        } else {
          clearAuthState()
          setLoading(false)
        }
      }
    })

    return () => {
      mounted.current = false
      subscription.unsubscribe()
    }
  }, [applyApprovedSession, clearAuthState])

  const signUp = async (fullName: string, email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName || null,
        },
      },
    })

    if (!error && data?.session) {
      await supabase.auth.signOut()
    }

    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) return { error }

    const userId = data.user?.id
    if (!userId) {
      await supabase.auth.signOut()
      return { error: new Error('Nao foi possivel validar sua conta.') }
    }

    const profile = await fetchProfile(userId)

    if (!profile.approvalStatus || profile.approvalStatus === 'pending') {
      await supabase.auth.signOut()
      return {
        error: new Error(
          'Sua conta esta aguardando aprovacao de um administrador.',
        ),
      }
    }

    if (profile.approvalStatus === 'rejected') {
      await supabase.auth.signOut()
      return {
        error: new Error(
          'Sua solicitacao de acesso foi recusada. Procure um administrador.',
        ),
      }
    }

    return { error: null }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (mounted.current) {
      setRole(null)
      setAvatarUrl(null)
      setUser(null)
      setSession(null)
    }
    return { error }
  }

  const value = {
    user,
    session,
    role,
    avatarUrl,
    setAvatarUrl,
    signUp,
    signIn,
    signOut,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
