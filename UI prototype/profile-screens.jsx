// Profile screens — Patient and Caregiver

// ─── Language toggle (shared) ───
function LangToggle({ t, f }) {
  const { lang, setLang } = React.useContext(LangCtx);
  return (
    <div style={{
      background: t.surface, border: `1.5px solid ${t.border}`,
      borderRadius: 16, padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="chat" size={20} stroke={t.accentInk}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.ink }}>
            {lang === 'bn' ? 'ভাষা / Language' : 'Language / ভাষা'}
          </div>
          <div style={{ fontSize: 12, color: t.inkSoft }}>
            {lang === 'bn' ? 'পুরো অ্যাপের ভাষা বদলাও' : 'Switch the whole app'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', background: t.bgWarm, padding: 4, borderRadius: 14, gap: 4 }}>
        {[
          { v: 'en', label: 'English',   sub: 'ENGLISH' },
          { v: 'bn', label: 'বাংলা',     sub: 'BANGLA' },
        ].map(opt => {
          const a = lang === opt.v;
          return (
            <button key={opt.v} onClick={() => setLang(opt.v)} style={{
              flex: 1, background: a ? t.accent : 'transparent',
              color: a ? '#fff' : t.inkSoft,
              border: 'none', cursor: 'pointer',
              padding: '12px 16px', borderRadius: 10,
              fontFamily: f.body, fontWeight: 700,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <div style={{ fontFamily: f.display, fontSize: 18 }}>{opt.label}</div>
              <div style={{ fontSize: 10, opacity: 0.8, letterSpacing: 1 }}>{opt.sub}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfileShell({ t, f, s, children, onSignOut }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: t.bg, color: t.ink, fontFamily: f.body,
      paddingTop: 54, paddingBottom: 100,
      overflowY: 'auto',
    }}>
      {children}
    </div>
  );
}

function ProfileRow({ t, f, i, icon, label, value, action, danger }) {
  return (
    <div style={{
      padding: 14, display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: `1px solid ${t.border}`,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: danger ? t.dangerSoft : t.accentSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={20} stroke={danger ? t.danger : t.accentInk} filled={i === 'filled'}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: danger ? t.danger : t.ink }}>{label}</div>
        {value && <div style={{ fontSize: 13, color: t.inkSoft, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>}
      </div>
      {action !== undefined ? action : <span style={{ color: t.inkMute, fontSize: 20 }}>›</span>}
    </div>
  );
}

// ─── Patient Profile ───
function PatientProfile({ t, f, s, i, onSignOut }) {
  const tr = useTr();
  return (
    <ProfileShell t={t} f={f} s={s}>
      {/* Header hero */}
      <div style={{
        background: `linear-gradient(135deg, ${t.accent}, ${t.accentInk})`,
        padding: '24px 20px 64px',
        color: '#fff',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}/>
        <div style={{ position: 'absolute', bottom: -40, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}/>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ fontFamily: f.display, fontSize: 22, fontWeight: 700 }}>{tr('Profile', 'প্রোফাইল')}</div>
          <button style={{
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff', padding: '6px 14px', borderRadius: 16, cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
          }}>{tr('Edit', 'এডিট')}</button>
        </div>
      </div>

      {/* Avatar overlap */}
      <div style={{ position: 'relative', marginTop: -56, padding: '0 20px' }}>
        <div style={{
          background: t.surface, border: `1.5px solid ${t.border}`, borderRadius: 22, padding: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 40,
              background: `linear-gradient(135deg, ${SPEAKER_COLORS.Rahim.ring}, ${SPEAKER_COLORS.Rahim.fg})`,
              color: '#fff', fontSize: 32, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `4px solid ${t.surface}`, marginTop: -36,
              fontFamily: f.display,
            }}>র</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: f.display, fontSize: 22, fontWeight: 800, color: t.ink, letterSpacing: -0.3 }}>Rahim Ahmed</div>
              <div style={{ fontSize: 13, color: t.inkSoft }}>72 · বাংলা · English</div>
              <div style={{ fontSize: 12, color: t.good, fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: t.good }}/>
                {tr('Voice signature trained', 'কণ্ঠস্বর শেখা হয়েছে')}
              </div>
            </div>
          </div>

          {/* Connection code */}
          <div style={{
            marginTop: 14, padding: 12,
            background: t.bgWarm, borderRadius: 12,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon name="shield" size={20} stroke={t.accent} filled={i === 'filled'}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 0.5 }}>{tr('YOUR CAREGIVER CODE', 'তোমার কেয়ারগিভার কোড')}</div>
              <div style={{ fontFamily: f.display, fontSize: 20, fontWeight: 800, color: t.ink, letterSpacing: 4 }}>739 245</div>
            </div>
            <button style={{
              background: t.accent, color: '#fff', border: 'none', cursor: 'pointer',
              padding: '8px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700,
            }}>{tr('Share', 'শেয়ার')}</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '16px 20px 0' }}>
        <LangToggle t={t} f={f}/>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { v: '47',   l: tr('Memories', 'স্মৃতি') },
            { v: '12',   l: tr('Days streak', 'দিন') },
            { v: '3',    l: tr('Caregivers', 'কেয়ারগিভার') },
          ].map(m => (
            <div key={m.l} style={{
              background: t.surface, border: `1.5px solid ${t.border}`,
              borderRadius: 14, padding: 12, textAlign: 'center',
            }}>
              <div style={{ fontFamily: f.display, fontSize: 22, fontWeight: 800, color: t.accent }}>{m.v}</div>
              <div style={{ fontSize: 11, color: t.inkSoft, fontWeight: 600, marginTop: 2 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* My caregivers */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1 }}>{tr('MY CAREGIVERS', 'আমার কেয়ারগিভার')}</div>
          <span style={{ color: t.accent, fontSize: 13, fontWeight: 700 }}>+ {tr('Add', 'যোগ করো')}</span>
        </div>
        <div style={{
          background: t.surface, border: `1.5px solid ${t.border}`,
          borderRadius: 16, overflow: 'hidden',
        }}>
          {[
            { name: 'Sara Ahmed',  rel: 'Daughter · Primary', online: true,  ic: SPEAKER_COLORS.Sara },
            { name: 'Mira Begum',  rel: 'Niece',              online: false, ic: SPEAKER_COLORS.Mira },
            { name: 'Dr. Hasan',   rel: 'Doctor',             online: false, ic: SPEAKER_COLORS['Dr. Hasan'] },
          ].map((cg, idx, a) => (
            <div key={cg.name} style={{
              padding: 14, display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: idx < a.length - 1 ? `1px solid ${t.border}` : 'none',
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 22,
                  background: cg.ic.ring, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800,
                }}>{cg.name[0]}</div>
                {cg.online && (
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, background: t.good, border: `2px solid ${t.surface}` }}/>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{cg.name}</div>
                <div style={{ fontSize: 12, color: t.inkSoft }}>{cg.rel}</div>
              </div>
              <Icon name="phone" size={20} stroke={t.accent} filled={i === 'filled'}/>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>{tr('SETTINGS', 'সেটিংস')}</div>
        <div style={{
          background: t.surface, border: `1.5px solid ${t.border}`,
          borderRadius: 16, overflow: 'hidden',
        }}>
          <ProfileRow t={t} f={f} i={i} icon="sun"      label={tr('Morning briefing', 'সকালের বার্তা')}     value={tr('Every day at 7:30 AM', 'প্রতিদিন সকাল ৭:৩০')}/>
          <ProfileRow t={t} f={f} i={i} icon="speaker"  label={tr('Voice & language', 'কণ্ঠস্বর ও ভাষা')}     value={tr('Bangla · English · slow speech', 'বাংলা · English · ধীরে কথা')}/>
          <ProfileRow t={t} f={f} i={i} icon="bell"     label={tr('Reminders', 'রিমাইন্ডার')}            value={tr('Push · voice', 'পুশ · কণ্ঠস্বর')}/>
          <ProfileRow t={t} f={f} i={i} icon="shield"   label={tr('Privacy & data', 'গোপনীয়তা ও ডেটা')}        value={tr('End-to-end encrypted', 'এন্ড-টু-এন্ড এনক্রিপ্টেড')}/>
          <ProfileRow t={t} f={f} i={i} icon="heart"    label={tr('Emergency contacts', 'জরুরি যোগাযোগ')}      value={tr('3 people', '৩ জন')}/>
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <div style={{
          background: t.surface, border: `1.5px solid ${t.border}`,
          borderRadius: 16, overflow: 'hidden',
        }}>
          <ProfileRow t={t} f={f} i={i} icon="book" label={tr('Help & support', 'সাহায্য')} value={tr('Tap for guides', 'গাইড দেখতে ট্যাপ করো')}/>
          <div onClick={onSignOut} style={{ cursor: 'pointer' }}>
            <ProfileRow t={t} f={f} i={i} icon="user" label={tr('Sign out', 'সাইন আউট')} danger
              action={<span style={{ color: t.danger, fontSize: 13, fontWeight: 700 }}>›</span>}/>
          </div>
        </div>
      </div>

      <div style={{ padding: 20, textAlign: 'center', color: t.inkMute, fontSize: 12 }}>
        Memora v1.0 · Made with care
      </div>
    </ProfileShell>
  );
}

// ─── Caregiver Profile ───
function CaregiverProfile({ t, f, s, i, onSignOut }) {
  const tr = useTr();
  return (
    <ProfileShell t={t} f={f} s={s}>
      <div style={{
        background: `linear-gradient(135deg, ${t.accent}, ${t.accentInk})`,
        padding: '24px 20px 64px', color: '#fff',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}/>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: f.display, fontSize: 22, fontWeight: 700 }}>Profile</div>
          <button style={{
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff', padding: '6px 14px', borderRadius: 16, cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
          }}>Edit</button>
        </div>
      </div>

      <div style={{ position: 'relative', marginTop: -56, padding: '0 20px' }}>
        <div style={{
          background: t.surface, border: `1.5px solid ${t.border}`, borderRadius: 22, padding: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 40,
              background: `linear-gradient(135deg, ${SPEAKER_COLORS.Sara.ring}, ${SPEAKER_COLORS.Sara.fg})`,
              color: '#fff', fontSize: 32, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `4px solid ${t.surface}`, marginTop: -36,
              fontFamily: f.display,
            }}>S</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: f.display, fontSize: 22, fontWeight: 800, color: t.ink, letterSpacing: -0.3 }}>Sara Ahmed</div>
              <div style={{ fontSize: 13, color: t.inkSoft }}>Caregiver · Dhaka</div>
              <div style={{ fontSize: 12, color: t.good, fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: t.good }}/>
                Verified caregiver
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My patients */}
      <div style={{ padding: '20px 20px 0' }}>
        <LangToggle t={t} f={f}/>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1 }}>PATIENTS I CARE FOR</div>
          <span style={{ color: t.accent, fontSize: 13, fontWeight: 700 }}>+ Connect</span>
        </div>
        <div style={{
          background: t.surface, border: `1.5px solid ${t.border}`,
          borderRadius: 16, padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28,
              background: SPEAKER_COLORS.Rahim.ring, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800,
            }}>র</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: f.display, fontSize: 18, fontWeight: 700 }}>Rahim Ahmed</div>
              <div style={{ fontSize: 13, color: t.inkSoft }}>Father · 72</div>
            </div>
            <div style={{
              fontSize: 11, fontWeight: 700,
              background: t.goodSoft, color: t.good,
              padding: '4px 10px', borderRadius: 10,
            }}>● Active</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
            {[
              { v: '3/6', l: 'Reminders' },
              { v: '✓',   l: 'Briefing' },
              { v: 'Home', l: 'Location' },
            ].map(m => (
              <div key={m.l} style={{
                background: t.bgWarm, borderRadius: 10, padding: '8px 6px', textAlign: 'center',
              }}>
                <div style={{ fontFamily: f.display, fontSize: 16, fontWeight: 800, color: t.accent }}>{m.v}</div>
                <div style={{ fontSize: 10, color: t.inkSoft, fontWeight: 600, marginTop: 2 }}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>NOTIFICATIONS</div>
        <div style={{
          background: t.surface, border: `1.5px solid ${t.border}`,
          borderRadius: 16, overflow: 'hidden',
        }}>
          <ProfileRow t={t} f={f} i={i} icon="bell"     label="Emergency alerts"    value="Always on"
            action={<div style={{ width: 44, height: 26, borderRadius: 13, background: t.accent, position: 'relative' }}><div style={{ position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: 11, background: '#fff' }}/></div>}/>
          <ProfileRow t={t} f={f} i={i} icon="map"      label="Safe zone alerts"    value="On · 500m radius"
            action={<div style={{ width: 44, height: 26, borderRadius: 13, background: t.accent, position: 'relative' }}><div style={{ position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: 11, background: '#fff' }}/></div>}/>
          <ProfileRow t={t} f={f} i={i} icon="walk"     label="Missed reminders"    value="Send after 15 min"/>
          <ProfileRow t={t} f={f} i={i} icon="heart"    label="Mood drops"          value="Notify if 3+ days low"/>
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>ACCOUNT</div>
        <div style={{
          background: t.surface, border: `1.5px solid ${t.border}`,
          borderRadius: 16, overflow: 'hidden',
        }}>
          <ProfileRow t={t} f={f} i={i} icon="shield"   label="Privacy & data"     value="End-to-end encrypted"/>
          <ProfileRow t={t} f={f} i={i} icon="book"     label="Help & support"/>
          <div onClick={onSignOut} style={{ cursor: 'pointer' }}>
            <ProfileRow t={t} f={f} i={i} icon="user" label="Sign out" danger/>
          </div>
        </div>
      </div>

      <div style={{ padding: 20, textAlign: 'center', color: t.inkMute, fontSize: 12 }}>
        Memora v1.0 · Made with care
      </div>
    </ProfileShell>
  );
}

Object.assign(window, { PatientProfile, CaregiverProfile, ProfileRow });
