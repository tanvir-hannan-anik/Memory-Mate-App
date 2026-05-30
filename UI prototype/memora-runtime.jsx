// Memora runtime — full app with auth, profile, transcript, both perspectives

const MEMORA_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "teal",
  "font": "rounded",
  "scale": "cozy",
  "iconStyle": "outline"
}/*EDITMODE-END*/;

// ─── Top-level state machine: auth → role → main ───
function MemoraRuntime() {
  const [tw, setTweak] = useTweaks(MEMORA_TWEAK_DEFAULTS);
  const t = THEMES[tw.theme] || THEMES.teal;
  const f = FONTS[tw.font] || FONTS.rounded;
  const s = SCALE[tw.scale] || SCALE.cozy;
  const i = tw.iconStyle;

  // 'welcome' | 'login' | 'register' | 'app'
  const [authStage, setAuthStage] = React.useState('welcome');
  // 'patient' | 'caregiver' — once signed in
  const [role, setRole] = React.useState('patient');
  // 'en' | 'bn' — global language for the whole app
  const [lang, setLang] = React.useState('en');

  const langCtx = React.useMemo(() => ({ lang, setLang }), [lang]);

  const signOut = () => setAuthStage('welcome');

  let content;
  if (authStage === 'welcome') {
    content = <WelcomeScreen t={t} f={f} s={s} i={i}
      onLogin={() => setAuthStage('login')}
      onRegister={() => setAuthStage('register')}/>;
  } else if (authStage === 'login') {
    content = <LoginScreen t={t} f={f} s={s} i={i}
      onBack={() => setAuthStage('welcome')}
      onLogin={() => { setRole('patient'); setAuthStage('app'); }}/>;
  } else if (authStage === 'register') {
    content = <RegisterScreen t={t} f={f} s={s} i={i}
      onBack={() => setAuthStage('welcome')}
      onComplete={(r) => { setRole(r || 'patient'); setAuthStage('app'); }}/>;
  } else {
    content = role === 'patient'
      ? <PatientApp t={t} f={f} s={s} i={i} onSignOut={signOut} onSwitchRole={() => setRole('caregiver')}/>
      : <CaregiverApp t={t} f={f} s={s} i={i} onSignOut={signOut} onSwitchRole={() => setRole('patient')}/>;
  }

  return (
    <LangCtx.Provider value={langCtx}>
    <div style={{
      minHeight: '100vh', width: '100%',
      background: `linear-gradient(160deg, ${t.bgWarm}, ${t.bg})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '24px 16px 60px', boxSizing: 'border-box',
      fontFamily: f.body,
    }}>
      {/* Header — only show when signed in */}
      {authStage === 'app' && (
        <div style={{ width: '100%', maxWidth: 900, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 10px ${t.accent}55` }}>
              <Icon name="sparkle" size={18} stroke="#fff" filled/>
            </div>
            <div>
              <div style={{ fontFamily: f.display, fontSize: 20, fontWeight: 800, color: t.ink, letterSpacing: -0.3 }}>Memora</div>
              <div style={{ fontSize: 12, color: t.inkSoft }}>{role === 'patient' ? 'Patient view · Rahim' : 'Caregiver view · Sara'}</div>
            </div>
          </div>

          <div style={{
            display: 'flex', background: t.surface, padding: 4, borderRadius: 16,
            border: `1px solid ${t.border}`, gap: 2,
          }}>
            {[
              { v: 'patient',   l: 'Patient' },
              { v: 'caregiver', l: 'Caregiver' },
            ].map(opt => {
              const a = role === opt.v;
              return (
                <button key={opt.v} onClick={() => setRole(opt.v)} style={{
                  background: a ? t.accent : 'transparent',
                  color: a ? '#fff' : t.inkSoft,
                  border: 'none', cursor: 'pointer',
                  padding: '8px 16px', borderRadius: 12,
                  fontFamily: f.body, fontSize: 13, fontWeight: 700,
                }}>{opt.l}</button>
              );
            })}
          </div>
        </div>
      )}

      {/* Phone frame */}
      <div style={{ position: 'relative', filter: 'drop-shadow(0 30px 60px rgba(30,30,30,0.18))' }}>
        <IOSDevice width={402} height={874} dark={false}>
          {content}
        </IOSDevice>
      </div>

      {authStage === 'app' && (
        <div style={{ marginTop: 18, fontSize: 13, color: t.inkSoft, textAlign: 'center', maxWidth: 420 }}>
          Switch <strong>Patient ↔ Caregiver</strong> above · Bottom tabs to navigate · Tap a recording to see the transcript with voice & emotion · Tweaks for themes.
        </div>
      )}

      {/* Tweaks */}
      <TweaksPanel title="Memora theme">
        <TweakSection label="Color theme"/>
        <TweakRadio label="Palette" value={tw.theme}
          options={['teal', 'indigo', 'sage']}
          onChange={v => setTweak('theme', v)}/>
        <div style={{ padding: '4px 14px 12px', display: 'flex', gap: 6 }}>
          {Object.entries(THEMES).map(([k, th]) => (
            <button key={k} onClick={() => setTweak('theme', k)} style={{
              flex: 1, padding: 6, borderRadius: 8, cursor: 'pointer',
              background: th.bg, border: `2px solid ${tw.theme === k ? th.accent : '#ddd'}`,
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ display: 'flex', gap: 3 }}>
                <div style={{ flex: 1, height: 14, borderRadius: 3, background: th.accent }}/>
                <div style={{ flex: 1, height: 14, borderRadius: 3, background: th.accentSoft }}/>
                <div style={{ flex: 1, height: 14, borderRadius: 3, background: th.bgWarm }}/>
              </div>
              <div style={{ fontSize: 10, color: '#555', fontWeight: 600 }}>{th.name}</div>
            </button>
          ))}
        </div>

        <TweakSection label="Type & layout"/>
        <TweakRadio label="Font" value={tw.font}
          options={['rounded', 'classic', 'modern']}
          onChange={v => setTweak('font', v)}/>
        <TweakRadio label="Density" value={tw.scale}
          options={['cozy', 'compact']}
          onChange={v => setTweak('scale', v)}/>
        <TweakRadio label="Icons" value={tw.iconStyle}
          options={['outline', 'filled']}
          onChange={v => setTweak('iconStyle', v)}/>
      </TweaksPanel>
    </div>
    </LangCtx.Provider>
  );
}

// ─── Shared TabBar ───
function TabBar({ tabs, active, onChange, t, f, i }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
      background: t.surface, borderTop: `1px solid ${t.border}`,
      padding: '10px 0 36px',
      display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
      fontFamily: f.body,
    }}>
      {tabs.map(tab => {
        const a = tab.id === active;
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '4px 0', color: a ? t.accent : t.inkMute,
          }}>
            <div style={{
              padding: '4px 14px', borderRadius: 16,
              background: a ? t.accentSoft : 'transparent',
            }}>
              <Icon name={tab.icon} size={22} stroke={a ? t.accent : t.inkMute} filled={a && i === 'filled'}/>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>{tab.label}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── PATIENT APP ───
function PatientApp({ t, f, s, i, onSignOut, onSwitchRole }) {
  const tr = useTr();
  const [tab, setTab] = React.useState('home');
  const [transcriptId, setTranscriptId] = React.useState(null);
  const [emergency, setEmergency] = React.useState('none'); // none | idle | active
  const [briefingDone, setBriefingDone] = React.useState(false);
  const [confirmFlash, setConfirmFlash] = React.useState(false);

  const tabs = [
    { id: 'home',    icon: 'sun',      label: tr('Today',    'আজ') },
    { id: 'recs',    icon: 'mic',      label: tr('Memories', 'স্মৃতি') },
    { id: 'chat',    icon: 'chat',     label: tr('Memora',   'মেমোরা') },
    { id: 'plans',   icon: 'calendar', label: tr('Plans',    'পরিকল্পনা') },
    { id: 'profile', icon: 'user',     label: tr('You',      'তুমি') },
  ];

  // Emergency overlay takes over everything
  if (emergency === 'idle') {
    return <PatientEmergencyIdle t={t} f={f} s={s} i={i} onActivate={() => setEmergency('active')}/>;
  }
  if (emergency === 'active') {
    return <PatientEmergencyActive t={t} f={f} s={s} i={i} onDismiss={() => setEmergency('none')}/>;
  }

  // Transcript view inside Memories tab
  if (tab === 'recs' && transcriptId) {
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <TranscriptScreen t={t} f={f} s={s} i={i} recordingId={transcriptId} onBack={() => setTranscriptId(null)}/>
      </div>
    );
  }

  let ScreenEl;
  switch (tab) {
    case 'home':
      ScreenEl = <PatientHome t={t} f={f} s={s} i={i}
        done={briefingDone}
        onUnderstand={() => { setBriefingDone(true); setConfirmFlash(true); setTimeout(() => setConfirmFlash(false), 1800); }}/>;
      break;
    case 'recs':
      ScreenEl = <RecordingsList t={t} f={f} s={s} i={i} onOpen={setTranscriptId}/>;
      break;
    case 'chat':
      ScreenEl = <PatientChat t={t} f={f} s={s} i={i}/>;
      break;
    case 'plans':
      ScreenEl = <PatientPlan t={t} f={f} s={s} i={i}/>;
      break;
    case 'profile':
      ScreenEl = <PatientProfile t={t} f={f} s={s} i={i} onSignOut={onSignOut}/>;
      break;
    default:
      ScreenEl = <PatientHome t={t} f={f} s={s} i={i}/>;
  }

  return (
    <div style={{ position: 'absolute', inset: 0, paddingBottom: 88 }}>
      {ScreenEl}

      {/* Floating emergency button — always visible in patient view */}
      <button onClick={() => setEmergency('idle')} style={{
        position: 'absolute', right: 18, bottom: 110,
        width: 60, height: 60, borderRadius: 30,
        background: `radial-gradient(circle at 35% 30%, ${t.accent}, ${t.accentInk})`,
        border: '3px solid #fff', cursor: 'pointer', zIndex: 40,
        boxShadow: `0 10px 26px ${t.accent}66`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'memora-pulse 2.4s ease-in-out infinite',
      }}>
        <Icon name="shield" size={26} stroke="#fff" filled={i === 'filled'}/>
      </button>

      <TabBar tabs={tabs} active={tab} onChange={(id) => { setTab(id); setTranscriptId(null); }} t={t} f={f} i={i}/>

      {confirmFlash && (
        <div style={{
          position: 'absolute', bottom: 180, left: '50%', transform: 'translateX(-50%)',
          background: t.good, color: '#fff', padding: '12px 22px', borderRadius: 24,
          fontFamily: f.display, fontSize: 17, fontWeight: 700, zIndex: 50,
          boxShadow: `0 8px 22px ${t.good}55`, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="check" size={20} stroke="#fff"/> Got it — have a good day!
        </div>
      )}
    </div>
  );
}

// ─── CAREGIVER APP ───
function CaregiverApp({ t, f, s, i, onSignOut, onSwitchRole }) {
  const tr = useTr();
  const [tab, setTab] = React.useState('home');
  const [transcriptId, setTranscriptId] = React.useState(null);

  const tabs = [
    { id: 'home',    icon: 'home',     label: tr('Home',    'হোম') },
    { id: 'map',     icon: 'map',      label: tr('Map',     'ম্যাপ') },
    { id: 'logs',    icon: 'mic',      label: tr('Logs',    'লগ') },
    { id: 'remind',  icon: 'bell',     label: tr('Remind',  'রিমাইন্ডার') },
    { id: 'profile', icon: 'user',     label: tr('You',     'তুমি') },
  ];

  // Transcript inside Logs
  if (tab === 'logs' && transcriptId) {
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <TranscriptScreen t={t} f={f} s={s} i={i} recordingId={transcriptId} onBack={() => setTranscriptId(null)}/>
      </div>
    );
  }

  let ScreenEl;
  switch (tab) {
    case 'home':    ScreenEl = <CareDashboard t={t} f={f} s={s} i={i}/>; break;
    case 'map':     ScreenEl = <CareLocation  t={t} f={f} s={s} i={i}/>; break;
    case 'logs':    ScreenEl = <CaregiverLogsView t={t} f={f} s={s} i={i} onOpen={setTranscriptId}/>; break;
    case 'remind':  ScreenEl = <CareReminder  t={t} f={f} s={s} i={i}/>; break;
    case 'profile': ScreenEl = <CaregiverProfile t={t} f={f} s={s} i={i} onSignOut={onSignOut}/>; break;
    default:        ScreenEl = <CareDashboard t={t} f={f} s={s} i={i}/>;
  }

  return (
    <div style={{ position: 'absolute', inset: 0, paddingBottom: 88 }}>
      {ScreenEl}
      <TabBar tabs={tabs} active={tab} onChange={(id) => { setTab(id); setTranscriptId(null); }} t={t} f={f} i={i}/>
    </div>
  );
}

// Caregiver Logs combines old CareLogs view + RecordingsList behavior (open transcript)
function CaregiverLogsView({ t, f, s, i, onOpen }) {
  // Reuse RecordingsList — same source of truth
  return <RecordingsList t={t} f={f} s={s} i={i} onOpen={onOpen}/>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<MemoraRuntime/>);
