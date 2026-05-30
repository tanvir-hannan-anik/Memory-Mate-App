import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import Field from '@/components/ui/Field'
import Icon from '@/components/ui/Icon'
import { UserRole } from '@/types'

type Step = 0 | 1 | 2 | 3

const STEPS = ['Account', 'Role', 'Profile', 'Done']

const GoogleSVG = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

export default function Register() {
  const navigate = useNavigate()
  const { signInWithGoogle, signUpWithEmail, updateProfile, firebaseUser, profile, loading: authLoading } = useAuth()
  const { tr } = useLang()

  const [step, setStep] = useState<Step>(0)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole | null>(null)
  const [caregiverCode, setCaregiverCode] = useState('')
  const [relationship, setRelationship] = useState('')
  const [age, setAge] = useState('')
  const [language, setLanguage] = useState<'en' | 'bn'>('en')

  useEffect(() => {
    // Wait for Firebase Auth to resolve before making any navigation decisions
    if (authLoading) return
    // Already fully registered → go straight to the app
    if (firebaseUser && profile?.role) {
      navigate(profile.role === 'patient' ? '/patient' : '/caregiver', { replace: true })
      return
    }
    // Signed in but no role yet → skip the account-creation step
    if (firebaseUser && !profile?.role && step === 0) {
      setStep(1)
    }
  }, [authLoading, firebaseUser, profile?.role, step])

  const goBack = () => {
    if (step === 0) navigate(-1)
    else setStep((step - 1) as Step)
  }

  async function handleNext() {
    setError('')
    if (step === 0) {
      if (!name || !email || !password) { setError('Please fill all fields'); return }
      setLoading(true)
      try {
        await signUpWithEmail(email, password, name, phone)
        setStep(1)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Registration failed')
      } finally { setLoading(false) }
    } else if (step === 1) {
      if (!role) { setError('Please select a role'); return }
      setStep(2)
    } else if (step === 2) {
      setLoading(true)
      try {
        if (role === 'patient') {
          await updateProfile({ role: 'patient', age: parseInt(age) || undefined, language, phone: phone.trim() || undefined })
        } else {
          if (caregiverCode.trim()) {
            // Look up patient by caregiver_code in Firestore profiles
            const q = query(
              collection(db, 'profiles'),
              where('caregiver_code', '==', caregiverCode.replace(/\s/g, '')),
              where('role', '==', 'patient')
            )
            const snap = await getDocs(q)
            if (snap.empty) { setError('Invalid patient code'); setLoading(false); return }
            const patientId = snap.docs[0].id
            await updateProfile({ role: 'caregiver' })
            // Link caregiver ↔ patient in Firestore
            await addDoc(collection(db, 'caregiver_patients'), {
              caregiver_id: firebaseUser?.uid,
              patient_id:   patientId,
              status:       'active',
              relationship: relationship.trim() || null,
              linked_at:    serverTimestamp(),
            })
          } else {
            await updateProfile({ role: 'caregiver' })
          }
        }
        setStep(3)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to save profile')
      } finally { setLoading(false) }
    } else {
      navigate('/')
    }
  }

  // ── Mobile: exact prototype RegisterScreen recreation ─────────────
  const MobileRegister = (
    <div style={{
      position: 'relative', flex: 1, display: 'flex', flexDirection: 'column',
      background: 'var(--color-bg)', color: 'var(--color-ink)',
      fontFamily: 'var(--font-body)', paddingTop: 54, paddingBottom: 34,
      minHeight: '100dvh',
    }}>
      {/* Header row: back + progress + counter */}
      <div style={{ padding: '12px 24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={goBack}
          style={{
            width: 40, height: 40, borderRadius: 20,
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            cursor: 'pointer', fontSize: 22, color: 'var(--color-ink-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >‹</button>
        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
          {STEPS.map((_, idx) => (
            <div key={idx} style={{
              flex: 1, height: 6, borderRadius: 3,
              background: idx <= step ? 'var(--color-accent)' : 'var(--color-border)',
              transition: 'background 300ms',
            }} />
          ))}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-ink-soft)', fontWeight: 600, minWidth: 28, textAlign: 'right' }}>
          {step + 1}/{STEPS.length}
        </div>
      </div>

      <div style={{ padding: '20px 28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Step 0: Account */}
        {step === 0 && (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, margin: 0, lineHeight: 1.05, letterSpacing: -0.7 }}>
              Create your<br />account.
            </h1>
            <p style={{ fontSize: 16, color: 'var(--color-ink-soft)', marginTop: 6 }}>It takes about a minute.</p>

            {/* Google button */}
            <button
              onClick={async () => {
                setGoogleLoading(true)
                setError('')
                const timeoutId = setTimeout(() => {
                  setGoogleLoading(false)
                  setError('Sign-in took too long. Please check your internet connection and try again.')
                }, 15000)

                try {
                  await signInWithGoogle()
                  clearTimeout(timeoutId)
                } catch (err: unknown) {
                  clearTimeout(timeoutId)
                  const msg = err instanceof Error ? err.message : 'Google sign-in failed. Please check your internet and try again.'
                  setError(msg)
                  setGoogleLoading(false)
                }
              }}
              disabled={googleLoading}
              style={{ marginTop: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '14px 0', borderRadius: 14, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {googleLoading ? <span style={{ width: 18, height: 18, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> : <GoogleSVG />}
              {tr('Continue with Google', 'Google দিয়ে চালিয়ে যান')}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              <span style={{ fontSize: 12, color: 'var(--color-ink-mute)', fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label={tr('Your name', 'আপনার নাম')} value={name} onChange={e => setName(e.target.value)}
                icon={<Icon name="user" size={22} />} placeholder="Rahim Ahmed" />
              <Field label={tr('Phone number', 'ফোন নম্বর')} value={phone} onChange={e => setPhone(e.target.value)}
                icon={<Icon name="phone" size={22} />} type="tel" placeholder="+880 1712 345 678" />
              <Field label="Email" value={email} onChange={e => setEmail(e.target.value)}
                icon={<Icon name="user" size={22} />} type="email" placeholder="you@example.com" />
              <Field label={tr('Password', 'পাসওয়ার্ড')} value={password} onChange={e => setPassword(e.target.value)}
                icon={<Icon name="shield" size={22} />} type="password" placeholder="Min. 8 characters" />
            </div>
          </>
        )}

        {/* Step 1: Role */}
        {step === 1 && (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: -0.5 }}>
              Who is this for?
            </h1>
            <p style={{ fontSize: 16, color: 'var(--color-ink-soft)', marginTop: 6 }}>
              Patient and caregiver have different experiences.
            </p>
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { id: 'patient',   title: 'Patient',   sub: 'I want help remembering my day.',      icon: 'heart' },
                { id: 'caregiver', title: 'Caregiver', sub: "I'm caring for someone with dementia.", icon: 'shield' },
              ].map(r => {
                const active = role === r.id
                return (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id as UserRole)}
                    style={{
                      textAlign: 'left',
                      background: active ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                      border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      padding: 20, borderRadius: 18, cursor: 'pointer',
                      fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 16,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 56, height: 56, borderRadius: 14,
                      background: active ? 'var(--color-accent)' : 'var(--color-accent-soft)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon name={r.icon} size={28} color={active ? '#fff' : 'var(--color-accent-dark)'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--color-ink)' }}>{r.title}</div>
                      <div style={{ fontSize: 14, color: 'var(--color-ink-soft)', marginTop: 2 }}>{r.sub}</div>
                    </div>
                    <div style={{
                      width: 26, height: 26, borderRadius: 13, flexShrink: 0,
                      border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      background: active ? 'var(--color-accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {active && <Icon name="check" size={14} color="#fff" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Step 2: Profile */}
        {step === 2 && (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: -0.5 }}>
              {role === 'patient' ? 'Tell us about you.' : 'Connect to your patient.'}
            </h1>
            <p style={{ fontSize: 16, color: 'var(--color-ink-soft)', marginTop: 6 }}>
              {role === 'patient'
                ? 'A few details so we can take care of you.'
                : 'Ask your patient to share their 6-digit code.'}
            </p>

            {role === 'patient' && (
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Google profile preview */}
                {firebaseUser?.photoURL && (
                  <div style={{
                    background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                    padding: 16, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <img src={firebaseUser.photoURL} alt="" style={{ width: 56, height: 56, borderRadius: 28, objectFit: 'cover', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>{firebaseUser.displayName}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-good)', fontWeight: 600, marginTop: 2 }}>✓ {tr('Google account linked', 'Google অ্যাকাউন্ট যুক্ত')}</div>
                    </div>
                  </div>
                )}
                <Field label={tr('Age', 'বয়স')} value={age} onChange={e => setAge(e.target.value)}
                  icon={<Icon name="user" size={22} />} type="number" placeholder="72" />
                <Field label={tr('Phone number', 'ফোন নম্বর')} value={phone} onChange={e => setPhone(e.target.value)}
                  icon={<Icon name="phone" size={22} />} type="tel" placeholder="+880 1712 345 678" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink-soft)', marginBottom: 8 }}>
                    {tr('Preferred language', 'পছন্দের ভাষা')}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {([['en', 'English', 'English'], ['bn', 'বাংলা', 'বাংলা']] as const).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setLanguage(val)}
                        style={{
                          flex: 1, padding: '14px 0', borderRadius: 14,
                          border: `2px solid ${language === val ? 'var(--color-accent)' : 'var(--color-border)'}`,
                          background: language === val ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                          color: language === val ? 'var(--color-accent-dark)' : 'var(--color-ink-soft)',
                          fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700,
                          cursor: 'pointer', transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                      >
                        {language === val && <Icon name="check" size={16} color="var(--color-accent)" />}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {role === 'caregiver' && (
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Code entry boxes */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const digit = caregiverCode.replace(/\s/g, '')[idx] || ''
                    return (
                      <div key={idx} style={{
                        width: 48, height: 60, borderRadius: 12,
                        background: 'var(--color-surface)',
                        border: `2px solid ${digit ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--color-ink)',
                      }}>{digit}</div>
                    )
                  })}
                </div>
                <Field label={tr("Patient's caregiver code", 'রোগীর কোড')} value={caregiverCode}
                  onChange={e => setCaregiverCode(e.target.value)}
                  icon={<Icon name="shield" size={22} />} placeholder="739 245" />
                <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-ink-soft)' }}>
                  {tr('Ask the patient to share their 6-digit code from their profile', 'রোগীকে প্রোফাইল থেকে ৬-সংখ্যার কোড শেয়ার করতে বলুন')}
                </div>
                <Field label={tr('Relationship to patient', 'রোগীর সাথে সম্পর্ক')} value={relationship}
                  onChange={e => setRelationship(e.target.value)} icon={<Icon name="heart" size={22} />} placeholder="e.g. Daughter" />
              </div>
            )}
          </>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: 120, height: 120, borderRadius: 60,
              background: 'var(--color-accent-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '4px solid var(--color-accent)', position: 'relative',
            }}>
              <Icon name="check" size={64} color="var(--color-accent)" />
              {[0, 1, 2, 3].map(d => (
                <div key={d} style={{
                  position: 'absolute', width: 12, height: 12, borderRadius: 6, background: 'var(--color-accent)',
                  top: [-8, 30, 100, 50][d], left: [50, 130, 30, -10][d],
                }} />
              ))}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, margin: '32px 0 0', lineHeight: 1.05, letterSpacing: -0.5 }}>
              You're all set.
            </h1>
            <p style={{ fontSize: 17, color: 'var(--color-ink-soft)', marginTop: 8, maxWidth: 280, lineHeight: 1.5 }}>
              {role === 'patient'
                ? 'Memory Mate will greet you each morning and remember what matters.'
                : 'You can now see how your patient is doing — anytime, anywhere.'}
            </p>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, padding: '12px 16px', borderRadius: 12, background: 'var(--color-danger-soft)', color: 'var(--color-danger)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="alert-triangle" size={16} /> {error}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <button
          onClick={handleNext}
          disabled={loading || (step === 1 && !role)}
          style={{
            width: '100%',
            background: (step === 1 && !role) ? 'var(--color-ink-mute)' : 'var(--color-accent)',
            color: '#fff', border: 'none',
            cursor: (loading || (step === 1 && !role)) ? 'default' : 'pointer',
            padding: '18px 24px', borderRadius: 18,
            fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700,
            boxShadow: (step === 1 && !role) ? 'none' : '0 8px 22px color-mix(in srgb, var(--color-accent) 40%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading
            ? <span style={{ width: 22, height: 22, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
            : step === 3 ? 'Open Memory Mate' : 'Continue →'}
        </button>

        {step === 0 && (
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-ink-mute)', marginTop: 20 }}>
            {tr('Already have an account? ', 'ইতিমধ্যে অ্যাকাউন্ট আছে? ')}
            <button onClick={() => navigate('/login')} style={{ color: 'var(--color-accent)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
              {tr('Sign in', 'সাইন ইন')}
            </button>
          </p>
        )}
      </div>
    </div>
  )

  // ── Desktop: centered card on decorated background ───────────────
  const DesktopRegister = (
    <div
      className="hidden md:flex"
      style={{
        position: 'relative', minHeight: '100dvh',
        background: 'var(--color-bg)', overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Decorative circles — same family as mobile */}
      <div style={{ position: 'absolute', top: -200, right: -200, width: 580, height: 580, borderRadius: '50%', background: 'var(--color-accent)', opacity: 0.09 }} />
      <div style={{ position: 'absolute', top: 60, right: -70, width: 300, height: 300, borderRadius: '50%', background: 'var(--color-accent)', opacity: 0.06 }} />
      <div style={{ position: 'absolute', bottom: -180, left: -120, width: 520, height: 520, borderRadius: '50%', background: 'var(--color-accent-soft)' }} />

      {/* Back button */}
      <button
        onClick={goBack}
        style={{
          position: 'absolute', top: 36, left: 44,
          display: 'flex', alignItems: 'center', gap: 8,
          color: 'var(--color-ink-mute)', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 14, fontWeight: 600,
        }}
      >
        <Icon name="arrow-left" size={16} /> {step === 0 ? tr('Back', 'ফিরে') : tr('Previous', 'আগে')}
      </button>

      {/* Sign-in link */}
      {step === 0 && (
        <p style={{ position: 'absolute', top: 36, right: 44, fontSize: 14, color: 'var(--color-ink-mute)', margin: 0 }}>
          {tr('Already have an account? ', 'ইতিমধ্যে অ্যাকাউন্ট আছে? ')}
          <button onClick={() => navigate('/login')} style={{ color: 'var(--color-accent)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
            {tr('Sign in', 'সাইন ইন')}
          </button>
        </p>
      )}

      {/* Form card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: step === 1 ? 560 : 500,
        margin: '0 24px',
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: 28,
        padding: '48px 48px 44px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.07)',
        transition: 'max-width 0.3s ease',
      }}>
        {/* Logo + step progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <img src="/logo.png" alt="Memory Mate" style={{ height: 34, display: 'block' }} />
          </div>
          {/* Step pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {STEPS.slice(0, 3).map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 12, flexShrink: 0,
                  background: step > i ? 'var(--color-good)' : step === i ? 'var(--color-accent)' : 'var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                  color: step >= i ? '#fff' : 'var(--color-ink-mute)',
                }}>
                  {step > i ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: step === i ? 'var(--color-ink)' : 'var(--color-ink-mute)' }}>{label}</span>
                {i < 2 && <span style={{ color: 'var(--color-border)', margin: '0 2px', fontSize: 14 }}>›</span>}
              </div>
            ))}
          </div>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 6px', letterSpacing: -0.6 }}>
          {step === 0 && tr('Create your account', 'অ্যাকাউন্ট তৈরি করুন')}
          {step === 1 && tr('Who is this for?', 'এটি কার জন্য?')}
          {step === 2 && (role === 'patient' ? tr('Tell us about you', 'নিজের সম্পর্কে বলুন') : tr('Connect to your patient', 'রোগীর সাথে সংযুক্ত হন'))}
          {step === 3 && tr("You're all set!", 'সব প্রস্তুত!')}
        </h2>
        <p style={{ fontSize: 15, color: 'var(--color-ink-soft)', marginBottom: 28 }}>
          {step === 0 && tr('It takes about a minute.', 'এটি প্রায় এক মিনিট সময় নেয়।')}
          {step === 1 && tr('Patient and caregiver have different experiences.', 'রোগী ও পরিচর্যাকারীর অভিজ্ঞতা আলাদা।')}
          {step === 2 && (role === 'patient' ? tr('A few details so we can take care of you.', 'কিছু তথ্য যাতে আমরা আপনার যত্ন নিতে পারি।') : tr('Ask your patient to share their 6-digit code.', 'রোগীকে ৬-সংখ্যার কোড শেয়ার করতে বলুন।'))}
          {step === 3 && (role === 'patient' ? 'Memory Mate will greet you each morning.' : 'You can now monitor your patient anytime.')}
        </p>

        {/* Step 0 */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <button
              onClick={async () => {
                setGoogleLoading(true)
                setError('')
                try { await signInWithGoogle() } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : 'Google sign-in failed')
                  setGoogleLoading(false)
                }
              }}
              disabled={googleLoading}
              style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', padding: '14px 0', borderRadius: 14, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {googleLoading ? <span style={{ width: 18, height: 18, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> : <GoogleSVG />}
              {tr('Continue with Google', 'Google দিয়ে চালিয়ে যান')}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              <span style={{ fontSize: 12, color: 'var(--color-ink-mute)', fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            </div>
            <Field label={tr('Your name', 'আপনার নাম')} value={name} onChange={e => setName(e.target.value)} icon={<Icon name="user" size={18} />} placeholder="Rahim Ahmed" />
            <Field label={tr('Phone', 'ফোন')} value={phone} onChange={e => setPhone(e.target.value)} icon={<Icon name="phone" size={18} />} type="tel" placeholder="+880 1712 345 678" />
            <Field label="Email" value={email} onChange={e => setEmail(e.target.value)} icon={<Icon name="user" size={18} />} type="email" placeholder="you@example.com" />
            <Field label={tr('Password', 'পাসওয়ার্ড')} value={password} onChange={e => setPassword(e.target.value)} icon={<Icon name="shield" size={18} />} type="password" placeholder="Min. 8 characters" />
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { id: 'patient', title: 'Patient', sub: 'I want help remembering my day.', icon: 'heart' },
              { id: 'caregiver', title: 'Caregiver', sub: "I'm caring for someone with dementia.", icon: 'shield' },
            ].map(r => {
              const active = role === r.id
              return (
                <button key={r.id} onClick={() => setRole(r.id as UserRole)} style={{ textAlign: 'left', background: active ? 'var(--color-accent-soft)' : 'var(--color-surface)', border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`, padding: '20px 22px', borderRadius: 18, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 18, transition: 'all 0.15s' }}>
                  <div style={{ width: 58, height: 58, borderRadius: 14, background: active ? 'var(--color-accent)' : 'var(--color-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={r.icon} size={28} color={active ? '#fff' : 'var(--color-accent-dark)'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--color-ink)' }}>{r.title}</div>
                    <div style={{ fontSize: 14, color: 'var(--color-ink-soft)', marginTop: 3 }}>{r.sub}</div>
                  </div>
                  <div style={{ width: 26, height: 26, borderRadius: 13, flexShrink: 0, border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`, background: active ? 'var(--color-accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {active && <Icon name="check" size={14} color="#fff" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {role === 'patient' && (
              <>
                {firebaseUser?.photoURL && (
                  <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', padding: 14, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <img src={firebaseUser.photoURL} alt="" style={{ width: 48, height: 48, borderRadius: 24, objectFit: 'cover', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>{firebaseUser.displayName}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-good)', fontWeight: 600, marginTop: 2 }}>✓ {tr('Google account linked', 'Google অ্যাকাউন্ট যুক্ত')}</div>
                    </div>
                  </div>
                )}
                <Field label={tr('Age', 'বয়স')} value={age} onChange={e => setAge(e.target.value)} icon={<Icon name="user" size={18} />} type="number" placeholder="72" />
                <Field label={tr('Phone number', 'ফোন নম্বর')} value={phone} onChange={e => setPhone(e.target.value)} icon={<Icon name="phone" size={18} />} type="tel" placeholder="+880 1712 345 678" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink-soft)', marginBottom: 8 }}>
                    {tr('Preferred language', 'পছন্দের ভাষা')}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {([['en', 'English'], ['bn', 'বাংলা']] as const).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setLanguage(val)}
                        style={{
                          flex: 1, padding: '13px 0', borderRadius: 12,
                          border: `2px solid ${language === val ? 'var(--color-accent)' : 'var(--color-border)'}`,
                          background: language === val ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                          color: language === val ? 'var(--color-accent-dark)' : 'var(--color-ink-soft)',
                          fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
                          cursor: 'pointer', transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                      >
                        {language === val && <Icon name="check" size={15} color="var(--color-accent)" />}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {role === 'caregiver' && (
              <>
                <Field label={tr("Patient's code", 'রোগীর কোড')} value={caregiverCode} onChange={e => setCaregiverCode(e.target.value)} icon={<Icon name="shield" size={18} />} placeholder="739 245" />
                <p style={{ fontSize: 13, color: 'var(--color-ink-mute)', paddingLeft: 4 }}>{tr('Ask the patient to share their 6-digit code from their profile', 'রোগীকে প্রোফাইল থেকে কোড শেয়ার করতে বলুন')}</p>
                <Field label={tr('Relationship', 'সম্পর্ক')} value={relationship} onChange={e => setRelationship(e.target.value)} icon={<Icon name="heart" size={18} />} placeholder="e.g. Daughter" />
              </>
            )}
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '16px 0 8px' }}>
            <div style={{ width: 100, height: 100, borderRadius: 50, background: 'var(--color-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid var(--color-accent)' }}>
              <Icon name="check" size={52} color="var(--color-accent)" />
            </div>
            <p style={{ fontSize: 16, color: 'var(--color-ink-soft)', maxWidth: 320, lineHeight: 1.6 }}>
              {role === 'patient' ? 'Memory Mate will greet you each morning and remember what matters.' : 'You can now see how your patient is doing — anytime, anywhere.'}
            </p>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'var(--color-danger-soft)', color: 'var(--color-danger)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="alert-triangle" size={16} /> {error}
          </div>
        )}

        <button
          onClick={handleNext}
          disabled={loading || (step === 1 && !role)}
          className="btn btn-primary btn-full"
          style={{ fontSize: 17, marginTop: 24, borderRadius: 16, opacity: (step === 1 && !role) ? 0.5 : 1 }}
        >
          {loading
            ? <span style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
            : step === 3 ? 'Open Memory Mate' : 'Continue →'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div className="md:hidden">{MobileRegister}</div>
      {DesktopRegister}
    </>
  )
}
