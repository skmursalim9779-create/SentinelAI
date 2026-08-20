import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

const getAuthRedirectUrl = (path = '/') => {
  const baseUrl = window.location.origin
  return `${baseUrl}${path}`
}

// ─────────────────────────────────────────────────────────────
// HELPER: detect unverified email/password users
// Google OAuth users are ALWAYS exempt (their emails are
// already verified by Google).
// ─────────────────────────────────────────────────────────────
const isUnverifiedEmailUser = (user) => {
  if (!user) return false
  const provider = user.app_metadata?.provider
  if (provider !== 'email') return false // Google, etc. — always OK
  return !user.email_confirmed_at
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // ─────────────────────────────────────────────────────────────
  // SESSION
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    async function loadSession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('Failed to load session:', error)
        }

        // GUARD: block unverified email/password sessions
        if (session && isUnverifiedEmailUser(session.user)) {
          await supabase.auth.signOut()
          setSession(null)
          setLoading(false)
          return
        }

        setSession(session)
      } catch (error) {
        console.error('Session initialization failed:', error)

        if (mounted) {
          setSession(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      // GUARD: block unverified email/password sessions
      if (session && isUnverifiedEmailUser(session.user)) {
        await supabase.auth.signOut()
        setSession(null)
        setLoading(false)
        return
      }

      setSession(session)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // PROFILE
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    async function loadProfile() {
      if (!session?.user) {
        setProfile(null)
        return
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        if (!mounted) return

        if (error) {
          console.warn('Profile fetch note:', error.message)
        }

        const defaultProfile = {
          id: session.user.id,
          email: session.user.email,
          full_name:
            data?.full_name ||
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'Security Analyst',
          org_id: data?.org_id || null,
          role: data?.role || 'analyst',
          avatar_url:
            session.user.user_metadata?.avatar_url ||
            session.user.user_metadata?.picture ||
            null,
        }

        setProfile(data ? { ...defaultProfile, ...data } : defaultProfile)
      } catch (err) {
        if (!mounted) return

        setProfile({
          id: session.user.id,
          email: session.user.email,
          full_name:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'Security Analyst',
          role: 'analyst',
        })
      }
    }

    loadProfile()

    return () => {
      mounted = false
    }
  }, [session])

  // ─────────────────────────────────────────────────────────────
  // SIGN UP
  // ─────────────────────────────────────────────────────────────
  const signUp = async (email, password, fullName, orgName) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          org_name: orgName,
        },
        emailRedirectTo: getAuthRedirectUrl('/login'),
      },
    })
  }

  // ─────────────────────────────────────────────────────────────
  // SIGN IN
  // ─────────────────────────────────────────────────────────────
  const signIn = async (email, password) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    })
  }

  // ─────────────────────────────────────────────────────────────
  // GOOGLE SIGN IN
  // DO NOT CHANGE THIS FLOW
  // ─────────────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  }

  // ─────────────────────────────────────────────────────────────
  // PASSWORD RESET — LINK BASED
  // ─────────────────────────────────────────────────────────────
  const sendPasswordReset = async (email) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl('/reset-password'),
    })
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE PASSWORD
  // ─────────────────────────────────────────────────────────────
  const updatePassword = async (password) => {
    return await supabase.auth.updateUser({
      password,
    })
  }

  // ─────────────────────────────────────────────────────────────
  // SIGN OUT
  // ─────────────────────────────────────────────────────────────
  const signOut = async () => {
    return await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,

        signUp,
        signIn,
        signInWithGoogle,
        signOut,

        sendPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)