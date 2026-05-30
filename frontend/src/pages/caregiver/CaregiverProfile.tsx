import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { db, uploadProfilePhoto, fsConnectPatientByCode } from '@/lib/firebase'
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { CaregiverPatient } from '@/types'
import Icon from '@/components/ui/Icon'

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: on ? 'var(--color-accent)' : 'var(--color-border)',
        position: 'relative', flexShrink: 0, border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.2s', opacity: disabled ? 0.6 : 1,
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
      {action !== undefined ? action : onClick ? <span style={{ color: 'var(--color-ink-mute)', fontSize: 20 }}>â€º</span> : null}
    </div>
  )
}

export default function CaregiverProfile() {
  const { profile, firebaseUser, signOut, updateProfile } = useAuth()
  const { lang, setLang, tr } = useLang()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [patients, setPatients] = useState<CaregiverPatient[]>([])

  // Edit
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLang, setEditLang] = useState<'en' | 'bn'>('en')
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoProgress, setPhotoProgress] = useState(0)

  // Notification toggles â€" read from profile
  const [notifEmergency] = useState(true) // always on, not toggleable
  const [notifSafezone, setNotifSafezone] = useState(true)
  const [notifMissed, setNotifMissed] = useState(true)
  const [notifMood, setNotifMood] = useState(false)

  // Sign-out confirm
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  // Connect patient
  const [connectOpen, setConnectOpen] = useState(false)
  const [connectCode, setConnectCode] = useState('')
  const [connectLoading, setConnectLoading] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [connectSuccess, setConnectSuccess] = useState('')

  async function loadPatients() {
    if (!profile) return
    const snap = await getDocs(query(
      collection(db, 'caregiver_patients'),
      where('caregiver_id', '==', profile.id),
      where('status', '==', 'active')
    ))
    const list = await Promise.all(snap.docs.map(async d => {
      const data = d.data()
      const patSnap = await getDoc(doc(db, 'profiles', data.patient_id))
      return { ...data, patient: patSnap.exists() ? patSnap.data() : null }
    }))
    setPatients(list as CaregiverPatient[])
  }

  useEffect(() => {
    if (!profile) return
    const p = profile as any
    setNotifSafezone(p.notif_safezone ?? true)
    setNotifMissed(p.notif_missed ?? true)
    setNotifMood(p.notif_mood ?? false)
    loadPatients()
  }, [profile])

  async function handleConnect() {
    if (!profile) return
    setConnectLoading(true)
    setConnectError('')
    setConnectSuccess('')
    try {
      const result = await fsConnectPatientByCode(profile.id, connectCode)
      if (result.success) {
        setConnectSuccess(tr(`Connected to ${result.patientName}!`, `${result.patientName}-à¦à¦° à¦¸à¦¾à¦¥à§‡ à¦¯à§à¦•à§à¦¤ à¦¹à¦¯à¦¼à§‡à¦›à§‡!`))
        setConnectCode('')
        await loadPatients()
        setTimeout(() => { setConnectOpen(false); setConnectSuccess('') }, 2000)
      } else {
        setConnectError(result.error)
      }
    } catch {
      setConnectError(tr('Something went wrong. Try again.', 'à¦•à¦¿à¦›à§ à¦à¦•à¦Ÿà¦¾ à¦ à¦¿à¦• à¦¹à¦¯à¦¼à¦¨à¦¿à¥¤ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤'))
    } finally {
      setConnectLoading(false)
    }
  }

  function startEdit() {
    setEditName(profile?.name || firebaseUser?.displayName || '')
    setEditPhone((profile as any)?.phone || '')
    setEditLang(profile?.language || 'en')
    setEditing(true)
  }

  async function saveEdit() {
    setSaving(true)
    try {
      await updateProfile({ name: editName.trim() || profile?.name, phone: editPhone.trim() || undefined, language: editLang })
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

  async function toggleSafezone() {
    const next = !notifSafezone
    setNotifSafezone(next)
    await updateProfile({ notif_safezone: next } as any)
  }

  async function toggleMissed() {
    const next = !notifMissed
    setNotifMissed(next)
    await updateProfile({ notif_missed: next } as any)
  }

  async function toggleMood() {
    const next = !notifMood
    setNotifMood(next)
    await updateProfile({ notif_mood: next } as any)
  }

  async function handleLangSwitch(l: 'en' | 'bn') {
    setLang(l)
    await updateProfile({ language: l })
  }

  async function handleSignOut() {
    await signOut()
    navigate('/welcome', { replace: true })
  }

  const displayName = profile?.name || firebaseUser?.displayName || 'User'
  const photoSrc = profile?.avatar_url || firebaseUser?.photoURL

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
            {tr('Profile', 'à¦ªà§à¦°à§‹à¦«à¦¾à¦‡à¦²')}
          </div>
          <button onClick={startEdit} style={{
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff', padding: '6px 14px', borderRadius: 16, cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
          }}>
            {tr('Edit', 'à¦à¦¡à¦¿à¦Ÿ')}
          </button>
        </div>
      </div>

      {/* Avatar overlap card */}
      <div style={{ position: 'relative', marginTop: -56, padding: '0 20px' }}>
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 22, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
              title={tr('Change photo', 'à¦›à¦¬à¦¿ à¦ªà¦°à¦¿à¦¬à¦°à§à¦¤à¦¨')}
            >
              {photoUploading ? (
                <span style={{ fontSize: 11, fontWeight: 700 }}>{photoProgress}%</span>
              ) : photoSrc ? (
                <img src={photoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                displayName[0].toUpperCase()
              )}
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.2s', borderRadius: '50%',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
              >
                <Icon name="camera" size={22} color="#fff" />
              </div>
            </button>

            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--color-ink)', letterSpacing: -0.3 }}>{displayName}</div>
              <div style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>{(profile as any)?.phone || profile?.email}</div>
              <div style={{ fontSize: 12, color: 'var(--color-good)', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--color-good)', display: 'inline-block' }} />
                {tr('Verified caregiver', 'à¦¯à¦¾à¦šà¦¾à¦‡à¦•à§ƒà¦¤ à¦•à§‡à¦¯à¦¼à¦¾à¦°à¦—à¦¿à¦­à¦¾à¦°')}
              </div>
            </div>
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
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>
              {tr('Edit profile', 'à¦ªà§à¦°à§‹à¦«à¦¾à¦‡à¦² à¦¸à¦®à§à¦ªà¦¾à¦¦à¦¨à¦¾')}
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-mute)', display: 'block', marginBottom: 4 }}>{tr('Name', 'à¦¨à¦¾à¦®')}</label>
              <input
                style={{ width: '100%', background: 'var(--color-bg-warm)', border: '1.5px solid var(--color-border)', borderRadius: 10, padding: '10px 12px', fontSize: 15, color: 'var(--color-ink)', outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder={displayName}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-mute)', display: 'block', marginBottom: 4 }}>{tr('Phone number', 'à¦«à§‹à¦¨ à¦¨à¦®à§à¦¬à¦°')}</label>
              <input
                type="tel"
                style={{ width: '100%', background: 'var(--color-bg-warm)', border: '1.5px solid var(--color-border)', borderRadius: 10, padding: '10px 12px', fontSize: 15, color: 'var(--color-ink)', outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }}
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
                placeholder="+880 1XXX XXXXXX"
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-mute)', display: 'block', marginBottom: 4 }}>{tr('Language', 'à¦­à¦¾à¦·à¦¾')}</label>
              <div style={{ display: 'flex', background: 'var(--color-bg-warm)', padding: 4, borderRadius: 14, gap: 4 }}>
                {(['en', 'bn'] as const).map(l => (
                  <button key={l} onClick={() => setEditLang(l)} style={{
                    flex: 1, background: editLang === l ? 'var(--color-accent)' : 'transparent',
                    color: editLang === l ? '#fff' : 'var(--color-ink-soft)',
                    border: 'none', cursor: 'pointer',
                    padding: '10px 16px', borderRadius: 10,
                    fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
                  }}>
                    {l === 'en' ? 'English' : 'à¦¬à¦¾à¦‚à¦²à¦¾'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-mute)', display: 'block', marginBottom: 8 }}>{tr('Profile photo', 'à¦ªà§à¦°à§‹à¦«à¦¾à¦‡à¦² à¦›à¦¬à¦¿')}</label>
              <button
                onClick={() => photoInputRef.current?.click()}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10, cursor: 'pointer',
                  background: 'var(--color-bg-warm)', border: '1.5px dashed var(--color-border)',
                  color: 'var(--color-accent)', fontWeight: 700, fontSize: 14,
                  fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {photoUploading ? `${tr('Uploading', 'à¦†à¦ªà¦²à§‹à¦¡ à¦¹à¦šà§à¦›à§‡')} ${photoProgress}%` : tr('ðŸ"·  Choose photo from device', 'ðŸ"·  à¦¡à¦¿à¦­à¦¾à¦‡à¦¸ à¦¥à§‡à¦•à§‡ à¦›à¦¬à¦¿ à¦¬à§‡à¦›à§‡ à¦¨à¦¾à¦"')}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditing(false)} style={{
                flex: 1, minHeight: 48, borderRadius: 14,
                background: 'transparent', border: '1.5px solid var(--color-border)',
                color: 'var(--color-ink-soft)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}>
                {tr('Cancel', 'à¦¬à¦¾à¦¤à¦¿à¦²')}
              </button>
              <button onClick={saveEdit} disabled={saving} style={{
                flex: 1, minHeight: 48, borderRadius: 14,
                background: 'var(--color-accent)', border: 'none',
                color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {saving
                  ? <span style={{ width: 18, height: 18, borderRadius: 9, border: '2.5px solid #fff', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  : tr('Save', 'à¦¸à¦‚à¦°à¦•à§à¦·à¦£')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Language toggle */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 16, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--color-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chat" size={20} color="var(--color-accent-dark)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>
                {lang === 'bn' ? 'à¦­à¦¾à¦·à¦¾ / Language' : 'Language / à¦­à¦¾à¦·à¦¾'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-ink-soft)' }}>
                {lang === 'bn' ? 'à¦ªà§à¦°à§‹ à¦…à§à¦¯à¦¾à¦ªà§‡à¦° à¦­à¦¾à¦·à¦¾ à¦¬à¦¦à¦²à¦¾à¦"' : 'Switch the whole app language'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', background: 'var(--color-bg-warm)', padding: 4, borderRadius: 14, gap: 4 }}>
            {[{ v: 'en', label: 'English', sub: 'ENGLISH' }, { v: 'bn', label: 'à¦¬à¦¾à¦‚à¦²à¦¾', sub: 'BANGLA' }].map(opt => (
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

      {/* Patients I care for */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1 }}>
            {tr('PATIENTS I CARE FOR', 'à¦¯à¦¾à¦¦à§‡à¦° à¦†à¦®à¦¿ à¦ªà¦°à¦¿à¦šà¦°à§à¦¯à¦¾ à¦•à¦°à¦¿')}
          </div>
          <button
            onClick={() => { setConnectOpen(true); setConnectCode(''); setConnectError(''); setConnectSuccess('') }}
            style={{
              background: 'var(--color-accent)', color: '#fff', border: 'none',
              borderRadius: 12, padding: '6px 14px', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Icon name="plus" size={14} color="#fff" />
            {tr('Add patient', 'à¦°à§‹à¦—à§€ à¦¯à§‹à¦—')}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {patients.length === 0 ? (
            <div style={{
              background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
              borderRadius: 16, padding: 20, textAlign: 'center',
            }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>ðŸ§'â€âš•ï¸</div>
              <div style={{ color: 'var(--color-ink)', fontSize: 15, fontWeight: 700 }}>
                {tr('No patients connected yet', 'à¦à¦–à¦¨à§‹ à¦•à§‹à¦¨à§‹ à¦°à§‹à¦—à§€ à¦¯à§à¦•à§à¦¤ à¦¨à§‡à¦‡')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-ink-soft)', marginTop: 6 }}>
                {tr('Ask your patient for their 6-digit code, then tap "Add patient" above.', 'à¦°à§‹à¦—à§€à¦° à§¬ à¦¸à¦‚à¦–à§à¦¯à¦¾à¦° à¦•à§‹à¦¡ à¦¨à¦¿à¦¨, à¦¤à¦¾à¦°à¦ªà¦° à¦‰à¦ªà¦°à§‡ "à¦°à§‹à¦—à§€ à¦¯à§‹à¦—" à¦Ÿà§à¦¯à¦¾à¦ª à¦•à¦°à§à¦¨à¥¤')}
              </div>
            </div>
          ) : (
            patients.map(cp => (
              <div key={cp.patient_id} style={{
                background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                borderRadius: 16, padding: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 28,
                    background: 'var(--color-accent)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 800, overflow: 'hidden',
                  }}>
                    {(cp.patient as any)?.avatar_url
                      ? <img src={(cp.patient as any).avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: 28, objectFit: 'cover' }} />
                      : (cp.patient?.name || 'P')[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--color-ink)' }}>{cp.patient?.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>
                      {(cp.patient as any)?.age ? `${(cp.patient as any).age} yrs Â· ` : ''}{tr('Patient', 'à¦°à§‹à¦—à§€')}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700,
                    background: 'var(--color-good-soft)', color: 'var(--color-good)',
                    padding: '4px 10px', borderRadius: 10,
                  }}>â— {tr('Active', 'à¦¸à¦•à§à¦°à¦¿à¦¯à¦¼')}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Notifications */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
          {tr('NOTIFICATIONS', 'à¦¨à§‹à¦Ÿà¦¿à¦«à¦¿à¦•à§‡à¦¶à¦¨')}
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
          <Row
            icon="bell"
            label={tr('Emergency alerts', 'à¦œà¦°à§à¦°à¦¿ à¦¸à¦¤à¦°à§à¦•à¦¤à¦¾')}
            value={tr('Always on', 'à¦¸à¦¬à¦¸à¦®à¦¯à¦¼ à¦šà¦¾à¦²à§')}
            action={<Toggle on={notifEmergency} onToggle={() => {}} disabled />}
          />
          <Row
            icon="map"
            label={tr('Safe zone alerts', 'à¦¨à¦¿à¦°à¦¾à¦ªà¦¦ à¦…à¦žà§à¦šà¦²à§‡à¦° à¦¸à¦¤à¦°à§à¦•à¦¤à¦¾')}
            value={notifSafezone ? tr('On Â· 500m radius', 'à¦šà¦¾à¦²à§ Â· à§«à§¦à§¦ à¦®à¦¿à¦Ÿà¦¾à¦°') : tr('Off', 'à¦¬à¦¨à§à¦§')}
            action={<Toggle on={notifSafezone} onToggle={toggleSafezone} />}
          />
          <Row
            icon="walk"
            label={tr('Missed reminders', 'à¦®à¦¿à¦¸ à¦¹à¦"à¦¯à¦¼à¦¾ à¦°à¦¿à¦®à¦¾à¦‡à¦¨à§à¦¡à¦¾à¦°')}
            value={notifMissed ? tr('Alert after 15 min', 'à§§à§« à¦®à¦¿à¦¨à¦¿à¦Ÿ à¦ªà¦°à§‡ à¦œà¦¾à¦¨à¦¾à¦"') : tr('Off', 'à¦¬à¦¨à§à¦§')}
            action={<Toggle on={notifMissed} onToggle={toggleMissed} />}
          />
          <Row
            icon="heart"
            label={tr('Mood drops', 'à¦®à§‡à¦œà¦¾à¦œ à¦ªà¦°à¦¿à¦¬à¦°à§à¦¤à¦¨')}
            value={notifMood ? tr('On Â· 3+ days low', 'à¦šà¦¾à¦²à§ Â· à§©+ à¦¦à¦¿à¦¨ à¦•à¦®') : tr('Off', 'à¦¬à¦¨à§à¦§')}
            action={<Toggle on={notifMood} onToggle={toggleMood} />}
          />
        </div>
      </div>

      {/* Account */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
          {tr('ACCOUNT', 'à¦…à§à¦¯à¦¾à¦•à¦¾à¦‰à¦¨à§à¦Ÿ')}
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
          <Row
            icon="shield"
            label={tr('Privacy & data', 'à¦—à§‹à¦ªà¦¨à§€à¦¯à¦¼à¦¤à¦¾ à¦" à¦¡à§‡à¦Ÿà¦¾')}
            value={tr('End-to-end encrypted', 'à¦à¦¨à§à¦¡-à¦Ÿà§-à¦à¦¨à§à¦¡ à¦à¦¨à¦•à§à¦°à¦¿à¦ªà§à¦Ÿà§‡à¦¡')}
            onClick={() => alert(tr('All data is encrypted and private.', 'à¦¸à¦¬ à¦¡à§‡à¦Ÿà¦¾ à¦à¦¨à¦•à§à¦°à¦¿à¦ªà§à¦Ÿà§‡à¦¡ à¦à¦¬à¦‚ à¦¬à§à¦¯à¦•à§à¦¤à¦¿à¦—à¦¤à¥¤'))}
          />
          <Row
            icon="sparkle"
            label={tr('Help & support', 'à¦¸à¦¾à¦¹à¦¾à¦¯à§à¦¯ à¦" à¦¸à¦¹à¦¾à¦¯à¦¼à¦¤à¦¾')}
            value={tr('FAQs and guides', 'à¦ªà§à¦°à¦¶à§à¦¨à§‹à¦¤à§à¦¤à¦° à¦" à¦—à¦¾à¦‡à¦¡')}
            onClick={() => alert(tr('Help centre coming soon!', 'à¦¸à¦¾à¦¹à¦¾à¦¯à§à¦¯ à¦•à§‡à¦¨à§à¦¦à§à¦° à¦¶à§€à¦˜à§à¦°à¦‡ à¦†à¦¸à¦›à§‡!'))}
          />
          <Row
            icon="log-out"
            label={tr('Sign out', 'à¦¸à¦¾à¦‡à¦¨ à¦†à¦‰à¦Ÿ')}
            danger
            onClick={() => setConfirmSignOut(true)}
            action={<span style={{ color: 'var(--color-danger)', fontSize: 20 }}>â€º</span>}
          />
        </div>
      </div>

      <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-ink-mute)', fontSize: 12 }}>
        Memory Mate v1.0 Â· Made with care
      </div>

      {/* Connect patient sheet */}
      {connectOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setConnectOpen(false)}
        >
          <div
            style={{ width: '100%', background: 'var(--color-bg)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--color-border)', margin: '0 auto 20px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: 28, background: 'var(--color-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="user" size={28} color="var(--color-accent)" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--color-ink)' }}>
                  {tr('Connect a patient', 'à¦°à§‹à¦—à§€ à¦¯à§‹à¦— à¦•à¦°à§à¦¨')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-ink-soft)', marginTop: 2 }}>
                  {tr('Enter the 6-digit code from the patient\'s profile', 'à¦°à§‹à¦—à§€à¦° à¦ªà§à¦°à§‹à¦«à¦¾à¦‡à¦² à¦¥à§‡à¦•à§‡ à§¬ à¦¸à¦‚à¦–à§à¦¯à¦¾à¦° à¦•à§‹à¦¡ à¦¦à¦¿à¦¨')}
                </div>
              </div>
            </div>

            {/* Code input */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-ink-mute)', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
                {tr('PATIENT CAREGIVER CODE', 'à¦°à§‹à¦—à§€à¦° à¦•à§‡à¦¯à¦¼à¦¾à¦°à¦—à¦¿à¦­à¦¾à¦° à¦•à§‹à¦¡')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={7}
                placeholder="000 000"
                value={connectCode}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setConnectCode(raw.length > 3 ? `${raw.slice(0, 3)} ${raw.slice(3)}` : raw)
                  setConnectError('')
                }}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--color-surface)', border: `1.5px solid ${connectError ? 'var(--color-danger)' : 'var(--color-border)'}`,
                  borderRadius: 14, padding: '16px 18px',
                  fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800,
                  letterSpacing: 8, color: 'var(--color-ink)', textAlign: 'center',
                  outline: 'none',
                }}
                autoFocus
              />
              {connectError && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--color-danger)', fontWeight: 600, textAlign: 'center' }}>
                  {connectError}
                </div>
              )}
              {connectSuccess && (
                <div style={{ marginTop: 8, fontSize: 14, color: 'var(--color-good)', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon name="check" size={18} color="var(--color-good)" /> {connectSuccess}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setConnectOpen(false)} style={{
                background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                padding: '14px 0', borderRadius: 14, cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--color-ink)',
              }}>
                {tr('Cancel', 'à¦¬à¦¾à¦¤à¦¿à¦²')}
              </button>
              <button
                onClick={handleConnect}
                disabled={connectLoading || connectCode.replace(/\s/g, '').length !== 6}
                style={{
                  background: 'var(--color-accent)', color: '#fff', border: 'none',
                  padding: '14px 0', borderRadius: 14, cursor: connectLoading ? 'default' : 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: connectCode.replace(/\s/g, '').length !== 6 ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {connectLoading
                  ? <span style={{ width: 20, height: 20, borderRadius: 10, border: '2.5px solid #fff', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  : tr('Connect', 'à¦¯à§à¦•à§à¦¤ à¦•à¦°à§à¦¨')}
              </button>
            </div>
          </div>
        </div>
      )}

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
              {tr('Sign out?', 'à¦¸à¦¾à¦‡à¦¨ à¦†à¦‰à¦Ÿ à¦•à¦°à¦¬à§‡à¦¨?')}
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: '0 0 20px' }}>
              {tr('You will be taken to the welcome screen.', 'à¦†à¦ªà¦¨à¦¾à¦•à§‡ à¦¸à§à¦¬à¦¾à¦—à¦¤ à¦ªà§ƒà¦·à§à¦ à¦¾à¦¯à¦¼ à¦¨à¦¿à¦¯à¦¼à§‡ à¦¯à¦¾à¦"à¦¯à¦¼à¦¾ à¦¹à¦¬à§‡à¥¤')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => setConfirmSignOut(false)} style={{
                background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                padding: '14px 0', borderRadius: 14, cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--color-ink)',
              }}>
                {tr('Cancel', 'à¦¬à¦¾à¦¤à¦¿à¦²')}
              </button>
              <button onClick={handleSignOut} style={{
                background: 'var(--color-danger)', color: '#fff', border: 'none',
                padding: '14px 0', borderRadius: 14, cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
              }}>
                {tr('Sign out', 'à¦¸à¦¾à¦‡à¦¨ à¦†à¦‰à¦Ÿ')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

