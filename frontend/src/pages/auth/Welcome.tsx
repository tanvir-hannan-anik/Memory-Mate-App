import { useNavigate } from 'react-router-dom'
import { useLang } from '@/contexts/LangContext'
import Icon from '@/components/ui/Icon'

export default function Welcome() {
  const navigate = useNavigate()
  const { tr } = useLang()

  // ── Prototype WelcomeScreen exact recreation ──────────────────────
  const MobileWelcome = (
    <div style={{
      position: 'relative',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-bg)',
      color: 'var(--color-ink)',
      fontFamily: 'var(--font-body)',
      paddingTop: 54,
      paddingBottom: 34,
      overflow: 'hidden',
      minHeight: '100dvh',
    }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -120, right: -120, width: 380, height: 380, borderRadius: '50%', background: 'var(--color-accent)', opacity: 0.18 }} />
      <div style={{ position: 'absolute', top: 40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'var(--color-accent)', opacity: 0.12 }} />
      <div style={{ position: 'absolute', bottom: -120, left: -80, width: 360, height: 360, borderRadius: '50%', background: 'var(--color-accent-soft)' }} />

      {/* Waveform band */}
      <div style={{ position: 'absolute', top: 220, left: 0, right: 0, height: 80, display: 'flex', alignItems: 'center', gap: 6, padding: '0 24px', opacity: 0.3 }}>
        {[18, 32, 54, 24, 70, 40, 14, 48, 64, 20, 38, 56, 28, 44, 30, 18, 60, 22, 48].map((h, i) => (
          <div key={i} style={{ flex: 1, height: h, borderRadius: 4, background: 'var(--color-accent)' }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 28px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <div>
            <img src="/logo.png" alt="Memory Mate" style={{ height: 40, display: 'block' }} />
            <div style={{ fontSize: 12, color: 'var(--color-ink-soft)', fontWeight: 600, marginTop: 2 }}>{tr('Your memory companion', 'স্মৃতির সঙ্গী')}</div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Hero copy */}
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 56, lineHeight: 1.02,
            fontWeight: 800, margin: 0, color: 'var(--color-ink)', letterSpacing: -1.5,
          }}>
            {tr('Never forget', 'ভুলে যেতে')}<br />
            <span style={{ color: 'var(--color-accent)' }}>{tr('what matters.', 'দেবে না।')}</span>
          </h1>
          <p style={{ marginTop: 18, fontSize: 19, color: 'var(--color-ink-soft)', lineHeight: 1.55, maxWidth: 320 }}>
            {tr(
              'An AI memory companion that listens, remembers, and gently holds your day together — for you and the people who care.',
              'একটি AI স্মৃতিসঙ্গী যে শোনে, মনে রাখে, এবং তোমার দিন একসাথে ধরে রাখে।'
            )}
          </p>
        </div>

        <div style={{ flex: 1 }} />

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
          <button
            onClick={() => navigate('/register')}
            style={{
              background: 'var(--color-accent)', color: '#fff', border: 'none', cursor: 'pointer',
              padding: '18px 24px', borderRadius: 18,
              fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 8px 22px color-mix(in srgb, var(--color-accent) 40%, transparent)',
            }}
          >
            {tr('Get started', 'শুরু করো')} <span style={{ fontSize: 22 }}>→</span>
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'transparent', color: 'var(--color-ink)', border: 'none', cursor: 'pointer',
              padding: '14px 24px', fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600,
            }}
          >
            {tr('I already have an account', 'আমার একটি অ্যাকাউন্ট আছে')}{' '}
            <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{tr('Log in', 'লগ ইন')}</span>
          </button>
        </div>
      </div>
    </div>
  )

  // ── Desktop: same visual language as mobile, adapted for large screens ──
  const DesktopWelcome = (
    <div
      className="hidden md:flex"
      style={{
        position: 'relative', minHeight: '100dvh',
        background: 'var(--color-bg)', overflow: 'hidden',
        flexDirection: 'column',
      }}
    >
      {/* Decorative circles — scaled-up from mobile */}
      <div style={{ position: 'absolute', top: -220, right: -220, width: 640, height: 640, borderRadius: '50%', background: 'var(--color-accent)', opacity: 0.11 }} />
      <div style={{ position: 'absolute', top: 80, right: -80, width: 340, height: 340, borderRadius: '50%', background: 'var(--color-accent)', opacity: 0.07 }} />
      <div style={{ position: 'absolute', bottom: -200, left: -130, width: 560, height: 560, borderRadius: '50%', background: 'var(--color-accent-soft)' }} />

      {/* Waveform band at bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, display: 'flex', alignItems: 'flex-end', gap: 5, padding: '0 80px', opacity: 0.2 }}>
        {[18, 32, 54, 24, 70, 40, 14, 48, 64, 20, 38, 56, 28, 44, 30, 18, 60, 22, 48, 36, 52, 20, 44, 30, 16, 58].map((h, i) => (
          <div key={i} style={{ flex: 1, height: h, borderRadius: 4, background: 'var(--color-accent)' }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 1280, width: '100%', margin: '0 auto', padding: '48px 80px 100px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div>
            <img src="/logo.png" alt="Memory Mate" style={{ height: 44, display: 'block' }} />
            <div style={{ fontSize: 12, color: 'var(--color-ink-soft)', fontWeight: 600, marginTop: 2 }}>{tr('Your memory companion', 'স্মৃতির সঙ্গী')}</div>
          </div>
        </div>

        {/* Hero row */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 80 }}>
          {/* Left: hero copy */}
          <div style={{ flex: 1, maxWidth: 640 }}>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 78, lineHeight: 1.0,
              fontWeight: 800, margin: 0, color: 'var(--color-ink)', letterSpacing: -2.5,
            }}>
              {tr('Never forget', 'ভুলে যেতে')}<br />
              <span style={{ color: 'var(--color-accent)' }}>{tr('what matters.', 'দেবে না।')}</span>
            </h1>
            <p style={{ marginTop: 28, fontSize: 21, color: 'var(--color-ink-soft)', lineHeight: 1.55, maxWidth: 520 }}>
              {tr(
                'An AI memory companion that listens, remembers, and gently holds your day together — for you and the people who care.',
                'একটি AI স্মৃতিসঙ্গী যে শোনে, মনে রাখে, এবং তোমার দিন একসাথে ধরে রাখে।'
              )}
            </p>
            <div style={{ marginTop: 36, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {['🎙 Record & transcribe', '🧠 AI daily briefings', '📍 Real-time location', '👨‍👩‍👧 Family connected'].map(f => (
                <span key={f} style={{ fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 20, background: 'var(--color-accent-soft)', color: 'var(--color-accent-dark)' }}>{f}</span>
              ))}
            </div>
          </div>

          {/* Right: CTA card */}
          <div style={{ width: 400, flexShrink: 0 }}>
            <div style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 28,
              padding: '44px 40px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.07)',
            }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 8px', letterSpacing: -0.5 }}>
                {tr('Get started today', 'আজই শুরু করুন')}
              </h2>
              <p style={{ fontSize: 15, color: 'var(--color-ink-soft)', marginBottom: 32, lineHeight: 1.5 }}>
                {tr('Create a free account or sign in to continue.', 'বিনামূল্যে অ্যাকাউন্ট তৈরি করুন বা সাইন ইন করুন।')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <button
                  onClick={() => navigate('/register')}
                  className="btn btn-primary btn-full"
                  style={{ fontSize: 18, borderRadius: 16 }}
                >
                  {tr('Create account', 'অ্যাকাউন্ট তৈরি করুন')} →
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="btn btn-ghost btn-full"
                  style={{ fontSize: 18, borderRadius: 16 }}
                >
                  {tr('Sign in', 'সাইন ইন করুন')}
                </button>
              </div>
              <div style={{ marginTop: 36, paddingTop: 28, borderTop: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
                {[{ v: '10K+', l: tr('Patients', 'রোগী') }, { v: '99.9%', l: tr('Uptime', 'আপটাইম') }, { v: '4.9★', l: tr('Rating', 'রেটিং') }].map(s => (
                  <div key={s.l}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--color-accent)' }}>{s.v}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-mute)', marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile (hidden on desktop via md:hidden on inner div) */}
      <div className="md:hidden">
        {MobileWelcome}
      </div>
      {DesktopWelcome}
    </>
  )
}
