// Patient screens — minimal, calm, large-touch
// All consume `t` (theme), `f` (font), `s` (scale), `i` (icon style)

// ─── Shared bits ───
function ScreenShell({ t, f, s, children, bg }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: bg || t.bg,
      color: t.ink,
      fontFamily: f.body,
      paddingTop: 54, // status bar
      paddingBottom: 34,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>{children}</div>
  );
}

function Card({ t, s, children, style, accent }) {
  return (
    <div style={{
      background: t.surface,
      border: `1.5px solid ${accent ? t.accent : t.border}`,
      borderRadius: s.radius,
      padding: s.padding,
      boxShadow: '0 2px 6px rgba(43, 32, 14, 0.04)',
      ...style,
    }}>{children}</div>
  );
}

function BigButton({ t, s, f, children, kind = 'primary', icon, onClick, style }) {
  const colors = {
    primary: { bg: t.accent, fg: '#fff', bd: t.accent },
    ghost:   { bg: 'transparent', fg: t.accent, bd: t.accent },
    danger:  { bg: t.danger, fg: '#fff', bd: t.danger },
    soft:    { bg: t.accentSoft, fg: t.accentInk, bd: t.accentSoft },
  }[kind];
  return (
    <button onClick={onClick} style={{
      width: '100%', minHeight: s.touch, padding: '0 22px',
      borderRadius: s.radius,
      background: colors.bg, color: colors.fg,
      border: `1.5px solid ${colors.bd}`,
      fontFamily: f.display, fontSize: s.body, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      cursor: 'pointer', ...style,
    }}>
      {icon && <Icon name={icon} size={26} stroke={colors.fg} filled={false}/>}
      {children}
    </button>
  );
}

// ─── 1. HOME / DAILY BRIEFING ───
function PatientHome({ t, f, s, i, done, onUnderstand }) {
  const tr = useTr();
  const today = { day: tr('Wednesday', 'বুধবার'), date: '27', month: tr('May', 'মে'), year: '2026' };
  const items = [
    { icon: 'pill',     label: tr('Blue pill', 'নীল ওষুধ'),                sub: tr('After breakfast · with water', 'নাশতার পর · পানির সাথে'),     time: '8:30 AM', soon: false, done: true },
    { icon: 'phone',    label: tr('Sara will call', 'Sara ফোন করবে'),     sub: tr('Your daughter', 'তোমার মেয়ে'),                          time: '11:00',   soon: true,  done: false },
    { icon: 'walk',     label: tr('A short walk', 'একটু হাঁটা'),           sub: tr('In the garden, when sunny', 'বাগানে, যখন রোদ আছে'),       time: '2:00 PM', soon: false, done: false },
    { icon: 'coffee',   label: tr('Tea with Rina', 'Rina-র সাথে চা'),     sub: tr('She is coming over', 'সে বাসায় আসবে'),                  time: '4:00 PM', soon: false, done: false },
  ];
  return (
    <ScreenShell t={t} f={f} s={s} bg={t.bg}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* HERO greeting — large bold block */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: `linear-gradient(160deg, ${t.bgWarm}, ${t.bg})`,
          padding: `12px ${s.padding}px 28px`,
          borderBottom: `1px solid ${t.border}`,
        }}>
          {/* Decorative sun shape */}
          <div style={{
            position: 'absolute', top: -80, right: -80,
            width: 240, height: 240, borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, ${t.accentSoft}, transparent 70%)`,
          }}/>
          {/* Speaker pulse */}
          <div style={{ position: 'absolute', top: 16, right: 20, zIndex: 5 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 26,
              background: t.surface, border: `1.5px solid ${t.accent}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'memora-pulse 1.5s ease-in-out infinite',
            }}>
              <Icon name="speaker" size={26} stroke={t.accentInk} filled={i === 'filled'}/>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 14, letterSpacing: 1.5, color: t.accent, fontWeight: 700, textTransform: 'uppercase' }}>
              {tr('Good morning', 'সুপ্রভাত')}
            </div>
            <h1 style={{
              fontFamily: f.display, fontSize: 48, lineHeight: 0.98,
              margin: '8px 0 0', color: t.ink, fontWeight: 800, letterSpacing: -1.2,
            }}>
              {tr('Good morning,', 'সুপ্রভাত,')}<br/>
              <span style={{ color: t.accent }}>Rahim.</span>
            </h1>

            {/* Date strip */}
            <div style={{
              marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 14,
              padding: '14px 16px', borderRadius: 16,
              background: t.surface, border: `1.5px solid ${t.border}`,
            }}>
              <div style={{
                fontFamily: f.display, fontSize: 48, fontWeight: 800,
                color: t.accent, letterSpacing: -1.5, lineHeight: 1,
              }}>{today.date}</div>
              <div>
                <div style={{ fontFamily: f.display, fontSize: 18, fontWeight: 700, color: t.ink, lineHeight: 1.1 }}>
                  {today.day}
                </div>
                <div style={{ fontSize: 14, color: t.inkSoft, marginTop: 2 }}>
                  {today.month} {today.year}
                </div>
              </div>
              <div style={{ flex: 1 }}/>
              <div style={{
                background: t.goodSoft, color: t.good,
                padding: '4px 10px', borderRadius: 10,
                fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
              }}>● {tr('ALL WELL', 'সব প্রশান্ত')}</div>
            </div>
          </div>
        </div>

        {/* Briefing list */}
        <div style={{ padding: `${s.gap}px ${s.padding}px 0` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: t.inkMute, fontWeight: 700, letterSpacing: 1.5 }}>{tr('TODAY', 'আজ')} · {items.filter(it => !it.done).length} {tr('THINGS', 'কাজ')}</div>
            <div style={{ fontSize: 13, color: t.accent, fontWeight: 700 }}>{items.filter(it => it.done).length}/{items.length}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((it, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: 16,
                background: it.soon ? t.accentSoft : t.surface,
                border: `1.5px solid ${it.soon ? t.accent : t.border}`,
                borderRadius: s.radius,
                opacity: it.done ? 0.55 : 1,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                  background: it.done ? t.goodSoft : t.surface,
                  border: it.done ? `1.5px solid ${t.good}` : `1.5px solid ${t.accent}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {it.done
                    ? <Icon name="check" size={28} stroke={t.good}/>
                    : <Icon name={it.icon} size={28} stroke={t.accentInk} filled={i === 'filled'}/>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: s.body, fontWeight: 700, lineHeight: 1.2, color: t.ink,
                    textDecoration: it.done ? 'line-through' : 'none',
                  }}>{it.label}</div>
                  <div style={{ fontSize: 14, color: t.inkSoft, marginTop: 4, lineHeight: 1.35 }}>{it.sub}</div>
                </div>
                <div style={{
                  fontFamily: f.display, fontSize: 16, fontWeight: 700,
                  color: it.soon ? t.accent : t.inkSoft,
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'right', whiteSpace: 'nowrap',
                }}>{it.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 100 }}/>
      </div>

      {/* Bottom CTA */}
      <div style={{ padding: `12px ${s.padding}px 12px`, background: `linear-gradient(to top, ${t.bg} 70%, transparent)` }}>
        <BigButton t={t} f={f} s={s} icon={done ? 'check' : 'check'}
          kind={done ? 'soft' : 'primary'}
          onClick={onUnderstand}
          style={{ minHeight: 72, fontSize: s.body + 2 }}>
          {done ? tr('Got it · Have a lovely day', 'বুঝেছি · আনন্দদায়ক দিন কাটাও') : tr('I understand', 'বুঝেছি')}
        </BigButton>
      </div>
    </ScreenShell>
  );
}

// ─── 2a. EMERGENCY (idle button screen) ───
function PatientEmergencyIdle({ t, f, s, i, onActivate }) {
  const [holding, setHolding] = React.useState(false);
  const holdTimer = React.useRef(null);
  const start = () => {
    setHolding(true);
    holdTimer.current = setTimeout(() => { onActivate && onActivate(); setHolding(false); }, 700);
  };
  const cancel = () => { clearTimeout(holdTimer.current); setHolding(false); };
  return (
    <ScreenShell t={t} f={f} s={s} bg={t.bg}>
      <div style={{ padding: `12px ${s.padding}px`, textAlign: 'center' }}>
        <h2 style={{ fontFamily: f.display, fontSize: 22, color: t.inkSoft, fontWeight: 600, margin: '8px 0 0' }}>
          If you feel lost or scared
        </h2>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 24 }}>

        {/* Big circular button */}
        <div style={{ position: 'relative' }}>
          {/* Ripples */}
          <div style={{
            position: 'absolute', inset: -32, borderRadius: '50%',
            background: t.accent, opacity: 0.08,
            animation: 'memora-ripple 2.4s ease-out infinite',
          }}/>
          <div style={{
            position: 'absolute', inset: -16, borderRadius: '50%',
            background: t.accent, opacity: 0.14,
            animation: 'memora-ripple 2.4s ease-out infinite',
            animationDelay: '0.6s',
          }}/>
          <button
            onMouseDown={start} onMouseUp={cancel} onMouseLeave={cancel}
            onTouchStart={start} onTouchEnd={cancel}
            onClick={onActivate}
            style={{
            width: 240, height: 240, borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, ${t.accent}, ${t.accentInk})`,
            border: 'none', color: '#fff',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: `0 16px 40px ${t.accent}55, inset 0 -8px 20px rgba(0,0,0,0.15)`,
            cursor: 'pointer', position: 'relative',
            transform: holding ? 'scale(0.94)' : 'scale(1)',
            transition: 'transform 200ms ease-out',
          }}>
            <Icon name="shield" size={56} stroke="#fff" filled={i === 'filled'}/>
            <div style={{ fontFamily: f.display, fontSize: 26, fontWeight: 700, marginTop: 4 }}>I need help</div>
            <div style={{ fontSize: 15, opacity: 0.8 }}>সাহায্য দরকার</div>
          </button>
        </div>

        <p style={{
          marginTop: 40, color: t.inkSoft, fontSize: 18,
          textAlign: 'center', maxWidth: 280, lineHeight: 1.5,
        }}>
          Press and hold the button.<br/>
          We will help you remember where you are.
        </p>
      </div>

      <div style={{ padding: `0 ${s.padding}px 8px`, textAlign: 'center' }}>
        <div style={{ color: t.inkMute, fontSize: 14 }}>Works without internet</div>
      </div>
    </ScreenShell>
  );
}

// ─── 2b. EMERGENCY (grounding card active) ───
function PatientEmergencyActive({ t, f, s, i, onDismiss }) {
  // Live clock for grounding effect
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const hh = now.getHours();
  const greeting = hh < 12 ? 'Good morning' : hh < 17 ? 'Good afternoon' : 'Good evening';
  const timeStr = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: t.bg, color: t.ink, fontFamily: f.body,
      paddingTop: 54, paddingBottom: 30,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Reassurance band */}
      <div style={{
        background: `linear-gradient(180deg, ${t.accent}, ${t.accentInk})`,
        padding: '14px 20px 18px',
        color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }}/>
        <div style={{ position: 'absolute', bottom: -50, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }}/>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 18,
            background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="shield" size={18} stroke="#fff" filled/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, letterSpacing: 1.5 }}>YOU ARE SAFE</div>
            <div style={{ fontFamily: f.display, fontSize: 18, fontWeight: 700 }}>Take a breath. We've got you.</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* IDENTITY HERO — big name + photo + age */}
        <div style={{
          background: t.surface, border: `2px solid ${t.accent}`, borderRadius: 22, padding: 22,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 140, height: 140, borderRadius: '50%', background: t.accentSoft }}/>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 90, height: 90, borderRadius: 45,
              background: `linear-gradient(135deg, ${SPEAKER_COLORS.Rahim.ring}, ${SPEAKER_COLORS.Rahim.fg})`,
              color: '#fff', fontSize: 38, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `4px solid ${t.surface}`, fontFamily: f.display, flexShrink: 0,
              boxShadow: `0 6px 16px ${t.accent}33`,
            }}>র</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1.5 }}>YOU ARE</div>
              <div style={{
                fontFamily: f.display, fontSize: 30, fontWeight: 800,
                color: t.ink, lineHeight: 1, marginTop: 2, letterSpacing: -0.6,
              }}>Rahim Ahmed</div>
              <div style={{ fontSize: 15, color: t.inkSoft, marginTop: 4 }}>72 years old · বাংলা · English</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 8, padding: '4px 10px', borderRadius: 10,
                background: t.goodSoft, color: t.good,
                fontSize: 11, fontWeight: 700,
              }}>● Heart rate normal</div>
            </div>
          </div>
        </div>

        {/* GREETING + TIME ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
          <div style={{
            background: t.bgWarm, border: `1.5px solid ${t.border}`,
            borderRadius: 18, padding: 14,
          }}>
            <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1 }}>{greeting.toUpperCase()}</div>
            <div style={{ fontFamily: f.display, fontSize: 18, fontWeight: 700, color: t.ink, lineHeight: 1.15, marginTop: 2 }}>
              Wednesday<br/>May 27
            </div>
          </div>
          <div style={{
            background: t.bgWarm, border: `1.5px solid ${t.border}`,
            borderRadius: 18, padding: 14, textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1 }}>RIGHT NOW</div>
            <div style={{
              fontFamily: f.display, fontSize: 26, fontWeight: 800,
              color: t.accent, marginTop: 2, fontVariantNumeric: 'tabular-nums',
            }}>{timeStr}</div>
          </div>
        </div>

        {/* GPS — WHERE YOU ARE */}
        <div style={{
          background: t.surface, border: `1.5px solid ${t.border}`,
          borderRadius: 18, overflow: 'hidden',
        }}>
          {/* Mini map */}
          <div style={{
            height: 150, position: 'relative',
            background: `
              radial-gradient(circle at 50% 50%, ${t.goodSoft}, transparent 50%),
              radial-gradient(circle at 80% 25%, ${t.accentSoft}, transparent 35%),
              radial-gradient(circle at 20% 75%, ${t.bgWarm}, transparent 35%),
              ${t.bgWarm}
            `,
          }}>
            {/* Grid */}
            <svg viewBox="0 0 300 150" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.45 }}>
              <defs>
                <pattern id="grnd-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                  <path d="M0 36h36M36 0v36" stroke={t.border} strokeWidth="1" fill="none"/>
                </pattern>
              </defs>
              <rect width="300" height="150" fill="url(#grnd-grid)"/>
              <path d="M0 90 Q150 70 300 100" stroke={t.inkMute} strokeWidth="3" fill="none" opacity="0.35"/>
              <path d="M120 0 L160 150" stroke={t.inkMute} strokeWidth="3" fill="none" opacity="0.35"/>
              <path d="M0 50 L300 30" stroke={t.inkMute} strokeWidth="2" fill="none" opacity="0.25"/>
            </svg>

            {/* Safe zone ring */}
            <div style={{
              position: 'absolute', left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 130, height: 130, borderRadius: '50%',
              border: `2px dashed ${t.good}`,
              background: `${t.good}10`,
            }}/>

            {/* Location pin (you) */}
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
              <div style={{
                position: 'absolute', inset: -14, borderRadius: '50%',
                background: t.accent, opacity: 0.3,
                animation: 'memora-ripple 2s ease-out infinite',
              }}/>
              <div style={{
                width: 30, height: 30, borderRadius: 15,
                background: t.accent, border: '3px solid #fff',
                boxShadow: `0 4px 12px ${t.accent}66`, position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="home" size={14} stroke="#fff" filled/>
              </div>
            </div>

            {/* Inside safe zone badge */}
            <div style={{
              position: 'absolute', top: 10, left: 10,
              background: 'rgba(255,255,255,0.94)', border: `1.5px solid ${t.good}`,
              padding: '5px 10px', borderRadius: 12,
              fontSize: 11, color: t.good, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: t.good }}/>
              INSIDE SAFE ZONE
            </div>
          </div>

          {/* Location text */}
          <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="home" size={22} stroke={t.accentInk} filled={i === 'filled'}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1 }}>YOU ARE AT</div>
              <div style={{ fontFamily: f.display, fontSize: 22, fontWeight: 800, color: t.ink, letterSpacing: -0.3 }}>Home</div>
              <div style={{ fontSize: 14, color: t.inkSoft, marginTop: 1 }}>15/2 Lake Road, Dhaka · তুমি বাড়িতে আছো</div>
            </div>
          </div>
        </div>

        {/* AI DAY SUMMARY */}
        <div style={{
          background: t.accentSoft,
          border: `1.5px solid ${t.accent}55`,
          borderRadius: 18, padding: 16,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: t.surface, opacity: 0.35 }}/>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 14, background: t.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="sparkle" size={14} stroke="#fff" filled/>
              </div>
              <div style={{ fontSize: 11, color: t.accentInk, fontWeight: 800, letterSpacing: 1.5 }}>MEMORA'S DAY SUMMARY</div>
            </div>

            <div style={{
              fontFamily: f.display, fontSize: 17, color: t.ink, lineHeight: 1.55,
              marginTop: 10, fontWeight: 500,
            }}>
              You woke up well at <strong style={{ color: t.accent }}>7:30 AM</strong>.
              Your blue pill was taken at <strong style={{ color: t.accent }}>8:32 AM</strong>.
              Sara called this morning to remind you about lunch on Friday.
              You're at home, safe.
            </div>

            {/* Day tasks done/upcoming */}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { icon: 'check',    text: 'Breakfast at 8:00 AM',           done: true },
                { icon: 'check',    text: 'Blue pill taken at 8:32 AM',     done: true },
                { icon: 'phone',    text: 'Sara called at 11:02 AM',        done: true },
                { icon: 'coffee',   text: 'Tea with Rina at 4:00 PM',       done: false, soon: true },
                { icon: 'pill',     text: 'Evening pill at 8:00 PM',        done: false },
              ].map((task, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 10px', borderRadius: 10,
                  background: task.soon ? t.surface : 'transparent',
                  border: task.soon ? `1.5px solid ${t.accent}` : '1.5px solid transparent',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 11,
                    background: task.done ? t.good : (task.soon ? t.accent : 'transparent'),
                    border: task.done || task.soon ? 'none' : `1.5px solid ${t.inkMute}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {task.done && <Icon name="check" size={14} stroke="#fff"/>}
                    {task.soon && <Icon name={task.icon} size={12} stroke="#fff" filled/>}
                  </div>
                  <div style={{
                    flex: 1, fontSize: 14, color: t.ink,
                    fontWeight: task.soon ? 700 : 500,
                    textDecoration: task.done ? 'line-through' : 'none',
                    opacity: task.done ? 0.6 : 1,
                  }}>{task.text}</div>
                  {task.soon && (
                    <div style={{
                      fontSize: 10, fontWeight: 800, color: t.accent,
                      letterSpacing: 0.5,
                    }}>NEXT</div>
                  )}
                </div>
              ))}
            </div>

            {/* Listen button */}
            <button style={{
              marginTop: 12, width: '100%',
              background: t.accent, color: '#fff', border: 'none', cursor: 'pointer',
              padding: '10px 16px', borderRadius: 14,
              fontFamily: f.body, fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Icon name="speaker" size={18} stroke="#fff" filled/>
              Read this to me · আমাকে শোনাও
            </button>
          </div>
        </div>

        {/* CALL CONTACTS — quick reach */}
        <div>
          <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>SOMEONE WHO LOVES YOU</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { name: 'Sara',   rel: 'Daughter', col: SPEAKER_COLORS.Sara,  primary: true },
              { name: 'Mira',   rel: 'Niece',    col: SPEAKER_COLORS.Mira,  primary: false },
            ].map(c => (
              <button key={c.name} style={{
                background: c.primary ? t.surface : t.surface,
                border: c.primary ? `2px solid ${t.good}` : `1.5px solid ${t.border}`,
                borderRadius: 16, padding: 14, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                fontFamily: f.body,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 26,
                  background: c.col.ring, color: '#fff', fontSize: 22, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{c.name[0]}</div>
                <div>
                  <div style={{ fontFamily: f.display, fontSize: 17, fontWeight: 700, color: t.ink, textAlign: 'center' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: t.inkSoft, textAlign: 'center' }}>{c.rel}</div>
                </div>
                <div style={{
                  background: c.primary ? t.good : t.accentSoft,
                  color: c.primary ? '#fff' : t.accentInk,
                  padding: '6px 14px', borderRadius: 12,
                  fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <Icon name="phone" size={14} stroke={c.primary ? '#fff' : t.accentInk} filled/> Call
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Footer dismiss */}
      <div style={{ padding: '8px 16px 0', textAlign: 'center', borderTop: `1px solid ${t.border}`, background: t.bg }}>
        <a onClick={onDismiss} style={{
          display: 'inline-block', padding: '14px 24px',
          color: t.inkSoft, fontSize: 16, fontWeight: 600, cursor: 'pointer',
        }}>I'm okay now <span style={{ color: t.accent, fontWeight: 700 }}>→</span></a>
      </div>
    </div>
  );
}

// ─── 3. RECORD ───
function PatientRecord({ t, f, s, i, recording: recordingProp, onToggle }) {
  const [recordingState, setRecordingState] = React.useState(recordingProp !== undefined ? recordingProp : false);
  const [secs, setSecs] = React.useState(47);
  const rec = recordingProp !== undefined ? recordingProp : recordingState;
  React.useEffect(() => {
    if (!rec) return;
    const id = setInterval(() => setSecs(x => x + 1), 1000);
    return () => clearInterval(id);
  }, [rec]);
  const toggle = () => { if (onToggle) onToggle(); else setRecordingState(s => !s); };
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return (
    <ScreenShell t={t} f={f} s={s} bg={t.bg}>
      <div style={{ padding: `16px ${s.padding}px`, textAlign: 'center' }}>
        <div style={{ fontFamily: f.display, fontSize: 22, color: t.inkSoft, lineHeight: 1.35 }}>
          {rec ? 'Recording…' : 'Talking with someone?'}<br/>
          <span style={{ color: t.ink, fontWeight: 700 }}>{rec ? 'Tap stop when done.' : 'Tap to record.'}</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
        {/* Waveform */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 60, opacity: rec ? 1 : 0.2 }}>
          {[14, 28, 44, 22, 52, 36, 18, 48, 30, 12, 40, 24, 50, 32, 16].map((h, idx) => (
            <div key={idx} style={{
              width: 5, height: h, borderRadius: 3, background: t.accent,
              animation: rec ? `memora-wave 1.${(idx*7)%9}s ease-in-out infinite` : 'none',
              animationDelay: `${idx * 0.07}s`,
            }}/>
          ))}
        </div>

        <button onClick={toggle} style={{
          width: 180, height: 180, borderRadius: '50%',
          background: rec
            ? `radial-gradient(circle at 35% 30%, #d94e3a, #8b2920)`
            : `radial-gradient(circle at 35% 30%, ${t.inkMute}, ${t.inkSoft})`,
          border: '6px solid #fff', cursor: 'pointer',
          boxShadow: rec ? '0 12px 40px rgba(139, 41, 32, 0.4)' : '0 6px 20px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 300ms ease',
        }}>
          {rec
            ? <div style={{ width: 56, height: 56, borderRadius: 10, background: '#fff' }}/>
            : <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fff' }}/>}
        </button>

        <div style={{ fontFamily: f.display, fontSize: 36, fontWeight: 700, color: rec ? t.ink : t.inkMute, fontVariantNumeric: 'tabular-nums' }}>
          {mm}:{ss}
        </div>
      </div>

      <div style={{ padding: s.padding }}>
        <BigButton t={t} f={f} s={s} kind={rec ? 'soft' : 'primary'} onClick={toggle} style={{ minHeight: 64 }}>
          {rec ? 'Stop and save' : 'Start recording'}
        </BigButton>
      </div>
    </ScreenShell>
  );
}

// ─── 4. CHATBOT ───
const CHAT_ANSWERS = {
  'Who called yesterday?': 'Your daughter Sara called at 6:30 PM. She asked how you slept and said she will visit on Friday.',
  'Where do I go today?': 'You are staying home today. Mira is coming for tea at 4:00 PM.',
  'Did I eat breakfast?': 'Yes — you had tea and toast at 7:50 AM this morning.',
  'Did I take my pills?': 'You took your blue pill at 8:32 AM. Your evening pill is due at 8:00 PM.',
};
function PatientChat({ t, f, s, i }) {
  const tr = useTr();
  const [msgs, setMsgs] = React.useState([
    { who: 'ai', text: 'Good morning, Rahim. How can I help you remember today?' },
    { who: 'me', text: 'Who called me yesterday?' },
    { who: 'ai', text: 'Your daughter Sara called at 6:30 PM. She asked about your medicine and said she will visit on Friday.' },
  ]);
  const [typing, setTyping] = React.useState(false);
  const ask = (q) => {
    setMsgs(m => [...m, { who: 'me', text: q }]);
    setTyping(true);
    setTimeout(() => {
      setMsgs(m => [...m, { who: 'ai', text: CHAT_ANSWERS[q] || "Let me check that for you." }]);
      setTyping(false);
    }, 900);
  };
  const suggestions = ['Who called yesterday?', 'Where do I go today?', 'Did I eat breakfast?', 'Did I take my pills?'];
  return (
    <ScreenShell t={t} f={f} s={s} bg={t.bg}>
      {/* Header */}
      <div style={{
        padding: `8px ${s.padding}px 12px`,
        borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 22,
          background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="sparkle" size={22} stroke="#fff" filled/>
        </div>
        <div>
          <div style={{ fontFamily: f.display, fontSize: 20, fontWeight: 700, color: t.ink }}>{tr('Memora', 'মেমোরা')}</div>
          <div style={{ fontSize: 13, color: t.good, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: t.good }}/>
            {tr('Listening', 'শুনছি')}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `${s.gap}px ${s.padding}px`, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {msgs.map((m, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: m.who === 'me' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '82%',
              background: m.who === 'me' ? t.accent : t.surface,
              color: m.who === 'me' ? '#fff' : t.ink,
              border: m.who === 'me' ? 'none' : `1.5px solid ${t.border}`,
              borderRadius: 22,
              borderBottomRightRadius: m.who === 'me' ? 6 : 22,
              borderBottomLeftRadius: m.who === 'ai' ? 6 : 22,
              padding: '14px 18px',
              fontSize: m.who === 'ai' ? 20 : 18,
              lineHeight: 1.55,
              fontWeight: m.who === 'ai' ? 500 : 600,
            }}>{m.text}</div>
          </div>
        ))}
        {/* Typing indicator */}
        {typing && (
        <div style={{ display: 'flex' }}>
          <div style={{
            background: t.surface, border: `1.5px solid ${t.border}`,
            borderRadius: 22, borderBottomLeftRadius: 6, padding: '14px 18px',
            display: 'flex', gap: 6,
          }}>
            {[0,1,2].map(d => (
              <div key={d} style={{
                width: 8, height: 8, borderRadius: 4, background: t.inkMute,
                animation: 'memora-dot 1.2s infinite', animationDelay: `${d*0.15}s`,
              }}/>
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Suggestions */}
      <div style={{ padding: `0 ${s.padding}px 10px`, display: 'flex', gap: 8, overflowX: 'auto' }}>
        {suggestions.map(q => (
          <button key={q} onClick={() => ask(q)} style={{
            flexShrink: 0, cursor: 'pointer',
            background: t.accentSoft, color: t.accentInk,
            border: `1.5px solid ${t.accent}33`,
            borderRadius: 24, padding: '10px 16px', fontSize: 15, fontWeight: 600,
            fontFamily: f.body,
          }}>{q}</button>
        ))}
      </div>

      {/* Voice input */}
      <div style={{ padding: `8px ${s.padding}px 12px`, display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{
          flex: 1, height: s.touch, borderRadius: s.touch/2,
          background: t.surface, border: `1.5px solid ${t.border}`,
          padding: '0 18px', display: 'flex', alignItems: 'center',
          color: t.inkMute, fontSize: 17,
        }}>
          {tr('Type here…', 'এখানে লেখো…')}
        </div>
        <button style={{
          width: s.touch, height: s.touch, borderRadius: s.touch/2,
          background: t.accent, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 6px 16px ${t.accent}55`,
        }}>
          <Icon name="mic" size={28} stroke="#fff" filled={i === 'filled'}/>
        </button>
      </div>
    </ScreenShell>
  );
}

// ─── 5. TODAY'S PLAN ───
// ─── 5. TODAY'S PLAN — stateful, add/delete, per-day ───

// Helpers for day handling
function pPad(n) { return String(n).padStart(2, '0'); }
function pIsoDate(d) { return `${d.getFullYear()}-${pPad(d.getMonth() + 1)}-${pPad(d.getDate())}`; }
function pAddDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function pFmtDay(d, tr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const x = new Date(d); x.setHours(0,0,0,0);
  const diff = Math.round((x - today) / 86400000);
  if (diff === 0) return tr('Today', 'আজ');
  if (diff === 1) return tr('Tomorrow', 'আগামীকাল');
  if (diff === -1) return tr('Yesterday', 'গতকাল');
  return x.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

const PLAN_ICONS = [
  { v: 'pill',     en: 'Medicine',  bn: 'ওষুধ' },
  { v: 'phone',    en: 'Call',      bn: 'ফোন' },
  { v: 'coffee',   en: 'Meal',      bn: 'খাবার' },
  { v: 'walk',     en: 'Walk',      bn: 'হাঁটা' },
  { v: 'heart',    en: 'Visit',     bn: 'দেখা' },
  { v: 'calendar', en: 'Appointment', bn: 'অ্যাপয়েন্টমেন্ট' },
];

const QUICK_TIMES = ['7:00 AM', '8:30 AM', '11:00 AM', '1:00 PM', '4:00 PM', '8:00 PM'];

function PatientPlan({ t, f, s, i }) {
  const tr = useTr();
  const today = new Date();
  const todayIso = pIsoDate(today);

  // Seeded plans across multiple days
  const seed = [
    { id: 'p1', date: todayIso, time: '8:00 AM',  title: 'Breakfast',         titleBn: 'নাশতা',           person: '',     icon: 'coffee', done: true },
    { id: 'p2', date: todayIso, time: '8:30 AM',  title: 'Blue pill',         titleBn: 'নীল ওষুধ',         person: '',     icon: 'pill',   done: true },
    { id: 'p3', date: todayIso, time: '11:00 AM', title: 'Call with Sara',    titleBn: 'Sara-র সাথে কথা',  person: 'Sara', icon: 'phone',  done: false },
    { id: 'p4', date: todayIso, time: '4:00 PM',  title: 'Tea with Rina',     titleBn: 'Rina-র সাথে চা',   person: 'Rina', icon: 'heart',  done: false },
    { id: 'p5', date: todayIso, time: '8:00 PM',  title: 'Evening pill',      titleBn: 'সন্ধ্যার ওষুধ',     person: '',     icon: 'pill',   done: false },
    { id: 'p6', date: pIsoDate(pAddDays(today, 1)), time: '7:30 AM', title: 'Morning walk', titleBn: 'সকালের হাঁটা',  person: '',     icon: 'walk',  done: false },
    { id: 'p7', date: pIsoDate(pAddDays(today, 2)), time: '1:00 PM', title: 'Lunch with Sara', titleBn: 'Sara-র সাথে দুপুরের খাবার', person: 'Sara', icon: 'coffee', done: false },
    { id: 'p8', date: pIsoDate(pAddDays(today, 14)),time: '10:00 AM',title: 'Dr. Hasan appointment', titleBn: 'Dr. Hasan-এর অ্যাপয়েন্টমেন্ট', person: 'Dr. Hasan', icon: 'calendar', done: false },
  ];

  const [plans, setPlans] = React.useState(seed);
  const [selectedDate, setSelectedDate] = React.useState(todayIso);
  const [showAdd, setShowAdd] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  // Day strip — 14 days
  const dayStrip = Array.from({ length: 14 }, (_, idx) => pAddDays(today, idx));

  const filtered = plans
    .filter(p => p.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const togglePlan = (id) => setPlans(ps => ps.map(p => p.id === id ? { ...p, done: !p.done } : p));
  const deletePlan = (id) => { setPlans(ps => ps.filter(p => p.id !== id)); setConfirmDelete(null); };
  const addPlan = (p) => setPlans(ps => [...ps, { ...p, id: 'p' + Date.now() }]);

  return (
    <ScreenShell t={t} f={f} s={s}>
      {/* Header */}
      <div style={{ padding: `12px ${s.padding}px 0` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, letterSpacing: 1.5, color: t.inkMute, fontWeight: 700 }}>
              {tr('PLANS', 'পরিকল্পনা')}
            </div>
            <h1 style={{
              fontFamily: f.display, fontSize: 30, fontWeight: 800,
              margin: '4px 0 0', color: t.ink, letterSpacing: -0.5,
            }}>
              {pFmtDay(new Date(selectedDate), tr)}
            </h1>
            <div style={{ fontSize: 13, color: t.inkSoft, marginTop: 2 }}>
              {filtered.length} {tr(filtered.length === 1 ? 'event' : 'events', 'টি ইভেন্ট')}
              {' · '}
              {filtered.filter(p => p.done).length} {tr('done', 'হয়ে গেছে')}
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} style={{
            width: 52, height: 52, borderRadius: 26,
            background: t.accent, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 16px ${t.accent}55`,
          }}>
            <Icon name="plus" size={28} stroke="#fff"/>
          </button>
        </div>
      </div>

      {/* Day strip */}
      <div style={{
        padding: `12px ${s.padding}px 8px`,
        overflowX: 'auto', whiteSpace: 'nowrap',
      }}>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          {dayStrip.map(d => {
            const iso = pIsoDate(d);
            const a = iso === selectedDate;
            const isToday = iso === todayIso;
            const hasPlans = plans.some(p => p.date === iso);
            const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
            return (
              <button key={iso} onClick={() => setSelectedDate(iso)} style={{
                background: a ? t.accent : t.surface,
                color: a ? '#fff' : t.ink,
                border: `1.5px solid ${a ? t.accent : t.border}`,
                borderRadius: 16, cursor: 'pointer',
                padding: '10px 0', width: 64, flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                position: 'relative',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, letterSpacing: 0.5 }}>
                  {dayName.toUpperCase()}
                </div>
                <div style={{
                  fontFamily: f.display, fontSize: 22, fontWeight: 800,
                  color: a ? '#fff' : (isToday ? t.accent : t.ink), lineHeight: 1,
                }}>{d.getDate()}</div>
                {hasPlans && (
                  <div style={{
                    width: 5, height: 5, borderRadius: 3, marginTop: 2,
                    background: a ? '#fff' : t.accent,
                  }}/>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `8px ${s.padding}px 120px` }}>
        {filtered.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '40px 20px', color: t.inkSoft,
          }}>
            <div style={{
              width: 80, height: 80, margin: '0 auto', borderRadius: 40,
              background: t.bgWarm, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="calendar" size={36} stroke={t.inkMute}/>
            </div>
            <div style={{ fontFamily: f.display, fontSize: 19, fontWeight: 700, color: t.ink, marginTop: 14 }}>
              {tr('Nothing planned yet', 'কিছু পরিকল্পনা নেই')}
            </div>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              {tr('Tap the + button to add an event.', '+ চাপুন একটি ইভেন্ট যোগ করতে।')}
            </div>
          </div>
        )}

        {filtered.map((e) => {
          // Compute "next/soon" — soonest non-done plan today
          const soonest = filtered.find(p => !p.done && p.date === todayIso);
          const isSoon = soonest && soonest.id === e.id && e.date === todayIso;
          const label = tr(e.title, e.titleBn);
          return (
            <div key={e.id} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              {/* Time rail */}
              <div style={{ width: 76, flexShrink: 0, textAlign: 'right', paddingTop: 14 }}>
                <div style={{
                  fontFamily: f.display, fontSize: 18, fontWeight: 700,
                  color: e.done ? t.inkMute : (isSoon ? t.accent : t.ink),
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
                }}>{e.time}</div>
              </div>

              {/* Dot rail */}
              <div style={{ width: 14, position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', left: 6, top: 0, bottom: -12, width: 2, background: t.border }}/>
                <div style={{
                  position: 'absolute', left: 0, top: 18,
                  width: 14, height: 14, borderRadius: 8,
                  background: e.done ? t.good : (isSoon ? t.accent : t.surface),
                  border: `2px solid ${e.done ? t.good : (isSoon ? t.accent : t.border)}`,
                }}/>
              </div>

              <div style={{
                flex: 1, padding: 14,
                background: isSoon ? t.accentSoft : t.surface,
                border: `1.5px solid ${isSoon ? t.accent : t.border}`,
                borderRadius: s.radius,
                opacity: e.done ? 0.55 : 1,
                display: 'flex', gap: 12, alignItems: 'center',
              }}>
                <button onClick={() => togglePlan(e.id)} style={{
                  width: 30, height: 30, borderRadius: 15,
                  background: e.done ? t.good : 'transparent',
                  border: `2px solid ${e.done ? t.good : t.accent}`,
                  cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {e.done && <Icon name="check" size={18} stroke="#fff"/>}
                </button>
                <Icon name={e.icon} size={26} stroke={e.done ? t.good : t.accentInk} filled={i === 'filled'}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 18, fontWeight: 700,
                    textDecoration: e.done ? 'line-through' : 'none',
                    color: e.done ? t.inkMute : t.ink,
                  }}>{label}</div>
                  {e.person && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Avatar name={e.person} size={20}/>
                      <span style={{ fontSize: 13, color: t.inkSoft }}>{e.person}</span>
                    </div>
                  )}
                </div>
                {isSoon && (
                  <div style={{
                    fontSize: 10, fontWeight: 800, color: t.accent,
                    letterSpacing: 0.5, padding: '4px 8px',
                    background: t.surface, borderRadius: 8,
                  }}>{tr('NEXT', 'পরবর্তী')}</div>
                )}
                <button onClick={() => setConfirmDelete(e.id)} style={{
                  width: 32, height: 32, borderRadius: 16,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: t.inkMute, fontSize: 18,
                }} title={tr('Delete', 'মুছুন')}>×</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add modal */}
      {showAdd && (
        <AddPlanModal t={t} f={f} s={s} i={i} tr={tr}
          defaultDate={selectedDate}
          onClose={() => setShowAdd(false)}
          onSave={(p) => { addPlan(p); setShowAdd(false); }}/>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 60, display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            width: '100%', background: t.surface,
            borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
            textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, margin: '0 auto', borderRadius: 28,
              background: t.dangerSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="bell" size={28} stroke={t.danger}/>
            </div>
            <h3 style={{ fontFamily: f.display, fontSize: 22, fontWeight: 700, margin: '12px 0 4px' }}>
              {tr('Delete this event?', 'এই ইভেন্ট মুছবে?')}
            </h3>
            <p style={{ fontSize: 14, color: t.inkSoft, margin: 0 }}>
              {tr("You can't undo this.", 'এটা ফিরিয়ে আনা যাবে না।')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                background: t.surface, border: `1.5px solid ${t.border}`,
                padding: '14px 0', borderRadius: 14, cursor: 'pointer',
                fontFamily: f.body, fontSize: 15, fontWeight: 700, color: t.ink,
              }}>{tr('Cancel', 'বাতিল')}</button>
              <button onClick={() => deletePlan(confirmDelete)} style={{
                background: t.danger, color: '#fff', border: 'none',
                padding: '14px 0', borderRadius: 14, cursor: 'pointer',
                fontFamily: f.body, fontSize: 15, fontWeight: 700,
              }}>{tr('Delete', 'মুছুন')}</button>
            </div>
          </div>
        </div>
      )}
    </ScreenShell>
  );
}

// ─── Add plan modal ───
function AddPlanModal({ t, f, s, i, tr, defaultDate, onClose, onSave }) {
  const [title, setTitle] = React.useState('');
  const [date, setDate] = React.useState(defaultDate);
  const [time, setTime] = React.useState(QUICK_TIMES[1]);
  const [icon, setIcon] = React.useState('coffee');

  const days = Array.from({ length: 14 }, (_, idx) => pAddDays(new Date(), idx));

  const canSave = title.trim().length > 0;
  const save = () => {
    if (!canSave) return;
    onSave({ title: title.trim(), titleBn: title.trim(), date, time, icon, person: '', done: false });
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 70, display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        width: '100%', background: t.bg,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        display: 'flex', flexDirection: 'column',
        maxHeight: '92%', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${t.border}`,
        }}>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: t.inkSoft, fontSize: 15, fontFamily: f.body, fontWeight: 600,
          }}>{tr('Cancel', 'বাতিল')}</button>
          <div style={{ fontFamily: f.display, fontSize: 18, fontWeight: 700, color: t.ink }}>
            {tr('New event', 'নতুন ইভেন্ট')}
          </div>
          <button onClick={save} disabled={!canSave} style={{
            background: 'transparent', border: 'none',
            cursor: canSave ? 'pointer' : 'default',
            color: canSave ? t.accent : t.inkMute,
            fontSize: 15, fontFamily: f.body, fontWeight: 800,
          }}>{tr('Save', 'সংরক্ষণ')}</button>
        </div>

        <div style={{ overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div>
            <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
              {tr('TITLE', 'শিরোনাম')}
            </div>
            <input
              autoFocus
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder={tr('e.g. Lunch with Sara', 'যেমন Sara-র সাথে খাবার')}
              style={{
                width: '100%', background: t.surface, border: `1.5px solid ${t.border}`,
                borderRadius: 14, padding: '14px 16px', fontSize: 17, fontWeight: 600, color: t.ink,
                outline: 'none', fontFamily: f.body, boxSizing: 'border-box',
              }}/>
          </div>

          {/* Type */}
          <div>
            <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
              {tr('TYPE', 'ধরন')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {PLAN_ICONS.map(opt => {
                const a = icon === opt.v;
                return (
                  <button key={opt.v} onClick={() => setIcon(opt.v)} style={{
                    background: a ? t.accent : t.surface,
                    color: a ? '#fff' : t.ink,
                    border: `1.5px solid ${a ? t.accent : t.border}`,
                    borderRadius: 14, padding: '12px 4px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    fontFamily: f.body,
                  }}>
                    <Icon name={opt.v} size={22} stroke={a ? '#fff' : t.accentInk} filled={i === 'filled'}/>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{tr(opt.en, opt.bn)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
              {tr('DAY', 'দিন')}
            </div>
            <div style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
              <div style={{ display: 'inline-flex', gap: 8 }}>
                {days.map(d => {
                  const iso = pIsoDate(d);
                  const a = iso === date;
                  return (
                    <button key={iso} onClick={() => setDate(iso)} style={{
                      background: a ? t.accent : t.surface,
                      color: a ? '#fff' : t.ink,
                      border: `1.5px solid ${a ? t.accent : t.border}`,
                      borderRadius: 14, cursor: 'pointer',
                      padding: '10px 0', width: 62, flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.85, letterSpacing: 0.5 }}>
                        {d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()}
                      </div>
                      <div style={{ fontFamily: f.display, fontSize: 20, fontWeight: 800, marginTop: 2 }}>{d.getDate()}</div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>
                        {d.toLocaleDateString(undefined, { month: 'short' })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time */}
          <div>
            <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
              {tr('TIME', 'সময়')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {QUICK_TIMES.map(qt => {
                const a = time === qt;
                return (
                  <button key={qt} onClick={() => setTime(qt)} style={{
                    background: a ? t.accent : t.surface,
                    color: a ? '#fff' : t.ink,
                    border: `1.5px solid ${a ? t.accent : t.border}`,
                    borderRadius: 14, padding: '12px 4px', cursor: 'pointer',
                    fontFamily: f.display, fontSize: 15, fontWeight: 700,
                  }}>{qt}</button>
                );
              })}
            </div>
            <input
              value={time} onChange={e => setTime(e.target.value)}
              placeholder={tr('Or type a time', 'অথবা সময় লিখুন')}
              style={{
                marginTop: 8, width: '100%', background: t.surface, border: `1.5px solid ${t.border}`,
                borderRadius: 12, padding: '10px 14px', fontSize: 15, color: t.ink,
                outline: 'none', fontFamily: f.body, boxSizing: 'border-box',
              }}/>
          </div>

          {/* Big save */}
          <button onClick={save} disabled={!canSave} style={{
            background: canSave ? t.accent : t.inkMute, color: '#fff',
            border: 'none', cursor: canSave ? 'pointer' : 'default',
            padding: '16px 24px', borderRadius: 16,
            fontFamily: f.display, fontSize: 17, fontWeight: 700,
            marginTop: 6, marginBottom: 16,
          }}>{tr('Save event', 'সংরক্ষণ করুন')}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  PatientHome, PatientEmergencyIdle, PatientEmergencyActive,
  PatientRecord, PatientChat, PatientPlan,
  ScreenShell, Card, BigButton,
});
