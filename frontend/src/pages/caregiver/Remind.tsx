import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { db, fsListenReminders, fsAddReminder, fsDeleteReminder } from '@/lib/firebase'
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { CaregiverPatient, PlanType, Reminder } from '@/types'
import Icon from '@/components/ui/Icon'
import { format } from 'date-fns'
import { buildCalendarUrl } from '@/lib/googleCalendar'

const TYPES: Array<{ id: PlanType; icon: string; label: string; labelBn: string }> = [
  { id: 'medicine',    icon: 'pill',     label: 'Medicine', labelBn: 'à¦“à¦·à§à¦§' },
  { id: 'visit',       icon: 'calendar', label: 'Visit',    labelBn: 'à¦¸à¦¾à¦•à§à¦·à¦¾à§Ž' },
  { id: 'task',        icon: 'walk',     label: 'Task',     labelBn: 'à¦•à¦¾à¦œ' },
  { id: 'call',        icon: 'phone',    label: 'Call',     labelBn: 'à¦•à¦²' },
]

const TYPE_ICON_COLOR: Record<PlanType, string> = {
  medicine:    'var(--color-danger)',
  visit:       'var(--color-warn)',
  task:        'var(--color-good)',
  call:        'var(--color-accent)',
  appointment: 'var(--color-accent)',
}

export default function Remind() {
  const { profile } = useAuth()
  const { tr } = useLang()
  const [patients, setPatients] = useState<CaregiverPatient[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [type, setType] = useState<PlanType>('medicine')
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('08:30')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [recurring, setRecurring] = useState(true)
  const [notifyPush, setNotifyPush] = useState(true)
  const [notifyVoice, setNotifyVoice] = useState(true)
  const [notifySms, setNotifySms] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!profile) return
    async function loadPatients() {
      const snap = await getDocs(query(
        collection(db, 'caregiver_patients'),
        where('caregiver_id', '==', profile!.id),
        where('status', '==', 'active')
      ))
      const list = await Promise.all(snap.docs.map(async d => {
        const data = d.data()
        const patSnap = await getDoc(doc(db, 'profiles', data.patient_id))
        return { ...data, patient: patSnap.exists() ? patSnap.data() : null }
      }))
      setPatients(list as CaregiverPatient[])
    }
    loadPatients()
    const unsub = fsListenReminders(profile.id, rems => setReminders(rems as unknown as Reminder[]))
    return unsub
  }, [profile])

  const isMobile = useIsMobile()
  const selectedPatient = patients[0]

  async function save() {
    if (!title.trim() || !selectedPatient) return
    setSaving(true)
    await fsAddReminder({
      caregiverId: profile?.id,
      patientId: selectedPatient.patient_id,
      title, type, time, date,
      is_recurring: recurring,
      recurrence: recurring ? 'daily' : null,
      notify_push: notifyPush,
      notify_voice: notifyVoice,
      notify_sms: notifySms,
    })
    setSaved(true)
    // Open Google Calendar with the reminder pre-filled
    const calUrl = buildCalendarUrl({ title, date, time, description: `Memory Mate reminder for patient` })
    window.open(calUrl, '_blank')
    setTitle('')
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  async function deleteReminder(id: string) {
    await fsDeleteReminder(id)
  }

  // â”€â”€ Toggle switch â”€â”€
  function ToggleRow({ label, labelBn, val, set }: { label: string; labelBn: string; val: boolean; set: (v: boolean) => void }) {
    return (
      <div
        style={{
          padding: 14, display: 'flex', alignItems: 'center',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{ flex: 1, fontSize: 15, color: 'var(--color-ink)', fontWeight: 500 }}>
          {tr(label, labelBn)}
        </div>
        <button
          onClick={() => set(!val)}
          style={{
            width: 44, height: 26, borderRadius: 13,
            background: val ? 'var(--color-accent)' : 'var(--color-border)',
            position: 'relative', border: 'none', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <div style={{
            position: 'absolute', top: 2, [val ? 'right' : 'left']: 2,
            width: 22, height: 22, borderRadius: 11, background: '#fff',
            transition: 'left 0.15s, right 0.15s',
          }} />
        </button>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', minHeight: '100%',
      background: 'var(--color-bg)', fontFamily: 'var(--font-body)',
      paddingBottom: 30,
    }}>
    <div className={isMobile ? undefined : 'desktop-content'}>
      {/* â”€â”€ Header â”€â”€ */}
      <div style={{ padding: '8px 16px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, margin: 0, flex: 1, color: 'var(--color-ink)' }}>
          {tr('New reminder', 'à¦¨à¦¤à§à¦¨ à¦…à¦¨à§à¦¸à§à¦®à¦¾à¦°à¦•')}
        </h1>
        <button
          onClick={save}
          disabled={!title.trim() || saving || !selectedPatient}
          style={{
            fontSize: 14, color: !title.trim() || !selectedPatient ? 'var(--color-ink-mute)' : 'var(--color-accent)',
            fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
          }}
        >
          {saving ? 'â€¦' : saved ? 'âœ“ Saved' : tr('Save', 'à¦¸à¦‚à¦°à¦•à§à¦·à¦£')}
        </button>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* â”€â”€ Type grid â”€â”€ */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-ink-soft)', fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>
            {tr('TYPE', 'à¦§à¦°à¦¨')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {TYPES.map(opt => (
              <button
                key={opt.id}
                onClick={() => setType(opt.id)}
                style={{
                  background: type === opt.id ? 'var(--color-accent)' : 'var(--color-surface)',
                  color: type === opt.id ? '#fff' : 'var(--color-ink)',
                  border: `1px solid ${type === opt.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  borderRadius: 14, padding: '12px 4px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}
              >
                <Icon name={opt.icon} size={20} color={type === opt.id ? '#fff' : TYPE_ICON_COLOR[opt.id]} />
                <div style={{ fontSize: 12, fontWeight: 600 }}>{tr(opt.label, opt.labelBn)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* â”€â”€ Title card â”€â”€ */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 18, padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--color-ink-soft)', fontWeight: 600, marginBottom: 6 }}>
            {tr('TITLE', 'à¦¶à¦¿à¦°à§‹à¦¨à¦¾à¦®')}
          </div>
          <input
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              fontSize: 17, fontWeight: 600, color: 'var(--color-ink)',
              fontFamily: 'var(--font-body)', boxSizing: 'border-box',
            }}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={tr('e.g. Blue pill after breakfast', 'à¦¯à§‡à¦®à¦¨: à¦¸à¦•à¦¾à¦²à§‡à¦° à¦“à¦·à§à¦§')}
          />
        </div>

        {/* â”€â”€ Schedule card â”€â”€ */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 18, overflow: 'hidden' }}>
          {/* Recurring toggle */}
          <div style={{ padding: 14, borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--color-ink-soft)', fontWeight: 600 }}>{tr('RECURRING', 'à¦ªà§à¦¨à¦°à¦¾à¦¬à§ƒà¦¤à§à¦¤à¦¿')}</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2, color: 'var(--color-ink)' }}>
                {recurring ? tr('Every day', 'à¦ªà§à¦°à¦¤à¦¿à¦¦à¦¿à¦¨') : tr('One time', 'à¦à¦•à¦¬à¦¾à¦°')}
              </div>
            </div>
            <button
              onClick={() => setRecurring(!recurring)}
              style={{
                width: 48, height: 28, borderRadius: 14,
                background: recurring ? 'var(--color-accent)' : 'var(--color-border)',
                position: 'relative', border: 'none', cursor: 'pointer',
              }}
            >
              <div style={{
                position: 'absolute', top: 2, [recurring ? 'right' : 'left']: 2,
                width: 24, height: 24, borderRadius: 12, background: '#fff',
              }} />
            </button>
          </div>

          {/* Time + Date */}
          <div style={{ padding: 14, display: 'flex', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--color-ink-soft)', fontWeight: 600 }}>{tr('TIME', 'à¦¸à¦®à¦¯à¦¼')}</div>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{
                  fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginTop: 2,
                  color: 'var(--color-ink)', background: 'transparent', border: 'none',
                  outline: 'none', padding: 0, width: '100%',
                }}
              />
            </div>
            {!recurring && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--color-ink-soft)', fontWeight: 600 }}>{tr('DATE', 'à¦¤à¦¾à¦°à¦¿à¦–')}</div>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{
                    fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginTop: 2,
                    color: 'var(--color-ink)', background: 'transparent', border: 'none',
                    outline: 'none', padding: 0, width: '100%',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* â”€â”€ Delivery â”€â”€ */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-ink-soft)', fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>
            {tr('DELIVERY', 'à¦ªà¦¾à¦ à¦¾à¦¨à§‹à¦° à¦ªà¦¦à§à¦§à¦¤à¦¿')}
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 18, overflow: 'hidden' }}>
            <ToggleRow label="Push notification"          labelBn="à¦ªà§à¦¶ à¦¨à§‹à¦Ÿà¦¿à¦«à¦¿à¦•à§‡à¦¶à¦¨"             val={notifyPush}  set={setNotifyPush} />
            <ToggleRow label="Voice in morning briefing"  labelBn="à¦¸à¦•à¦¾à¦²à§‡à¦° à¦¸à¦¾à¦°à¦¸à¦‚à¦•à§à¦·à§‡à¦ªà§‡ à¦­à¦¯à¦¼à§‡à¦¸"   val={notifyVoice} set={setNotifyVoice} />
            <div style={{ borderBottom: 'none' }}>
              <ToggleRow label="SMS if missed"            labelBn="à¦®à¦¿à¦¸ à¦¹à¦²à§‡ SMS"                val={notifySms}   set={setNotifySms} />
            </div>
          </div>
        </div>

        {/* â”€â”€ Save button â”€â”€ */}
        <button
          onClick={save}
          disabled={!title.trim() || saving || !selectedPatient}
          style={{
            width: '100%', minHeight: 54, borderRadius: 16,
            background: saved ? 'var(--color-accent-soft)' : 'var(--color-accent)',
            color: saved ? 'var(--color-accent-dark)' : '#fff',
            border: 'none', cursor: !title.trim() || !selectedPatient ? 'not-allowed' : 'pointer',
            opacity: !title.trim() || !selectedPatient ? 0.5 : 1,
            fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          {saving
            ? <span style={{ width: 20, height: 20, borderRadius: 10, border: '2.5px solid #fff', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', display: 'block' }} />
            : saved
              ? <><Icon name="check" size={18} color="var(--color-accent-dark)" /> {tr('Reminder saved!', 'à¦…à¦¨à§à¦¸à§à¦®à¦¾à¦°à¦• à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤!')}</>
              : <><Icon name="bell" size={18} color="#fff" /> {tr('Save reminder', 'à¦…à¦¨à§à¦¸à§à¦®à¦¾à¦°à¦• à¦¸à¦‚à¦°à¦•à§à¦·à¦£ à¦•à¦°à§à¦¨')}</>
          }
        </button>

        {/* â”€â”€ Recent reminders â”€â”€ */}
        {reminders.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-soft)', fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>
              {tr('RECENT REMINDERS', 'à¦¸à¦¾à¦®à§à¦ªà§à¦°à¦¤à¦¿à¦• à¦…à¦¨à§à¦¸à§à¦®à¦¾à¦°à¦•')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reminders.map(r => {
                const iconColor = TYPE_ICON_COLOR[r.type] || 'var(--color-accent)'
                const iconName = TYPES.find(t => t.id === r.type)?.icon || 'bell'
                return (
                  <div key={r.id} style={{
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 16, padding: 14,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                      background: 'var(--color-accent-soft)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={iconName} size={18} color={iconColor} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-ink)' }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-ink-mute)', marginTop: 2 }}>
                        {r.time} Â· {r.is_recurring ? tr('Daily', 'à¦ªà§à¦°à¦¤à¦¿à¦¦à¦¿à¦¨') : r.date}
                      </div>
                    </div>
                    <button onClick={() => deleteReminder(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-ink-mute)' }}>
                      <Icon name="trash" size={16} color="var(--color-ink-mute)" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}

