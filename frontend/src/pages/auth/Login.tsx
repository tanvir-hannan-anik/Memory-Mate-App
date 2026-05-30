import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import Field from '@/components/ui/Field'
import Icon from '@/components/ui/Icon'

const GoogleSVG = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

export default function Login() {
  const navigate = useNavigate()
  const { signInWithEmail, signInWithGoogle } = useAuth()
  const { tr } = useLang()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
    try {
      await signInWithEmail(email, password)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally { setLoading(false) }
  }

  async function handleGoogle() {
    setGoogleLoading(true); setError('')
    try {
      await signInWithGoogle()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setGoogleLoading(false)
    }
  }

  // ── Mobile: exact prototype LoginScreen recreation ────────────────
  const MobileLogin = (
    <div style={{
      position: 'relative', flex: 1, display: 'flex', flexDirection: 'column',
      background: 'var(--color-bg)', color: 'var(--color-ink)',
      fontFamily: 'var(--font-body)', paddingTop: 54, paddingBottom: 34,
      minHeight: '100dvh',
    }}>
      {/* Back button */}
      <div style={{ padding: '12px 24px 0', display: 'flex', alignItems: 'center' }}>
        <button
          onClick={() => navigate('/welcome')}
          style={{
            width: 40, height: 40, borderRadius: 20,
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            cursor: 'pointer', fontSize: 22, color: 'var(--color-ink-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >‹</button>
      </div>

      <div style={{ padding: '20px 28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800,
          margin: 0, lineHeight: 1.05, color: 'var(--color-ink)', letterSpacing: -0.8,
        }}>
          Welcome back.
        </h1>
        <p style={{ fontSize: 17, color: 'var(--color-ink-soft)', marginTop: 8 }}>
          আবার দেখা হল — Sign in to continue.
        </p>

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field
            label={tr('Phone or email', 'ফোন বা ইমেইল')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            icon={<Icon name="phone" size={22} />}
            type="email"
            autoComplete="email"
          />
          <Field
            label={tr('Password', 'পাসওয়ার্ড')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            icon={<Icon name="shield" size={22} />}
            type="password"
            autoComplete="current-password"
          />
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: 'var(--color-accent)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {tr('Forgot password?', 'পাসওয়ার্ড ভুলে গেছেন?')}
            </span>
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 12, padding: '12px 16px', borderRadius: 12,
            background: 'var(--color-danger-soft)', color: 'var(--color-danger)',
            fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="alert-triangle" size={16} />
            {error}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <form onSubmit={handleSubmit}>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', background: 'var(--color-accent)', color: '#fff',
              border: 'none', cursor: loading ? 'default' : 'pointer',
              padding: '18px 24px', borderRadius: 18,
              fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700,
              boxShadow: '0 8px 22px color-mix(in srgb, var(--color-accent) 40%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {loading
              ? <span style={{ width: 22, height: 22, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              : tr('Log in', 'লগ ইন')}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-ink-mute)', fontWeight: 600 }}>OR CONTINUE WITH</span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              padding: '14px 0', borderRadius: 14, cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--color-ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {googleLoading
              ? <span style={{ width: 18, height: 18, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              : <GoogleSVG />}
            Google
          </button>
          <button
            style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              padding: '14px 0', borderRadius: 14, cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--color-ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            Apple
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-ink-mute)', marginTop: 24 }}>
          {tr("Don't have an account? ", 'অ্যাকাউন্ট নেই? ')}
          <button
            onClick={() => navigate('/register')}
            style={{ color: 'var(--color-accent)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
          >
            {tr('Sign up', 'সাইন আপ')}
          </button>
        </p>
      </div>
    </div>
  )

  // ── Desktop: centered card on decorated background ────────────────
  const DesktopLogin = (
    <div
      className="hidden md:flex"
      style={{
        position: 'relative', minHeight: '100dvh',
        background: 'var(--color-bg)', overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Decorative circles — same family as mobile, desktop scale */}
      <div style={{ position: 'absolute', top: -200, right: -200, width: 580, height: 580, borderRadius: '50%', background: 'var(--color-accent)', opacity: 0.09 }} />
      <div style={{ position: 'absolute', top: 60, right: -70, width: 300, height: 300, borderRadius: '50%', background: 'var(--color-accent)', opacity: 0.06 }} />
      <div style={{ position: 'absolute', bottom: -180, left: -120, width: 520, height: 520, borderRadius: '50%', background: 'var(--color-accent-soft)' }} />

      {/* Back button — top left */}
      <button
        onClick={() => navigate('/welcome')}
        style={{
          position: 'absolute', top: 36, left: 44,
          display: 'flex', alignItems: 'center', gap: 8,
          color: 'var(--color-ink-mute)', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 14, fontWeight: 600,
        }}
      >
        <Icon name="arrow-left" size={16} /> {tr('Back', 'ফিরে')}
      </button>

      {/* Sign-up link — top right */}
      <p style={{ position: 'absolute', top: 36, right: 44, fontSize: 14, color: 'var(--color-ink-mute)', margin: 0 }}>
        {tr("Don't have an account? ", 'অ্যাকাউন্ট নেই? ')}
        <button onClick={() => navigate('/register')} style={{ color: 'var(--color-accent)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
          {tr('Sign up', 'সাইন আপ')}
        </button>
      </p>

      {/* Form card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 500,
        margin: '0 24px',
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: 28,
        padding: '52px 48px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.07)',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 36 }}>
          <img src="/logo.png" alt="Memory Mate" style={{ height: 40, display: 'block' }} />
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 6px', letterSpacing: -0.7 }}>
          Welcome back.
        </h2>
        <p style={{ fontSize: 16, color: 'var(--color-ink-soft)', marginBottom: 36 }}>
          {tr('Sign in to continue.', 'চালিয়ে যেতে সাইন ইন করুন।')}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={tr('Phone or email', 'ফোন বা ইমেইল')} value={email} onChange={e => setEmail(e.target.value)}
            icon={<Icon name="phone" size={18} />} type="email" autoComplete="email" />
          <Field label={tr('Password', 'পাসওয়ার্ড')} value={password} onChange={e => setPassword(e.target.value)}
            icon={<Icon name="shield" size={18} />} type="password" autoComplete="current-password" />
          <div style={{ textAlign: 'right' }}>
            <button type="button" style={{ color: 'var(--color-accent)', fontSize: 14, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
              {tr('Forgot password?', 'পাসওয়ার্ড ভুলে গেছেন?')}
            </button>
          </div>
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--color-danger-soft)', color: 'var(--color-danger)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="alert-triangle" size={16} /> {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn btn-primary btn-full" style={{ fontSize: 17, marginTop: 6, borderRadius: 16 }}>
            {loading ? <span style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> : tr('Log in', 'লগ ইন')}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-ink-mute)', fontWeight: 600 }}>OR CONTINUE WITH</span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button onClick={handleGoogle} disabled={googleLoading} style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', padding: '14px 0', borderRadius: 14, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {googleLoading ? <span style={{ width: 18, height: 18, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> : <GoogleSVG />}
            Google
          </button>
          <button style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', padding: '14px 0', borderRadius: 14, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            Apple
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="md:hidden">{MobileLogin}</div>
      {DesktopLogin}
    </>
  )
}
