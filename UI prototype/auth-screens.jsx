// Auth flow — Welcome, Login, Register (multi-step), Role chooser
// All screens are 402x874 in iOS frame, theme-aware.

function AuthShell({ t, f, s, children, bg, decorative }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: bg || t.bg, color: t.ink,
      fontFamily: f.body, paddingTop: 54, paddingBottom: 34,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {decorative}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Welcome ───
function WelcomeScreen({ t, f, s, i, onLogin, onRegister }) {
  const tr = useTr();
  const deco = (
    <React.Fragment>
      <div style={{ position: 'absolute', top: -120, right: -120, width: 380, height: 380, borderRadius: '50%', background: t.accent, opacity: 0.18 }}/>
      <div style={{ position: 'absolute', top: 40, right: -40, width: 220, height: 220, borderRadius: '50%', background: t.accent, opacity: 0.12 }}/>
      <div style={{ position: 'absolute', bottom: -120, left: -80, width: 360, height: 360, borderRadius: '50%', background: t.accentSoft }}/>
      {/* Waveform decorative band */}
      <div style={{ position: 'absolute', top: 220, left: 0, right: 0, height: 80, display: 'flex', alignItems: 'center', gap: 6, padding: '0 24px', opacity: 0.3 }}>
        {[18, 32, 54, 24, 70, 40, 14, 48, 64, 20, 38, 56, 28, 44, 30, 18, 60, 22, 48].map((h, idx) => (
          <div key={idx} style={{
            flex: 1, height: h, borderRadius: 4,
            background: t.accent,
          }}/>
        ))}
      </div>
    </React.Fragment>
  );

  return (
    <AuthShell t={t} f={f} s={s} decorative={deco}>
      <div style={{ padding: '20px 28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 24,
            background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 20px ${t.accent}55`,
          }}>
            <Icon name="sparkle" size={26} stroke="#fff" filled/>
          </div>
          <div>
            <div style={{ fontFamily: f.display, fontSize: 24, fontWeight: 800, color: t.ink, letterSpacing: -0.3 }}>Memora</div>
            <div style={{ fontSize: 12, color: t.inkSoft, fontWeight: 600 }}>{tr('Your memory companion', 'স্মৃতির সঙ্গী')}</div>
          </div>
        </div>

        <div style={{ flex: 1 }}/>

        {/* Hero copy */}
        <div>
          <h1 style={{
            fontFamily: f.display, fontSize: 56, lineHeight: 1.02,
            fontWeight: 800, margin: 0, color: t.ink, letterSpacing: -1.5,
          }}>
            {tr('Never forget', 'ভুলে যেত দিবে না')}<br/>
            <span style={{ color: t.accent }}>{tr('what matters.', 'যা গুরুত্বপূর্ণ।')}</span>
          </h1>
          <p style={{
            marginTop: 18, fontSize: 19, color: t.inkSoft, lineHeight: 1.55, maxWidth: 320,
          }}>
            {tr(
              'An AI memory companion that listens, remembers, and gently holds your day together — for you and the people who care.',
              'একটি AI স্মৃতিসঙ্গী যে শোনে, মনে রাখে, এবং তোমার দিন একসাথে ধরে রাখে — তোমার এবং যারা তোমায় যত্ন করে তাদের জন্য।'
            )}
          </p>
        </div>

        <div style={{ flex: 1 }}/>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
          <button onClick={onRegister} style={{
            background: t.accent, color: '#fff', border: 'none', cursor: 'pointer',
            padding: '18px 24px', borderRadius: 18,
            fontFamily: f.display, fontSize: 19, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: `0 8px 22px ${t.accent}44`,
          }}>
            {tr('Get started', 'শুরু করো')} <span style={{ fontSize: 22 }}>→</span>
          </button>
          <button onClick={onLogin} style={{
            background: 'transparent', color: t.ink, border: 'none', cursor: 'pointer',
            padding: '14px 24px', fontFamily: f.body, fontSize: 16, fontWeight: 600,
          }}>
            {tr('I already have an account', 'আমার একটি অ্যাকাউন্ট আছে')} <span style={{ color: t.accent, fontWeight: 700 }}>{tr('Log in', 'লগ ইন')}</span>
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

// ─── Login ───
function LoginScreen({ t, f, s, i, onBack, onLogin }) {
  const [phone, setPhone] = React.useState('+880 1712 345 678');
  const [pw, setPw] = React.useState('••••••••');
  return (
    <AuthShell t={t} f={f} s={s}>
      <div style={{ padding: '12px 24px 0', display: 'flex', alignItems: 'center' }}>
        <button onClick={onBack} style={{
          width: 40, height: 40, borderRadius: 20,
          background: t.surface, border: `1px solid ${t.border}`,
          cursor: 'pointer', fontSize: 20, color: t.inkSoft,
        }}>‹</button>
      </div>

      <div style={{ padding: '20px 28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontFamily: f.display, fontSize: 38, fontWeight: 800, margin: 0, lineHeight: 1.05, color: t.ink, letterSpacing: -0.8 }}>
          Welcome back.
        </h1>
        <p style={{ fontSize: 17, color: t.inkSoft, marginTop: 8 }}>
          আবার দেখা হল — Sign in to continue.
        </p>

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field t={t} f={f} label="Phone or email" value={phone} onChange={setPhone} icon="phone"/>
          <Field t={t} f={f} label="Password" value={pw} onChange={setPw} icon="shield" type="password"/>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: t.accent, fontSize: 14, fontWeight: 600 }}>Forgot password?</span>
          </div>
        </div>

        <div style={{ flex: 1 }}/>

        <button onClick={onLogin} style={{
          background: t.accent, color: '#fff', border: 'none', cursor: 'pointer',
          padding: '18px 24px', borderRadius: 18,
          fontFamily: f.display, fontSize: 19, fontWeight: 700,
          boxShadow: `0 8px 22px ${t.accent}44`,
        }}>
          Log in
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: t.border }}/>
          <span style={{ fontSize: 12, color: t.inkMute, fontWeight: 600 }}>OR CONTINUE WITH</span>
          <div style={{ flex: 1, height: 1, background: t.border }}/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { l: 'Google',    g: 'G' },
            { l: 'Apple',     g: '' },
          ].map(p => (
            <button key={p.l} style={{
              background: t.surface, border: `1px solid ${t.border}`,
              padding: '14px 0', borderRadius: 14, cursor: 'pointer',
              fontFamily: f.body, fontSize: 15, fontWeight: 600, color: t.ink,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: t.accent }}>{p.g}</span>
              {p.l}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}

// ─── Register multi-step ───
function RegisterScreen({ t, f, s, i, onBack, onComplete }) {
  const [step, setStep] = React.useState(0);
  const [role, setRole] = React.useState(null);

  const steps = ['Account', 'Role', 'Profile', 'Done'];

  const next = () => {
    if (step >= steps.length - 1) onComplete && onComplete(role);
    else setStep(step + 1);
  };
  const back = () => {
    if (step === 0) onBack && onBack();
    else setStep(step - 1);
  };

  return (
    <AuthShell t={t} f={f} s={s}>
      <div style={{ padding: '12px 24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={back} style={{
          width: 40, height: 40, borderRadius: 20,
          background: t.surface, border: `1px solid ${t.border}`,
          cursor: 'pointer', fontSize: 20, color: t.inkSoft,
        }}>‹</button>
        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
          {steps.map((_, idx) => (
            <div key={idx} style={{
              flex: 1, height: 6, borderRadius: 3,
              background: idx <= step ? t.accent : t.border,
              transition: 'background 300ms',
            }}/>
          ))}
        </div>
        <div style={{ fontSize: 13, color: t.inkSoft, fontWeight: 600, minWidth: 28, textAlign: 'right' }}>
          {step + 1}/{steps.length}
        </div>
      </div>

      <div style={{ padding: '20px 28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {step === 0 && <StepAccount t={t} f={f}/>}
        {step === 1 && <StepRole    t={t} f={f} i={i} role={role} onChoose={setRole}/>}
        {step === 2 && <StepProfile t={t} f={f} role={role}/>}
        {step === 3 && <StepDone    t={t} f={f} i={i} role={role}/>}

        <div style={{ flex: 1 }}/>
        <button onClick={next} disabled={step === 1 && !role} style={{
          background: (step === 1 && !role) ? t.inkMute : t.accent,
          color: '#fff', border: 'none', cursor: (step === 1 && !role) ? 'default' : 'pointer',
          padding: '18px 24px', borderRadius: 18,
          fontFamily: f.display, fontSize: 19, fontWeight: 700,
          boxShadow: (step === 1 && !role) ? 'none' : `0 8px 22px ${t.accent}44`,
        }}>
          {step === 3 ? 'Open Memora' : 'Continue →'}
        </button>
      </div>
    </AuthShell>
  );
}

function StepAccount({ t, f }) {
  return (
    <React.Fragment>
      <h1 style={{ fontFamily: f.display, fontSize: 36, fontWeight: 800, margin: 0, lineHeight: 1.05, letterSpacing: -0.7 }}>
        Create your<br/>account.
      </h1>
      <p style={{ fontSize: 16, color: t.inkSoft, marginTop: 6 }}>It takes about a minute.</p>
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field t={t} f={f} label="Your name" value="Rahim Ahmed" icon="user"/>
        <Field t={t} f={f} label="Phone number" value="+880 1712 345 678" icon="phone"/>
        <Field t={t} f={f} label="Password" value="••••••••" icon="shield" type="password"/>
      </div>
    </React.Fragment>
  );
}

function StepRole({ t, f, i, role, onChoose }) {
  const roles = [
    { id: 'patient',   title: 'Patient',   sub: 'I want help remembering my day.',     icon: 'heart' },
    { id: 'caregiver', title: 'Caregiver', sub: "I'm caring for someone with dementia.", icon: 'shield' },
  ];
  return (
    <React.Fragment>
      <h1 style={{ fontFamily: f.display, fontSize: 32, fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: -0.5 }}>
        Who is this for?
      </h1>
      <p style={{ fontSize: 16, color: t.inkSoft, marginTop: 6 }}>
        Patient and caregiver have different experiences.
      </p>
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {roles.map(r => {
          const a = role === r.id;
          return (
            <button key={r.id} onClick={() => onChoose(r.id)} style={{
              textAlign: 'left',
              background: a ? t.accentSoft : t.surface,
              border: `2px solid ${a ? t.accent : t.border}`,
              padding: 20, borderRadius: 18, cursor: 'pointer',
              fontFamily: f.body, display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: a ? t.accent : t.accentSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={r.icon} size={28} stroke={a ? '#fff' : t.accentInk} filled={i === 'filled'}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: f.display, fontSize: 22, fontWeight: 700, color: t.ink }}>{r.title}</div>
                <div style={{ fontSize: 14, color: t.inkSoft, marginTop: 2 }}>{r.sub}</div>
              </div>
              <div style={{
                width: 26, height: 26, borderRadius: 13,
                border: `2px solid ${a ? t.accent : t.border}`,
                background: a ? t.accent : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {a && <Icon name="check" size={16} stroke="#fff"/>}
              </div>
            </button>
          );
        })}
      </div>
    </React.Fragment>
  );
}

function StepProfile({ t, f, role }) {
  return (
    <React.Fragment>
      <h1 style={{ fontFamily: f.display, fontSize: 32, fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: -0.5 }}>
        {role === 'patient' ? 'Tell us about you.' : 'Connect to your patient.'}
      </h1>
      <p style={{ fontSize: 16, color: t.inkSoft, marginTop: 6 }}>
        {role === 'patient'
          ? 'A few details so we can take care of you.'
          : 'Ask your patient to share their 6-digit code.'}
      </p>

      {role === 'patient' && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Photo */}
          <div style={{
            background: t.surface, border: `1.5px dashed ${t.border}`,
            padding: 18, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 60, height: 60, borderRadius: 30, background: t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: t.accentInk, fontWeight: 800 }}>র</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.ink }}>Add a photo</div>
              <div style={{ fontSize: 13, color: t.inkSoft }}>So we can greet you warmly.</div>
            </div>
            <div style={{ color: t.accent, fontSize: 15, fontWeight: 700 }}>+ Add</div>
          </div>
          <Field t={t} f={f} label="Age" value="72" icon="calendar"/>
          <Field t={t} f={f} label="Preferred language" value="বাংলা · English" icon="chat"/>
        </div>
      )}

      {role === 'caregiver' && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Code blocks */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {['7','3','9','2','4','5'].map((d, idx) => (
              <div key={idx} style={{
                width: 48, height: 60, borderRadius: 12,
                background: t.surface, border: `2px solid ${idx < 6 ? t.accent : t.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: f.display, fontSize: 28, fontWeight: 800, color: t.ink,
              }}>{d}</div>
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: 14, color: t.inkSoft, marginTop: 6 }}>
            Connected to <span style={{ color: t.accent, fontWeight: 700 }}>Rahim Ahmed</span>
          </div>
          <Field t={t} f={f} label="Relationship to patient" value="Daughter" icon="heart"/>
        </div>
      )}
    </React.Fragment>
  );
}

function StepDone({ t, f, i, role }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 0' }}>
      <div style={{
        width: 120, height: 120, borderRadius: 60,
        background: t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `4px solid ${t.accent}`, position: 'relative',
      }}>
        <Icon name="check" size={64} stroke={t.accent}/>
        {/* Spark dots */}
        {[0, 1, 2, 3].map(d => (
          <div key={d} style={{
            position: 'absolute',
            width: 12, height: 12, borderRadius: 6, background: t.accent,
            top: [-8, 30, 100, 50][d], left: [50, 130, 30, -10][d],
          }}/>
        ))}
      </div>
      <h1 style={{ fontFamily: f.display, fontSize: 36, fontWeight: 800, margin: '32px 0 0', lineHeight: 1.05, letterSpacing: -0.5 }}>
        You're all set.
      </h1>
      <p style={{ fontSize: 17, color: t.inkSoft, marginTop: 8, maxWidth: 280, lineHeight: 1.5 }}>
        {role === 'patient'
          ? 'Memora will greet you each morning and remember what matters.'
          : 'You can now see how Rahim is doing — anytime, anywhere.'}
      </p>
    </div>
  );
}

// ─── Form field helper ───
function Field({ t, f, label, value, onChange, icon, type }) {
  return (
    <div style={{
      background: t.surface, border: `1.5px solid ${t.border}`,
      borderRadius: 14, padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {icon && <Icon name={icon} size={22} stroke={t.inkSoft}/>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: t.inkSoft, fontWeight: 600, letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
        <input
          type={type || 'text'}
          value={value}
          onChange={e => onChange && onChange(e.target.value)}
          style={{
            border: 'none', background: 'transparent', outline: 'none',
            fontFamily: f.body, fontSize: 17, color: t.ink, fontWeight: 600,
            width: '100%', padding: 0, marginTop: 2,
          }}/>
      </div>
    </div>
  );
}

Object.assign(window, {
  WelcomeScreen, LoginScreen, RegisterScreen, Field,
});
