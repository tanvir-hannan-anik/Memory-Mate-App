// Main app — composes all screens on a design canvas
// with a Tweaks panel for theme / font / layout / icons.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "teal",
  "font": "rounded",
  "scale": "cozy",
  "iconStyle": "outline"
}/*EDITMODE-END*/;

function MemoraApp() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const t = THEMES[tw.theme] || THEMES.teal;
  const f = FONTS[tw.font] || FONTS.rounded;
  const s = SCALE[tw.scale] || SCALE.cozy;
  const i = tw.iconStyle;

  // Helper: wrap a screen in an iOS device
  const phone = (Screen, extra = {}) => (
    <IOSDevice width={402} height={874} dark={false}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <Screen t={t} f={f} s={s} i={i} {...extra}/>
      </div>
    </IOSDevice>
  );

  return (
    <React.Fragment>
      <DesignCanvas>
        <DCSection id="intro" title="Memora — Dementia care app"
          subtitle="A calm, clear, trustworthy memory companion. Patient screens are large-touch and warm. Caregiver screens are denser. Use Tweaks to switch theme, font, layout and icons.">
          <DCArtboard id="cover" label="System overview" width={680} height={874}>
            <CoverCard t={t} f={f} s={s}/>
          </DCArtboard>
        </DCSection>

        <DCSection id="patient" title="Patient — for Rahim"
          subtitle="Large text. One task per screen. No icons without labels. Voice-first.">
          <DCArtboard id="p-home"  label="01 · Morning briefing" width={402} height={874}>{phone(PatientHome)}</DCArtboard>
          <DCArtboard id="p-em1"   label="02 · Emergency button" width={402} height={874}>{phone(PatientEmergencyIdle)}</DCArtboard>
          <DCArtboard id="p-em2"   label="03 · Grounding card"   width={402} height={874}>{phone(PatientEmergencyActive)}</DCArtboard>
          <DCArtboard id="p-chat"  label="04 · Memory chat"      width={402} height={874}>{phone(PatientChat)}</DCArtboard>
          <DCArtboard id="p-plan"  label="05 · Today's plan"     width={402} height={874}>{phone(PatientPlan)}</DCArtboard>
          <DCArtboard id="p-rec"   label="06 · Record"           width={402} height={874}>{phone(PatientRecord)}</DCArtboard>
        </DCSection>

        <DCSection id="caregiver" title="Caregiver — for Sara"
          subtitle="Information-dense dashboard. Standard touch sizes. Quick glance-able.">
          <DCArtboard id="c-home"  label="01 · Dashboard"        width={402} height={874}>{phone(CareDashboard)}</DCArtboard>
          <DCArtboard id="c-loc"   label="02 · Location"         width={402} height={874}>{phone(CareLocation)}</DCArtboard>
          <DCArtboard id="c-logs"  label="03 · Conversations"    width={402} height={874}>{phone(CareLogs)}</DCArtboard>
          <DCArtboard id="c-rem"   label="04 · New reminder"     width={402} height={874}>{phone(CareReminder)}</DCArtboard>
          <DCArtboard id="c-alert" label="05 · Emergency alert"  width={402} height={874}>{phone(CareAlert)}</DCArtboard>
        </DCSection>

        <DCSection id="system" title="Design system"
          subtitle="Tokens that drive every screen. All four tweak dimensions visible at once.">
          <DCArtboard id="palette" label="Color · Type · Spacing" width={880} height={540}>
            <TokensCard t={t} f={f} s={s} i={i} themeName={tw.theme}/>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      {/* Tweaks panel */}
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
    </React.Fragment>
  );
}

// ─── Cover artboard ───
function CoverCard({ t, f, s }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: `linear-gradient(160deg, ${t.bgWarm}, ${t.bg})`,
      borderRadius: 18, padding: 36, display: 'flex', flexDirection: 'column',
      fontFamily: f.body, color: t.ink,
      border: `1px solid ${t.border}`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -60, right: -60, width: 280, height: 280, borderRadius: '50%', background: `${t.accent}10` }}/>
      <div style={{ position: 'absolute', bottom: -80, left: -40, width: 240, height: 240, borderRadius: '50%', background: `${t.accentSoft}` }}/>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 16, background: t.accent, color: '#fff', fontSize: 13, fontWeight: 700,
        }}>
          <Icon name="sparkle" size={16} stroke="#fff" filled/> Memora
        </div>
        <h1 style={{ fontFamily: f.display, fontSize: 64, lineHeight: 1, fontWeight: 800, margin: '24px 0 0', color: t.ink, letterSpacing: -1 }}>
          A gentle hand,<br/>
          <span style={{ color: t.accent }}>not a dashboard.</span>
        </h1>
        <p style={{ fontSize: 19, color: t.inkSoft, lineHeight: 1.55, marginTop: 18, maxWidth: 540 }}>
          A memory companion for people living with dementia, and the people who care for them.
          Two distinct interfaces. One calm philosophy.
        </p>
      </div>

      <div style={{ flex: 1 }}/>

      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          { tag: 'Patient', body: 'Warm, voice-first.\nMinimum 56px touch targets.\nOne task per screen.' },
          { tag: 'Caregiver', body: 'Glanceable status.\nReminder + location + alerts.\nRemote control of care.' },
        ].map(c => (
          <div key={c.tag} style={{
            background: t.surface, border: `1px solid ${t.border}`,
            borderRadius: 16, padding: 18,
          }}>
            <div style={{ fontSize: 12, color: t.accent, fontWeight: 700, letterSpacing: 1 }}>{c.tag.toUpperCase()}</div>
            <div style={{ fontSize: 14, color: t.ink, lineHeight: 1.5, marginTop: 6, whiteSpace: 'pre-line' }}>{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tokens artboard ───
function TokensCard({ t, f, s, i, themeName }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg,
      borderRadius: 18, padding: 28,
      fontFamily: f.body, color: t.ink,
      border: `1px solid ${t.border}`,
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
    }}>
      <div>
        <h3 style={{ fontFamily: f.display, fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: t.inkMute, margin: 0 }}>Palette · {t.name}</h3>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            ['bg', t.bg], ['bgWarm', t.bgWarm], ['surface', t.surface], ['border', t.border],
            ['ink', t.ink], ['inkSoft', t.inkSoft], ['inkMute', t.inkMute], ['accent', t.accent],
            ['accentSoft', t.accentSoft], ['good', t.good], ['warn', t.warn], ['danger', t.danger],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ height: 44, borderRadius: 8, background: v, border: `1px solid ${t.border}` }}/>
              <div style={{ fontSize: 10, fontWeight: 600, marginTop: 4 }}>{k}</div>
              <div style={{ fontSize: 9, color: t.inkMute, fontFamily: 'ui-monospace, monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        <h3 style={{ fontFamily: f.display, fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: t.inkMute, margin: '20px 0 8px' }}>Spacing & radius</h3>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          {[8, 12, 18, 24, 32].map(v => (
            <div key={v} style={{ textAlign: 'center' }}>
              <div style={{ width: v, height: v, background: t.accent, borderRadius: v/4 }}/>
              <div style={{ fontSize: 10, color: t.inkSoft, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ fontFamily: f.display, fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: t.inkMute, margin: 0 }}>Type — {f.name}</h3>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: f.display, fontSize: 44, fontWeight: 800, lineHeight: 1.1, color: t.ink }}>Good morning</div>
          <div style={{ fontFamily: f.display, fontSize: 28, fontWeight: 700, color: t.accent, marginTop: 8 }}>I need help</div>
          <div style={{ fontSize: 18, color: t.ink, marginTop: 10, lineHeight: 1.5 }}>
            Body — large enough for older readers. 1.5 line height. Never below 18px on patient screens.
          </div>
          <div style={{ fontSize: 13, color: t.inkSoft, marginTop: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Caption / Label</div>
        </div>

        <h3 style={{ fontFamily: f.display, fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: t.inkMute, margin: '20px 0 8px' }}>Icons — {i}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {['sun', 'pill', 'phone', 'walk', 'heart', 'speaker', 'mic', 'chat', 'calendar', 'home', 'map', 'shield'].map(n => (
            <div key={n} style={{
              aspectRatio: '1', borderRadius: 12,
              background: t.surface, border: `1px solid ${t.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={n} size={22} stroke={t.accent} filled={i === 'filled'}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<MemoraApp/>);
