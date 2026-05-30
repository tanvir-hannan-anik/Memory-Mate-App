// Caregiver screens — denser dashboard
// Consumes same { t, f, s, i } theme tokens

function CSection({ title, action, t, f, children, style }) {
  return (
    <div style={{ marginBottom: 18, ...style }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 8px' }}>
          <h3 style={{ fontFamily: f.display, fontSize: 15, fontWeight: 700, color: t.inkSoft, letterSpacing: 0.5, margin: 0, textTransform: 'uppercase' }}>{title}</h3>
          {action && <span style={{ fontSize: 14, color: t.accent, fontWeight: 600 }}>{action}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

function CCard({ t, children, style }) {
  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: 18, padding: 16,
      boxShadow: '0 1px 3px rgba(43,32,14,0.04)', ...style,
    }}>{children}</div>
  );
}

// ─── 1. DASHBOARD ───
function CareDashboard({ t, f, s, i }) {
  const tr = useTr();
  return (
    <div style={{
      width: '100%', height: '100%',
      background: t.bg, color: t.ink, fontFamily: f.body,
      paddingTop: 54, paddingBottom: 78,
      overflow: 'auto',
    }}>
      {/* Top bar */}
      <div style={{ padding: '8px 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, color: t.inkMute, fontWeight: 600 }}>{tr('WED, MAY 27', 'বুধ, ২৭ মে')}</div>
          <h1 style={{ fontFamily: f.display, fontSize: 24, fontWeight: 700, margin: '2px 0 0', color: t.ink }}>{tr('Caring for Rahim', 'Rahim-এর যত্ন')}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: t.surface, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bell" size={20} stroke={t.ink} filled={i === 'filled'}/>
          </div>
          <Avatar name="Rahim Ahmed" size={40}/>
        </div>
      </div>

      {/* Status hero */}
      <div style={{ padding: '0 16px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${t.accent}, ${t.accentInk})`,
          borderRadius: 22, padding: 20, color: '#fff',
          boxShadow: `0 10px 28px ${t.accent}33`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name="Rahim Ahmed" size={56} bg="rgba(255,255,255,0.18)" fg="#fff"/>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: '#7DDFA0', boxShadow: '0 0 0 4px rgba(125,223,160,0.25)' }}/>
                <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600, letterSpacing: 0.4 }}>{tr('ACTIVE · ON TRACK', 'সক্রিয় · সব ঠিক')}</div>
              </div>
              <div style={{ fontFamily: f.display, fontSize: 20, fontWeight: 700, marginTop: 4 }}>Briefing confirmed 7:42 AM</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 600 }}>LOCATION</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>At home</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 600 }}>NEXT</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>Blue pill · 11:00</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: '18px 16px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { ic: 'bell',     l: tr('Remind',   'রিমাইন্ড') },
          { ic: 'chat',     l: tr('Message',  'বার্তা') },
          { ic: 'mic',      l: tr('Logs',     'লগ') },
          { ic: 'phone',    l: tr('Contacts', 'যোগাযোগ') },
        ].map(a => (
          <div key={a.l} style={{
            background: t.surface, border: `1px solid ${t.border}`,
            borderRadius: 16, padding: '12px 4px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}>
            <Icon name={a.ic} size={22} stroke={t.accent} filled={i === 'filled'}/>
            <div style={{ fontSize: 12, color: t.ink, fontWeight: 600 }}>{a.l}</div>
          </div>
        ))}
      </div>

      {/* Today */}
      <div style={{ paddingTop: 18 }}>
        <CSection t={t} f={f} title="Today's progress" action="See all">
          <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { v: '3/6', l: 'Reminders', c: t.good },
              { v: '2', l: 'Recordings', c: t.accent },
              { v: '0', l: 'Alerts', c: t.inkMute },
            ].map(m => (
              <CCard key={m.l} t={t} style={{ padding: 12 }}>
                <div style={{ fontFamily: f.display, fontSize: 26, fontWeight: 700, color: m.c }}>{m.v}</div>
                <div style={{ fontSize: 12, color: t.inkSoft, fontWeight: 600, marginTop: 2 }}>{m.l}</div>
              </CCard>
            ))}
          </div>
        </CSection>

        {/* Activity feed */}
        <CSection t={t} f={f} title={tr('Activity', 'কার্যকলাপ')}>
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { t: '11:02', label: 'Sara called Rahim · 4 min',          ic: 'phone', tone: 'good' },
              { t: '10:30', label: 'Conversation recorded · 1 min 12 s', ic: 'mic',   tone: 'accent' },
              { t: '9:00',  label: 'Reminder missed · Morning walk',     ic: 'walk',  tone: 'warn' },
              { t: '7:42',  label: 'Morning briefing confirmed',          ic: 'sun',   tone: 'good' },
            ].map((e, idx) => {
              const tones = {
                good:   [t.goodSoft,   t.good],
                accent: [t.accentSoft, t.accentInk],
                warn:   [t.warnSoft,   t.warn],
              };
              const [bg, fg] = tones[e.tone];
              return (
                <CCard key={idx} t={t} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={e.ic} size={20} stroke={fg} filled={i === 'filled'}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: t.ink, fontWeight: 600 }}>{e.label}</div>
                  </div>
                  <div style={{ fontSize: 12, color: t.inkMute, fontVariantNumeric: 'tabular-nums' }}>{e.t}</div>
                </CCard>
              );
            })}
          </div>
        </CSection>
      </div>

      {/* Bottom tab bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: t.surface, borderTop: `1px solid ${t.border}`,
        padding: '8px 0 36px',
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
      }}>
        {[
          { ic: 'home',     l: 'Home',     active: true },
          { ic: 'map',      l: 'Location' },
          { ic: 'bell',     l: 'Reminders' },
          { ic: 'mic',      l: 'Logs' },
          { ic: 'settings', l: 'Settings' },
        ].map(it => (
          <div key={it.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <Icon name={it.ic} size={22} stroke={it.active ? t.accent : t.inkMute} filled={it.active && i === 'filled'}/>
            <div style={{ fontSize: 11, color: it.active ? t.accent : t.inkMute, fontWeight: 600 }}>{it.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 2. GPS / LOCATION ───
function CareLocation({ t, f, s, i }) {
  return (
    <div style={{ width: '100%', height: '100%', background: t.bg, fontFamily: f.body, paddingTop: 54, position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name="Rahim Ahmed" size={40}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: f.display, fontSize: 18, fontWeight: 700 }}>Rahim · At home</div>
          <div style={{ fontSize: 13, color: t.good, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: t.good }}/>
            Inside safe zone
          </div>
        </div>
        <Icon name="settings" size={22} stroke={t.inkSoft} filled={i === 'filled'}/>
      </div>

      {/* Map */}
      <div style={{
        margin: '0 16px', height: 360, borderRadius: 22, position: 'relative',
        background: `
          radial-gradient(circle at 30% 40%, ${t.goodSoft}, transparent 40%),
          radial-gradient(circle at 70% 60%, ${t.accentSoft}, transparent 35%),
          linear-gradient(135deg, ${t.bgWarm}, ${t.bg})
        `,
        border: `1px solid ${t.border}`,
        overflow: 'hidden',
      }}>
        {/* Grid lines as map */}
        <svg viewBox="0 0 300 360" width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
          <defs>
            <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M0 40h40M40 0v40" stroke={t.border} strokeWidth="1" fill="none"/>
            </pattern>
          </defs>
          <rect width="300" height="360" fill="url(#map-grid)"/>
          {/* Roads */}
          <path d="M0 180 Q150 160 300 200" stroke={t.inkMute} strokeWidth="3" fill="none" opacity="0.3"/>
          <path d="M120 0 L160 360" stroke={t.inkMute} strokeWidth="3" fill="none" opacity="0.3"/>
          <path d="M0 80 L300 100" stroke={t.inkMute} strokeWidth="2" fill="none" opacity="0.25"/>
        </svg>

        {/* Safe zone */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 220, height: 220, borderRadius: '50%',
          border: `2px dashed ${t.good}`,
          background: `${t.good}10`,
        }}/>
        {/* Pulse dot */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
          <div style={{
            position: 'absolute', inset: -16, borderRadius: '50%',
            background: t.accent, opacity: 0.25,
            animation: 'memora-ripple 2s ease-out infinite',
          }}/>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: t.accent, border: '3px solid #fff', boxShadow: `0 4px 10px ${t.accent}66`, position: 'relative' }}/>
        </div>

        {/* Floating call */}
        <button style={{
          position: 'absolute', right: 14, bottom: 14,
          width: 56, height: 56, borderRadius: 28,
          background: t.good, border: 'none', boxShadow: `0 8px 20px ${t.good}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="phone" size={24} stroke="#fff" filled/>
        </button>
      </div>

      {/* Timeline */}
      <div style={{ padding: '16px 16px' }}>
        <h3 style={{ fontFamily: f.display, fontSize: 15, fontWeight: 700, color: t.inkSoft, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Today</h3>
        <CCard t={t} style={{ padding: 14 }}>
          {[
            { time: '7:00 AM',  place: 'Home',     ic: 'home' },
            { time: '10:30 AM', place: 'Pharmacy', ic: 'pill' },
            { time: '11:15 AM', place: 'Home',     ic: 'home' },
          ].map((s, idx, a) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={s.ic} size={16} stroke={t.accent} filled={i === 'filled'}/>
              </div>
              <div style={{ flex: 1, fontSize: 15, color: t.ink, fontWeight: 600 }}>{s.place}</div>
              <div style={{ fontSize: 13, color: t.inkMute, fontVariantNumeric: 'tabular-nums' }}>{s.time}</div>
            </div>
          ))}
        </CCard>
      </div>
    </div>
  );
}

// ─── 3. ACTIVITY / CONVERSATION LOG ───
function CareLogs({ t, f, s, i }) {
  const items = [
    { t: '11:02 AM', dur: '4:12', speakers: ['Rahim', 'Sara'], summary: 'Sara reminded Rahim about lunch with Mira. He confirmed he remembered.', mood: 'warm' },
    { t: '10:30 AM', dur: '1:12', speakers: ['Rahim'], summary: 'Rahim spoke to himself about taking pills. Confirmed blue pill taken.', mood: 'calm' },
    { t: '9:15 AM',  dur: '2:48', speakers: ['Rahim', 'Mira'], summary: 'Friendly chat about gardening. Mentioned pain in left knee twice.', mood: 'warm', flag: true },
    { t: 'Yesterday', dur: '6:02', speakers: ['Rahim', 'Sara'], summary: 'Long call. Discussed Friday visit. Sara will bring groceries.', mood: 'calm' },
  ];
  const moods = { warm: t.warnSoft, calm: t.accentSoft, low: t.dangerSoft };
  return (
    <div style={{ width: '100%', height: '100%', background: t.bg, fontFamily: f.body, paddingTop: 54, paddingBottom: 30, overflow: 'auto' }}>
      <div style={{ padding: '8px 16px 14px' }}>
        <h1 style={{ fontFamily: f.display, fontSize: 24, fontWeight: 700, margin: 0 }}>Conversations</h1>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto' }}>
          {['All', 'Today', 'Family', 'Doctor', 'Flagged'].map((c, idx) => (
            <div key={c} style={{
              padding: '7px 14px', borderRadius: 18,
              background: idx === 0 ? t.ink : t.surface,
              color: idx === 0 ? t.bg : t.inkSoft,
              border: `1px solid ${idx === 0 ? t.ink : t.border}`,
              fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            }}>{c}</div>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, idx) => (
          <CCard key={idx} t={t} style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {it.speakers.map(sp => (
                  <Avatar key={sp} name={sp} size={26}/>
                ))}
                <div style={{ fontSize: 13, color: t.inkSoft, fontWeight: 600, marginLeft: 4 }}>{it.speakers.join(' & ')}</div>
              </div>
              <div style={{ fontSize: 12, color: t.inkMute, fontVariantNumeric: 'tabular-nums' }}>{it.t} · {it.dur}</div>
            </div>
            <div style={{ fontSize: 14, color: t.ink, lineHeight: 1.5, marginTop: 8 }}>
              {it.summary}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
              <div style={{
                fontSize: 11, fontWeight: 600,
                background: moods[it.mood], color: t.ink,
                padding: '4px 10px', borderRadius: 10,
              }}>
                {it.mood === 'warm' ? '◐ Warm' : it.mood === 'calm' ? '○ Calm' : '● Low'}
              </div>
              {it.flag && (
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  background: t.dangerSoft, color: t.danger,
                  padding: '4px 10px', borderRadius: 10,
                }}>⚠ Mentioned pain</div>
              )}
            </div>
          </CCard>
        ))}
      </div>
    </div>
  );
}

// ─── 4. REMINDER MANAGEMENT ───
function CareReminder({ t, f, s, i }) {
  return (
    <div style={{ width: '100%', height: '100%', background: t.bg, fontFamily: f.body, paddingTop: 54, paddingBottom: 30, overflow: 'auto' }}>
      <div style={{ padding: '8px 16px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: t.surface, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: t.inkSoft }}>‹</div>
        <h1 style={{ fontFamily: f.display, fontSize: 22, fontWeight: 700, margin: 0, flex: 1 }}>New reminder</h1>
        <div style={{ fontSize: 14, color: t.accent, fontWeight: 700 }}>Save</div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Type pills */}
        <div>
          <div style={{ fontSize: 12, color: t.inkSoft, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>TYPE</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { ic: 'pill',     l: 'Medicine', a: true },
              { ic: 'calendar', l: 'Visit' },
              { ic: 'walk',     l: 'Task' },
              { ic: 'phone',    l: 'Call' },
            ].map(opt => (
              <div key={opt.l} style={{
                background: opt.a ? t.accent : t.surface,
                color: opt.a ? '#fff' : t.ink,
                border: `1px solid ${opt.a ? t.accent : t.border}`,
                borderRadius: 14, padding: '12px 4px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <Icon name={opt.ic} size={20} stroke={opt.a ? '#fff' : t.ink} filled={i === 'filled'}/>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{opt.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Title input */}
        <CCard t={t} style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: t.inkSoft, fontWeight: 600 }}>TITLE</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginTop: 4, color: t.ink }}>
            Blue pill <span style={{ color: t.inkMute, fontWeight: 400 }}>(after breakfast)</span>
          </div>
        </CCard>

        {/* Schedule */}
        <CCard t={t} style={{ padding: 0 }}>
          <div style={{ padding: 14, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: t.inkSoft, fontWeight: 600 }}>RECURRING</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>Every day</div>
            </div>
            <div style={{ width: 48, height: 28, borderRadius: 14, background: t.accent, position: 'relative' }}>
              <div style={{ position: 'absolute', right: 2, top: 2, width: 24, height: 24, borderRadius: 12, background: '#fff' }}/>
            </div>
          </div>
          <div style={{ padding: 14, display: 'flex', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: t.inkSoft, fontWeight: 600 }}>TIME</div>
              <div style={{ fontFamily: f.display, fontSize: 24, fontWeight: 700, marginTop: 2, color: t.ink }}>8:30 AM</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: t.inkSoft, fontWeight: 600 }}>STARTS</div>
              <div style={{ fontFamily: f.display, fontSize: 24, fontWeight: 700, marginTop: 2, color: t.ink }}>Today</div>
            </div>
          </div>
        </CCard>

        {/* Delivery */}
        <div>
          <div style={{ fontSize: 12, color: t.inkSoft, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>DELIVERY</div>
          <CCard t={t} style={{ padding: 0 }}>
            {[
              { l: 'Push notification', on: true },
              { l: 'Voice in morning briefing', on: true },
              { l: 'SMS to caregiver if missed', on: false },
            ].map((row, idx, a) => (
              <div key={row.l} style={{
                padding: 14, display: 'flex', alignItems: 'center',
                borderBottom: idx < a.length - 1 ? `1px solid ${t.border}` : 'none',
              }}>
                <div style={{ flex: 1, fontSize: 15, color: t.ink, fontWeight: 500 }}>{row.l}</div>
                <div style={{
                  width: 44, height: 26, borderRadius: 13,
                  background: row.on ? t.accent : t.border, position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', top: 2,
                    [row.on ? 'right' : 'left']: 2,
                    width: 22, height: 22, borderRadius: 11, background: '#fff',
                  }}/>
                </div>
              </div>
            ))}
          </CCard>
        </div>
      </div>
    </div>
  );
}

// ─── 5. EMERGENCY ALERT ───
function CareAlert({ t, f, s, i }) {
  return (
    <div style={{ width: '100%', height: '100%', background: t.bg, fontFamily: f.body, paddingTop: 54, paddingBottom: 30, overflow: 'auto', position: 'relative' }}>
      {/* Red banner */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 54,
        background: t.danger, zIndex: 1,
      }}/>
      <div style={{
        background: `linear-gradient(180deg, ${t.danger}, ${t.danger}DD)`,
        padding: '16px 16px 20px', color: '#fff',
      }}>
        <div style={{ fontSize: 12, letterSpacing: 1.5, fontWeight: 700, opacity: 0.85 }}>EMERGENCY ALERT · 11:43 AM</div>
        <h1 style={{ fontFamily: f.display, fontSize: 26, fontWeight: 800, margin: '4px 0 0' }}>Rahim has left the safe zone</h1>
        <div style={{ fontSize: 14, marginTop: 6, opacity: 0.9 }}>2.4 km from home · last seen near Lake Road</div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Patient */}
        <CCard t={t} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14 }}>
          <Avatar name="Rahim Ahmed" size={56}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: f.display, fontSize: 18, fontWeight: 700 }}>Rahim Ahmed</div>
            <div style={{ fontSize: 13, color: t.inkSoft }}>72 · Mild dementia</div>
          </div>
          <Icon name="walk" size={28} stroke={t.danger} filled={i === 'filled'}/>
        </CCard>

        {/* Mini map */}
        <CCard t={t} style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            height: 140, position: 'relative',
            background: `
              radial-gradient(circle at 30% 60%, ${t.goodSoft}, transparent 35%),
              radial-gradient(circle at 75% 30%, ${t.dangerSoft}, transparent 35%),
              ${t.bgWarm}
            `,
          }}>
            <svg viewBox="0 0 300 140" width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
              <path d="M0 90 Q150 60 300 70" stroke={t.inkMute} strokeWidth="2.5" fill="none"/>
              <path d="M80 140 L160 0" stroke={t.inkMute} strokeWidth="2.5" fill="none"/>
            </svg>
            {/* Home */}
            <div style={{ position: 'absolute', left: '25%', top: '60%' }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: t.good, border: '2px solid #fff' }}/>
              <div style={{ fontSize: 11, color: t.inkSoft, marginTop: 2, fontWeight: 600 }}>Home</div>
            </div>
            {/* Patient */}
            <div style={{ position: 'absolute', left: '70%', top: '28%' }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: t.danger, border: '2px solid #fff', boxShadow: `0 0 0 6px ${t.danger}33` }}/>
              <div style={{ fontSize: 11, color: t.danger, marginTop: 2, fontWeight: 700 }}>Rahim</div>
            </div>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <line x1="28%" y1="64%" x2="73%" y2="32%" stroke={t.danger} strokeWidth="2" strokeDasharray="6 4"/>
            </svg>
          </div>
        </CCard>

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button style={{
            background: t.accent, color: '#fff', border: 'none',
            padding: '14px 0', borderRadius: 16, fontSize: 15, fontWeight: 700,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            fontFamily: f.body,
          }}>
            <Icon name="phone" size={22} stroke="#fff" filled/>
            Call Rahim
          </button>
          <button style={{
            background: t.danger, color: '#fff', border: 'none',
            padding: '14px 0', borderRadius: 16, fontSize: 15, fontWeight: 700,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            fontFamily: f.body,
          }}>
            <Icon name="shield" size={22} stroke="#fff" filled/>
            Call 999
          </button>
        </div>

        {/* Log */}
        <CCard t={t}>
          <div style={{ fontSize: 12, color: t.inkSoft, fontWeight: 700, letterSpacing: 0.5 }}>WHY THIS ALERT</div>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              '11:41 AM — Left safe-zone radius',
              '11:38 AM — Walking pace detected',
              '11:30 AM — Did not respond to lunch reminder',
            ].map(l => (
              <div key={l} style={{ display: 'flex', gap: 8, fontSize: 13, color: t.ink }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: t.danger, marginTop: 7, flexShrink: 0 }}/>
                <span>{l}</span>
              </div>
            ))}
          </div>
        </CCard>
      </div>
    </div>
  );
}

Object.assign(window, {
  CareDashboard, CareLocation, CareLogs, CareReminder, CareAlert,
  CSection, CCard,
});
