import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { db, uploadProfilePhoto } from '@/lib/firebase'
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { PatientCaregiver } from '@/types'
import Icon from '@/components/ui/Icon'

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: on ? 'var(--color-accent)' : 'var(--color-border)',
        position: 'relative', flexShrink: 0, border: 'none', cursor: 'pointer',
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 2, width: 22, height: 22, borderRadius: 11,
        background: '#fff', transition: 'left 0.2s, right 0.2s',
        ...(on ? { right: 2 } : { left: 2 }),
      }} />
    </button>
  )
}

function Row({
  icon, label, value, danger, action, onClick,
}: {
  icon: string; label: string; value?: string
  danger?: boolean; action?: React.ReactNode; onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 14, display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid var(--color-border)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 12, flexShrink: 0,
        background: danger ? 'var(--color-danger-soft)' : 'var(--color-accent-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={20} color={danger ? 'var(--color-danger)' : 'var(--color-accent-dark)'} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: danger ? 'var(--color-danger)' : 'var(--color-ink)' }}>{label}</div>
        {value && <div style={{ fontSize: 13, color: 'var(--color-ink-soft)', marginTop: 1 }}>{value}</div>}
      </div>
      {action !== undefined ? action : onClick ? <span style={{ color: 'var(--color-ink-mute)', fontSize: 20 }}>›</span> : null}
    </div>
  )
}

export default function PatientProfile() {
  const { profile, firebaseUser, signOut, updateProfile } = useAuth()
  const { lang, setLang, tr } = useLang()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [caregivers, setCaregivers] = useState<PatientCaregiver[]>([])
  const [memories, setMemories] = useState(0)
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)

  // Edit
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editAge, setEditAge] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLang, setEditLang] = useState<'en' | 'bn'>('en')
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoProgress, setPhotoProgress] = useState(0)

  // Settings toggles — read from profile, default true
  const [morningBriefing, setMorningBriefing] = useState(true)
  const [remindersOn, setRemindersOn] = useState(true)

  // Sign-out confirm
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  useEffect(() => {
    if (!profile) return
    setMorningBriefing((profile as any).notif_morning_briefing ?? true)
    setRemindersOn((profile as any).notif_reminders ?? true)

    async function load() {
      const cgSnap = await getDocs(query(
        collection(db, 'caregiver_patients'),
        where('patient_id', '==', profile!.id),
        where('status', '==', 'active')
      ))
      const list = await Promise.all(cgSnap.docs.map(async d => {
        const data = d.data()
        const cgSnap2 = await getDoc(doc(db, 'profiles', data.caregiver_id))
        return { ...data, caregiver: cgSnap2.exists() ? cgSnap2.data() : null }
      })) as PatientCaregiver[]
      setCaregivers(list)

      const recSnap = await getDocs(query(
        collection(db, 'recordings'),
        where('patientId', '==', profile!.id)
      ))
      setMemories(recSnap.size)
    }
    load()
  }, [profile])

  function startEdit() {
    setEditName(profile?.name || firebaseUser?.displayName || '')
    setEditAge(profile?.age?.toString() || '')
    setEditPhone((profile as any)?.phone || '')
    setEditLang(profile?.language || 'en')
    setEditing(true)
  }

  async function saveEdit() {
    setSaving(true)
    try {
      await updateProfile({
        name:     editName.trim() || profile?.name,
        age:      parseInt(editAge) || undefined,
        phone:    editPhone.trim() || undefined,
        language: editLang,
      })
      setLang(editLang)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !firebaseUser) return
    setPhotoUploading(true)
    setPhotoProgress(0)
    try {
      const url = await uploadProfilePhoto(firebaseUser.uid, file, pct => setPhotoProgress(pct))
      await updateProfile({ avatar_url: url })
    } catch (err) {
      console.error('Photo upload failed:', err)
    } finally {
      setPhotoUploading(false)
      e.target.value = ''
    }
  }

  async function toggleMorning() {
    const next = !morningBriefing
    setMorningBriefing(next)
    await updateProfile({ notif_morning_briefing: next } as any)
  }

  async function toggleReminders() {
    const next = !remindersOn
    setRemindersOn(next)
    await updateProfile({ notif_reminders: next } as any)
  }

  async function handleLangSwitch(l: 'en' | 'bn') {
    setLang(l)
    await updateProfile({ language: l })
  }

  function copyCode() {
    const code = profile?.caregiver_code || ''
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleSignOut() {
    await signOut()
    navigate('/welcome', { replace: true })
  }

  const displayName = profile?.name || firebaseUser?.displayName || 'User'
  const photoSrc = profile?.avatar_url || firebaseUser?.photoURL
  const code = profile?.caregiver_code || '------'
  const formatted = code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code

  const wrapperStyle: React.CSSProperties = isMobile
    ? { position: 'absolute', inset: 0, background: 'var(--color-bg)', overflowY: 'auto', paddingBottom: 100 }
    : { color: 'var(--color-ink)' }

  return (
    <div className={isMobile ? undefined : 'desktop-profile'} style={wrapperStyle}>
      {/* Hidden file input */}
      <input
        ref={photoInputRef} type="file" accept="image/*"
        style={{ display: 'none' }} onChange={handlePhotoSelect}
      />

      {/* Hero gradient */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-accent), #0E4145)',
        padding: '24px 20px 64px', color: '#fff',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
            {tr('Profile', 'প্রোফাইল')}
          </div>
          <button onClick={startEdit} style={{
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff', padding: '6px 14px', borderRadius: 16, cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
          }}>
            {tr('Edit', 'এডিট')}
          </button>
        </div>
      </div>

      {/* Avatar overlap card */}
      <div style={{ position: 'relative', marginTop: -56, padding: '0 20px' }}>
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 22, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Clickable avatar */}
            <button
              onClick={() => photoInputRef.current?.click()}
              style={{
                width: 80, height: 80, borderRadius: 40, flexShrink: 0,
                background: 'linear-gradient(135deg, var(--color-accent), #0E4145)',
                color: '#fff', fontSize: 32, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '4px solid var(--color-surface)', marginTop: -36,
                fontFamily: 'var(--font-display)', cursor: 'pointer',
                position: 'relative', overflow: 'hidden',
              }}
              title={tr('Change photo', 'ছবি পরিবর্তন')}
            >
              {photoUploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{photoProgress}%</span>
                </div>
              ) : photoSrc ? (
                <img src={photoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                displayName[0].toUpperCase()
              )}
              {/* Camera overlay on hover */}
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.2s',
                borderRadius: '50%',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
              >
                <Icon name="camera" size={22} color="#fff" />
              </div>
            </button>

            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--color-ink)', letterSpacing: -0.3 }}>{displayName}</div>
              <div style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>
                {profile?.age ? `${profile.age} yrs · ` : ''}{tr('Patient', 'রোগী')}
              </div>
              {(profile as any)?.phone && (
                <div style={{ fontSize: 12, color: 'var(--color-ink-mute)', marginTop: 2 }}>{(profile as any).phone}</div>
              )}
              <div style={{ fontSize: 12, color: 'var(--color-good)', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--color-good)', display: 'inline-block' }} />
                {tr('Voice signature trained', 'কণ্ঠস্বর শেখা হয়েছে')}
              </div>
            </div>
          </div>

          {/* Caregiver code */}
          <div style={{ marginTop: 14, padding: 12, background: 'var(--color-bg-warm)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="shield" size={20} color="var(--color-accent)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 0.5 }}>
                {tr('YOUR CAREGIVER CODE', 'তোমার কেয়ারগিভার কোড')}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--color-ink)', letterSpacing: 4 }}>
                {showCode ? formatted : '••• •••'}
              </div>
            </div>
            <button onClick={() => setShowCode(s => !s)} style={{
              background: 'transparent', border: '1.5px solid var(--color-border)',
              color: 'var(--color-ink-soft)', cursor: 'pointer',
              padding: '6px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            }}>
              {showCode ? tr('Hide', 'লুকাও') : tr('Show', 'দেখাও')}
            </button>
            {showCode && (
              <button onClick={copyCode} style={{
                background: copied ? 'var(--color-good)' : 'var(--color-accent)',
                color: '#fff', border: 'none', cursor: 'pointer',
                padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                transition: 'background 0.2s',
              }}>
                {copied ? tr('Copied!', 'কপি হয়েছে!') : tr('Copy', 'কপি')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit panel */}
      {editing && (
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{
            background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
            borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>{tr('Edit profile', 'প্রোফাইল সম্পাদনা')}</div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-mute)', display: 'block', marginBottom: 4 }}>{tr('Name', 'নাম')}</label>
              <input
                style={{ width: '100%', background: 'var(--color-bg-warm)', border: '1.5px solid var(--color-border)', borderRadius: 10, padding: '10px 12px', fontSize: 15, color: 'var(--color-ink)', outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder={displayName}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-mute)', display: 'block', marginBottom: 4 }}>{tr('Age', 'বয়স')}</label>
              <input
                type="number" min={1} max={120}
                style={{ width: '100%', background: 'var(--color-bg-warm)', border: '1.5px solid var(--color-border)', borderRadius: 10, padding: '10px 12px', fontSize: 15, color: 'var(--color-ink)', outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }}
                value={editAge}
                onChange={e => setEditAge(e.target.value)}
                placeholder="e.g. 72"
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-mute)', display: 'block', marginBottom: 4 }}>{tr('Phone number', 'ফোন নম্বর')}</label>
              <input
                type="tel"
                style={{ width: '100%', background: 'var(--color-bg-warm)', border: '1.5px solid var(--color-border)', borderRadius: 10, padding: '10px 12px', fontSize: 15, color: 'var(--color-ink)', outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }}
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
                placeholder="+880 1XXX XXXXXX"
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-mute)', display: 'block', marginBottom: 4 }}>{tr('Language', 'ভাষা')}</label>
              <div style={{ display: 'flex', background: 'var(--color-bg-warm)', padding: 4, borderRadius: 14, gap: 4 }}>
                {(['en', 'bn'] as const).map(l => (
                  <button key={l} onClick={() => setEditLang(l)} style={{
                    flex: 1, background: editLang === l ? 'var(--color-accent)' : 'transparent',
                    color: editLang === l ? '#fff' : 'var(--color-ink-soft)',
                    border: 'none', cursor: 'pointer',
                    padding: '10px 16px', borderRadius: 10,
                    fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
                  }}>
                    {l === 'en' ? 'English' : 'বাংলা'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-mute)', display: 'block', marginBottom: 8 }}>{tr('Profile photo', 'প্রোফাইল ছবি')}</label>
              <button
                onClick={() => photoInputRef.current?.click()}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10, cursor: 'pointer',
                  background: 'var(--color-bg-warm)', border: '1.5px dashed var(--color-border)',
                  color: 'var(--color-accent)', fontWeight: 700, fontSize: 14,
                  fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {photoUploading ? `${tr('Uploading', 'আপলোড হচ্ছে')} ${photoProgress}%` : tr('📷  Choose photo from device', '📷  ডিভাইস থেকে ছবি বেছে নাও')}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditing(false)} style={{
                flex: 1, minHeight: 48, borderRadius: 14,
                background: 'transparent', border: '1.5px solid var(--color-border)',
                color: 'var(--color-ink-soft)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}>
                {tr('Cancel', 'বাতিল')}
              </button>
              <button onClick={saveEdit} disabled={saving} style={{
                flex: 1, minHeight: 48, borderRadius: 14,
                background: 'var(--color-accent)', border: 'none',
                color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {saving
                  ? <span style={{ width: 18, height: 18, borderRadius: 9, border: '2.5px solid #fff', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  : tr('Save', 'সংরক্ষণ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Language toggle */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 16, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--color-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chat" size={20} color="var(--color-accent-dark)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>
                {lang === 'bn' ? 'ভাষা / Language' : 'Language / ভাষা'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-ink-soft)' }}>
                {lang === 'bn' ? 'পুরো অ্যাপের ভাষা বদলাও' : 'Switch the whole app language'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', background: 'var(--color-bg-warm)', padding: 4, borderRadius: 14, gap: 4 }}>
            {[{ v: 'en', label: 'English', sub: 'ENGLISH' }, { v: 'bn', label: 'বাংলা', sub: 'BANGLA' }].map(opt => (
              <button key={opt.v} onClick={() => handleLangSwitch(opt.v as 'en' | 'bn')} style={{
                flex: 1, background: lang === opt.v ? 'var(--color-accent)' : 'transparent',
                color: lang === opt.v ? '#fff' : 'var(--color-ink-soft)',
                border: 'none', cursor: 'pointer',
                padding: '12px 16px', borderRadius: 10,
                fontFamily: 'var(--font-body)', fontWeight: 700,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{opt.label}</div>
                <div style={{ fontSize: 10, opacity: 0.8, letterSpacing: 1 }}>{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { v: String(memories), l: tr('Memories', 'স্মৃতি') },
            { v: String(caregivers.length), l: tr('Caregivers', 'কেয়ারগিভার') },
            { v: profile?.age ? `${profile.age}` : '—', l: tr('Years old', 'বছর বয়স') },
          ].map(m => (
            <div key={m.l} style={{
              background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
              borderRadius: 14, padding: 12, textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--color-accent)' }}>{m.v || '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--color-ink-soft)', fontWeight: 600, marginTop: 2 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* My caregivers */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
          {tr('MY CAREGIVERS', 'আমার কেয়ারগিভার')}
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
          {caregivers.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-ink-mute)', fontSize: 13 }}>
              {tr('No caregivers connected yet.', 'এখনো কোনো কেয়ারগিভার যুক্ত নেই।')}
              <br />
              <span style={{ fontSize: 12, color: 'var(--color-ink-soft)' }}>
                {tr('Share your caregiver code above.', 'উপরের কোডটি শেয়ার করুন।')}
              </span>
            </div>
          ) : (
            caregivers.map((cg, idx, a) => (
              <div key={cg.caregiver_id} style={{
                padding: 14, display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: idx < a.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 22,
                    background: 'var(--color-accent)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 800, overflow: 'hidden',
                  }}>
                    {(cg.caregiver as any)?.avatar_url
                      ? <img src={(cg.caregiver as any).avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (cg.caregiver?.name || 'C')[0]}
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, background: 'var(--color-good)', border: '2px solid var(--color-surface)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>{cg.caregiver?.name || 'Caregiver'}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-ink-soft)' }}>{(cg.caregiver as any)?.phone || cg.caregiver?.email || ''}</div>
                </div>
                <Icon name="phone" size={20} color="var(--color-accent)" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Settings / Notifications */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
          {tr('SETTINGS', 'সেটিংস')}
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
          <Row
            icon="sun"
            label={tr('Morning briefing', 'সকালের বার্তা')}
            value={morningBriefing ? tr('On · every day at 7:30 AM', 'চালু · প্রতিদিন সকাল ৭:৩০') : tr('Off', 'বন্ধ')}
            action={<Toggle on={morningBriefing} onToggle={toggleMorning} />}
          />
          <Row
            icon="bell"
            label={tr('Reminders', 'রিমাইন্ডার')}
            value={remindersOn ? tr('Push · voice', 'পুশ · কণ্ঠস্বর') : tr('Off', 'বন্ধ')}
            action={<Toggle on={remindersOn} onToggle={toggleReminders} />}
          />
          <Row
            icon="shield"
            label={tr('Privacy & data', 'গোপনীয়তা ও ডেটা')}
            value={tr('End-to-end encrypted', 'এন্ড-টু-এন্ড এনক্রিপ্টেড')}
            onClick={() => alert(tr('All your data is encrypted and private.', 'আপনার সব ডেটা এনক্রিপ্টেড এবং ব্যক্তিগত।'))}
          />
          <Row
            icon="heart"
            label={tr('Emergency contacts', 'জরুরি যোগাযোগ')}
            value={tr(`${caregivers.length} connected`, `${caregivers.length} জন যুক্ত`)}
          />
        </div>
      </div>

      {/* Help + Sign out */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
          <Row
            icon="sparkle"
            label={tr('Help & support', 'সাহায্য')}
            value={tr('FAQs and guides', 'প্রশ্নোত্তর ও গাইড')}
            onClick={() => alert(tr('Help centre coming soon!', 'সাহায্য কেন্দ্র শীঘ্রই আসছে!'))}
          />
          <Row
            icon="log-out"
            label={tr('Sign out', 'সাইন আউট')}
            danger
            onClick={() => setConfirmSignOut(true)}
            action={<span style={{ color: 'var(--color-danger)', fontSize: 20 }}>›</span>}
          />
        </div>
      </div>

      <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-ink-mute)', fontSize: 12 }}>
        Memory Mate v1.0 · Made with care
      </div>

      {/* Sign-out confirm sheet */}
      {confirmSignOut && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setConfirmSignOut(false)}
        >
          <div
            style={{ width: '100%', background: 'var(--color-bg)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 56, height: 56, margin: '0 auto 12px', borderRadius: 28, background: 'var(--color-danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="log-out" size={28} color="var(--color-danger)" />
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 6px' }}>
              {tr('Sign out?', 'সাইন আউট করবেন?')}
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: '0 0 20px' }}>
              {tr('You will be taken to the welcome screen.', 'আপনাকে স্বাগত পৃষ্ঠায় নিয়ে যাওয়া হবে।')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => setConfirmSignOut(false)} style={{
                background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                padding: '14px 0', borderRadius: 14, cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--color-ink)',
              }}>
                {tr('Cancel', 'বাতিল')}
              </button>
              <button onClick={handleSignOut} style={{
                background: 'var(--color-danger)', color: '#fff', border: 'none',
                padding: '14px 0', borderRadius: 14, cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
              }}>
                {tr('Sign out', 'সাইন আউট')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
