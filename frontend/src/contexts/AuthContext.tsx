import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getAdditionalUserInfo } from 'firebase/auth'
import {
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fbSignOut,
  onAuthStateChanged,
  fsGetProfile,
  fsSetProfile,
  fsGenerateUniqueCode,
  type FirebaseUser,
} from '@/lib/firebase'
import { User } from '@/types'

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  profile: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, name: string, phone: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function firebaseErrorMessage(code: string): string {
  const map: Record<string, string> = {
    'auth/user-not-found':       'No account found with this email',
    'auth/wrong-password':       'Incorrect password',
    'auth/invalid-credential':   'Invalid email or password',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password':        'Password must be at least 6 characters',
    'auth/invalid-email':        'Invalid email address',
    'auth/too-many-requests':    'Too many attempts — try again later',
    'auth/network-request-failed': 'Network error — check your connection',
    'auth/popup-blocked':        'Popup blocked — please allow popups for this site',
    'auth/popup-closed-by-user': 'Sign-in was cancelled',
  }
  return map[code] || 'Authentication failed'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile]           = useState<User | null>(null)
  const [loading, setLoading]           = useState(true)

  async function fetchProfile(uid: string): Promise<User | null> {
    const data = await fsGetProfile(uid)
    if (data) {
      // Back-fill missing caregiver_code for existing accounts
      if (!data.caregiver_code) {
        const code = await fsGenerateUniqueCode()
        await fsSetProfile(uid, { caregiver_code: code })
        data.caregiver_code = code
      }
      setProfile({ id: uid, ...data } as User)
    } else {
      setProfile(null)
    }
    return data ? ({ id: uid, ...data } as User) : null
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (user) {
        try {
          await fetchProfile(user.uid)
        } catch (err) {
          console.error('fetchProfile error:', err)
          setProfile(null)
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      const isNewUser = getAdditionalUserInfo(result)?.isNewUser ?? false

      if (isNewUser) {
        // New account: create profile then refresh context.
        // onAuthStateChanged fires first and finds no profile (null),
        // so we must call fetchProfile again after creation.
        Promise.resolve().then(async () => {
          try {
            const code = await fsGenerateUniqueCode()
            await fsSetProfile(user.uid, {
              id:             user.uid,
              email:          user.email ?? '',
              name:           user.displayName ?? user.email?.split('@')[0] ?? 'User',
              avatar_url:     user.photoURL ?? null,
              role:           null,
              language:       'en',
              caregiver_code: code,
              created_at:     new Date().toISOString(),
            })
            await fetchProfile(user.uid)
          } catch (err) {
            console.error('Background profile sync failed:', err)
          }
        })
      }
      // Existing users: onAuthStateChanged already called fetchProfile — nothing more needed.
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const errorMsg = code === 'auth/popup-blocked'
        ? 'Popup blocked — please allow popups for this site'
        : code === 'auth/popup-closed-by-user'
        ? 'Sign-in was cancelled'
        : code === 'auth/network-request-failed'
        ? 'Network error — check your connection'
        : code === 'auth/operation-not-supported-in-this-environment'
        ? 'Sign-in not supported in this browser'
        : 'Google sign-in failed. Please try again.'
      throw new Error(errorMsg)
    }
  }

  async function signInWithEmail(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      throw new Error(firebaseErrorMessage(code))
    }
  }

  async function signUpWithEmail(email: string, password: string, name: string, phone: string) {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      const code = await fsGenerateUniqueCode()
      await fsSetProfile(user.uid, {
        id:             user.uid,
        email,
        name,
        phone:          phone || null,
        role:           null,
        language:       'en',
        caregiver_code: code,
        created_at:     new Date().toISOString(),
      })
      await fetchProfile(user.uid)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      throw new Error(firebaseErrorMessage(code))
    }
  }

  async function signOut() {
    await fbSignOut(auth)
    setProfile(null)
    setFirebaseUser(null)
  }

  async function updateProfile(data: Partial<User>) {
    if (!firebaseUser) return
    await fsSetProfile(firebaseUser.uid, data)
    await fetchProfile(firebaseUser.uid)
  }

  async function refreshProfile() {
    if (firebaseUser) await fetchProfile(firebaseUser.uid)
  }

  return (
    <AuthContext.Provider value={{
      firebaseUser, profile, loading,
      signInWithGoogle, signInWithEmail, signUpWithEmail,
      signOut, updateProfile, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
