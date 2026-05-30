import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { Plan, PlanType, CaregiverPatient } from '@/types'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import { format, addDays, startOfDay } from 'date-fns'
import { db, fsListenPlans, fsAddPlan, fsUpdatePlan, fsDeletePlan } from '@/lib/firebase'
import { collection, query, where, getDocs, getDoc, doc as fsDoc, onSnapshot } from 'firebase/firestore'
import { fmtDayShort, fmtMonthDay, fmtDayFull, fmtMonthShort, fmtDayNum, toBnDigits } from '@/lib/dateLocale'
import { buildCalendarUrl } from '@/lib/googleCalendar'
import PlanCalendarModal from '@/components/ui/PlanCalendarModal'

function isoDate(d: Date) { return format(d, 'yyyy-MM-dd') }

function fmtDayLabel(d: Date, today: Date, tr: (en: string, bn: string) => string, lang: 'en' | 'bn') {
  const todayStr = isoDate(today)
  const ds = isoDate(d)
  if (ds === todayStr) return tr('Today', 'আজ')
  if (ds === isoDate(addDays(today, 1))) return tr('Tomorrow', 'আগামীকাল')
  if (ds === isoDate(addDays(today, -1))) return tr('Yesterday', 'গতকাল')
  return `${fmtDayFull(d, lang)}, ${fmtMonthDay(d, lang)}`
}

const TYPE_ICONS: Record<PlanType, string> = {
  medicine: 'pill', call: 'phone', visit: 'heart',
  task: 'check', appointment: 'calendar',
}

const PLAN_TYPES = [
  { v: 'medicine'    as PlanType, en: 'Medicine',    bn: 'ওষুধ' },
  { v: 'call'        as PlanType, en: 'Call',         bn: 'ফোন' },
  { v: 'visit'       as PlanType, en: 'Visit',        bn: 'দেখা' },
  { v: 'task'        as PlanType, en: 'Task',         bn: 'কাজ' },
  { v: 'appointment' as PlanType, en: 'Appointment',  bn: 'অ্যাপয়েন্টমেন্ট' },
]

const QUICK_TIMES = ['7:00 AM', '8:30 AM', '11:00 AM', '1:00 PM', '4:00 PM', '8:00 PM']

// 30 days so caregiver can plan far ahead
const DAYS_AHEAD = 30

export default function Plans() {
  const { profile } = useAuth()
  const { tr, lang } = useLang()
  const today = startOfDay(new Date())

  const [patients, setPatients] = useState<CaregiverPatient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<CaregiverPatient | null>(null)
  const [selectedDate, setSelectedDate] = useState(today)
  const [plans, setPlans] = useState<Plan[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [planDatesMap, setPlanDatesMap] = useState<Record<string, string[]>>({})
  const [showCalendar, setShowCalendar] = useState(false)
  const [calViewDate, setCalViewDate] = useState(today)

  // Add-form state
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<PlanType>('task')
  const [newTime, setNewTime] = useState('09:00 AM')
  const [newRecurring, setNewRecurring] = useState(false)

  // 30-day strip from today
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i))
  const dateStr = isoDate(selectedDate)
  const todayStr = isoDate(today)

  // ── Load patients ─────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return
    async function load() {
      const snap = await getDocs(query(
        collection(db, 'caregiver_patients'),
        where('caregiver_id', '==', profile!.id),
        where('status', '==', 'active')
      ))
      const list = await Promise.all(snap.docs.map(async d => {
        const data = d.data()
        const patSnap = await getDoc(fsDoc(db, 'profiles', data.patient_id))
        return { ...data, patient: patSnap.exists() ? patSnap.data() : null }
      })) as CaregiverPatient[]
      setPatients(list)
      if (list.length > 0) setSelectedPatient(list[0])
    }
    load()
  }, [profile])

  // ── Plans listener ────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPatient) return
    const unsub = fsListenPlans(
      selectedPatient.patient_id,
      dateStr,
      docs => setPlans(docs as unknown as Plan[])
    )
    return unsub
  }, [selectedPatient, dateStr])

  // ── Track all plan dates for selected patient (calendar dots) ────────
  useEffect(() => {
    if (!selectedPatient) return
    const q = query(
      collection(db, 'plans'),
      where('patientId', '==', selectedPatient.patient_id)
    )
    const unsub = onSnapshot(q, snap => {
      const map: Record<string, string[]> = {}
      snap.docs.forEach(d => {
        const date = d.data().date as string
        const type = (d.data().type as string) || 'task'
        if (!map[date]) map[date] = []
        if (!map[date].includes(type)) map[date].push(type)
      })
      setPlanDatesMap(map)
    }, err => console.warn('planDatesMap error:', err.message))
    return unsub
  }, [selectedPatient])

  // ── Plan CRUD ─────────────────────────────────────────────────
  async function addPlan() {
    if (!selectedPatient || !newTitle.trim()) return
    setSaving(true)
    await fsAddPlan(selectedPatient.patient_id, {
      title: newTitle, type: newType, date: dateStr,
      time: newTime, is_recurring: newRecurring,
      recurrence: newRecurring ? 'daily' : null, is_done: false,
      createdBy: profile?.id,
    })
    setShowAdd(false)
    setNewTitle(''); setNewType('task'); setNewTime('09:00 AM'); setNewRecurring(false)
    setSaving(false)
  }

  async function toggleDone(plan: Plan) { await fsUpdatePlan(plan.id, { is_done: !plan.is_done }) }
  async function deletePlan(id: string) { await fsDeletePlan(id); setConfirmDelete(null) }

  const sorted = [...plans].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const isPastDate = isoDate(selectedDate) < todayStr

  const patientName = selectedPatient?.patient?.name || tr('Patient', 'রোগী')

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--color-bg)', fontFamily: 'var(--font-body)',
      overflow: 'hidden',
    }}>

      {/* ── Header ── */}
      <div style={{ padding: '12px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, letterSpacing: 1.5, color: 'var(--color-ink-mute)', fontWeight: 700 }}>
              {tr('PLANS FOR', 'পরিকল্পনা')}
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800,
              margin: '2px 0 0', color: 'var(--color-ink)', letterSpacing: -0.5,
            }}>
              {fmtDayLabel(selectedDate, today, tr, lang)}
            </h1>
            <div style={{ fontSize: 13, color: 'var(--color-ink-soft)', marginTop: 2 }}>
              {lang === 'bn' ? toBnDigits(sorted.length) : sorted.length} {tr(sorted.length === 1 ? 'event' : 'events', 'টি ইভেন্ট')}
              {' · '}{lang === 'bn' ? toBnDigits(sorted.filter(p => p.is_done).length) : sorted.filter(p => p.is_done).length} {tr('done', 'হয়ে গেছে')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Calendar picker icon */}
            <button
              onClick={() => setShowCalendar(true)}
              title={tr('Open calendar', 'ক্যালেন্ডার খুলুন')}
              style={{
                width: 48, height: 48, borderRadius: 16,
                background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="calendar" size={22} color="var(--color-accent)" />
            </button>
            {/* Add button — disabled on past dates or no patient */}
            <button
              onClick={() => selectedPatient && !isPastDate && setShowAdd(true)}
              disabled={!selectedPatient || isPastDate}
              style={{
                width: 52, height: 52, borderRadius: 26,
                background: !selectedPatient || isPastDate ? 'var(--color-border)' : 'var(--color-accent)',
                border: 'none',
                cursor: !selectedPatient || isPastDate ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: !selectedPatient || isPastDate ? 'none' : '0 6px 16px rgba(30,110,114,0.4)',
              }}
            >
              <Icon name="plus" size={28} color="#fff" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Patient selector ── */}
      {patients.length > 1 && (
        <div style={{ padding: '10px 24px 0', flexShrink: 0 }}>
          <div style={{ overflowX: 'auto', whiteSpace: 'nowrap', scrollbarWidth: 'none' }}>
            <div style={{ display: 'inline-flex', gap: 8 }}>
              {patients.map(p => {
                const active = p.patient_id === selectedPatient?.patient_id
                return (
                  <button
                    key={p.patient_id}
                    onClick={() => setSelectedPatient(p)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px', borderRadius: 50,
                      background: active ? 'var(--color-accent)' : 'var(--color-surface)',
                      border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      cursor: 'pointer', fontFamily: 'inherit',
                      flexShrink: 0,
                    }}
                  >
                    <Avatar name={p.patient?.name || '?'} size={22} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#fff' : 'var(--color-ink)' }}>
                      {p.patient?.name || tr('Patient', 'রোগী')}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Day strip – 30 days ── */}
      <div style={{ padding: '12px 24px 8px', overflowX: 'auto', whiteSpace: 'nowrap', flexShrink: 0, scrollbarWidth: 'none' }}>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          {days.map(d => {
            const ds = isoDate(d)
            const active = ds === dateStr
            const isToday2 = ds === todayStr
            const hasPlans = (planDatesMap[ds]?.length ?? 0) > 0
            return (
              <button key={ds} onClick={() => setSelectedDate(d)} style={{
                background: active ? 'var(--color-accent)' : 'var(--color-surface)',
                color: active ? '#fff' : 'var(--color-ink)',
                border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                borderRadius: 16, cursor: 'pointer',
                padding: '10px 0', width: 64, flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                position: 'relative', fontFamily: 'inherit',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, letterSpacing: 0.5 }}>
                  {fmtDayShort(d, lang).toUpperCase()}
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 800, lineHeight: 1,
                  color: active ? '#fff' : isToday2 ? 'var(--color-accent)' : 'var(--color-ink)',
                }}>
                  {fmtDayNum(d, lang)}
                </div>
                <div style={{ fontSize: 10, opacity: active ? 0.8 : 0.6 }}>
                  {fmtMonthShort(d, lang)}
                </div>
                {hasPlans && (
                  <div style={{ width: 5, height: 5, borderRadius: 3, marginTop: 1, background: active ? '#fff' : 'var(--color-accent)' }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── No patient state ── */}
      {!selectedPatient && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, color: 'var(--color-ink-soft)' }}>
          <Icon name="user" size={40} color="var(--color-ink-mute)" />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginTop: 14, color: 'var(--color-ink)' }}>
            {tr('No patient connected', 'কোনো রোগী সংযুক্ত নেই')}
          </div>
          <div style={{ fontSize: 14, marginTop: 4, textAlign: 'center' }}>
            {tr('Connect a patient first from the Dashboard', 'প্রথমে ড্যাশবোর্ড থেকে রোগী সংযুক্ত করুন')}
          </div>
        </div>
      )}

      {/* ── Timeline ── */}
      {selectedPatient && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 120px' }}>

          {/* Patient context pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Avatar name={patientName} size={28} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink-soft)' }}>
              {patientName}
            </span>
            <span style={{ fontSize: 13, color: 'var(--color-ink-mute)', marginLeft: 2 }}>
              · {fmtMonthDay(selectedDate, lang)}
            </span>
          </div>

          {sorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--color-ink-soft)' }}>
              <div style={{ width: 72, height: 72, margin: '0 auto', borderRadius: 36, background: 'var(--color-bg-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="calendar" size={32} color="var(--color-ink-mute)" />
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--color-ink)', marginTop: 12 }}>
                {tr('Nothing planned', 'কিছু পরিকল্পনা নেই')}
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                {tr('Tap + to add an event for this day', '+ চাপুন এই দিনের জন্য ইভেন্ট যোগ করতে')}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {sorted.map(plan => {
                const icon = TYPE_ICONS[plan.type] || 'calendar'
                return (
                  <div key={plan.id} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                    {/* Time rail */}
                    <div style={{ width: 72, flexShrink: 0, textAlign: 'right', paddingTop: 14 }}>
                      <div style={{
                        fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
                        color: plan.is_done ? 'var(--color-ink-mute)' : 'var(--color-ink)',
                        fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
                      }}>
                        {plan.time || '–'}
                      </div>
                    </div>

                    {/* Dot rail */}
                    <div style={{ width: 14, position: 'relative', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', left: 6, top: 0, bottom: -10, width: 2, background: 'var(--color-border)' }} />
                      <div style={{
                        position: 'absolute', left: 0, top: 16,
                        width: 14, height: 14, borderRadius: 8,
                        background: plan.is_done ? 'var(--color-good)' : 'var(--color-surface)',
                        border: `2px solid ${plan.is_done ? 'var(--color-good)' : 'var(--color-accent)'}`,
                      }} />
                    </div>

                    {/* Event card */}
                    <div style={{
                      flex: 1, padding: 14,
                      background: 'var(--color-surface)',
                      border: '1.5px solid var(--color-border)',
                      borderRadius: 'var(--radius)',
                      opacity: plan.is_done ? 0.55 : 1,
                      display: 'flex', gap: 10, alignItems: 'center',
                    }}>
                      {/* Toggle */}
                      <button onClick={() => toggleDone(plan)} style={{
                        width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                        background: plan.is_done ? 'var(--color-good)' : 'transparent',
                        border: `2px solid ${plan.is_done ? 'var(--color-good)' : 'var(--color-accent)'}`,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {plan.is_done && <Icon name="check" size={16} color="#fff" />}
                      </button>

                      <Icon name={icon} size={22} color={plan.is_done ? 'var(--color-good)' : 'var(--color-accent-dark)'} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 16, fontWeight: 700, lineHeight: 1.2,
                          color: plan.is_done ? 'var(--color-ink-mute)' : 'var(--color-ink)',
                          textDecoration: plan.is_done ? 'line-through' : 'none',
                        }}>
                          {plan.title}
                        </div>
                        {plan.is_recurring && (
                          <div style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 700, marginTop: 2 }}>
                            ↺ {tr('Daily', 'প্রতিদিন')}
                          </div>
                        )}
                      </div>

                      <a
                        href={buildCalendarUrl({ title: plan.title, date: plan.date, time: plan.time || undefined })}
                        target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        title="Open in Google Calendar"
                        style={{
                          width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          textDecoration: 'none', fontSize: 15, lineHeight: 1,
                        }}
                      >📅</a>

                      <button onClick={() => setConfirmDelete(plan.id)} style={{
                        width: 30, height: 30, borderRadius: 15,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--color-ink-mute)', fontSize: 18, fontWeight: 700, flexShrink: 0,
                      }}>×</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Add modal ── */}
      {showAdd && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 70, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{
            width: '100%', background: 'var(--color-bg)',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            display: 'flex', flexDirection: 'column', maxHeight: '92%', overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)' }}>
              <button onClick={() => setShowAdd(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-ink-soft)', fontSize: 15, fontFamily: 'inherit', fontWeight: 600 }}>
                {tr('Cancel', 'বাতিল')}
              </button>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--color-ink)', textAlign: 'center' }}>
                  {tr('New event', 'নতুন ইভেন্ট')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-ink-mute)', textAlign: 'center', marginTop: 1 }}>
                  {patientName} · {fmtMonthDay(selectedDate, lang)}
                </div>
              </div>
              <button onClick={addPlan} disabled={!newTitle.trim() || saving} style={{
                background: 'transparent', border: 'none',
                cursor: newTitle.trim() ? 'pointer' : 'default',
                color: newTitle.trim() ? 'var(--color-accent)' : 'var(--color-ink-mute)',
                fontSize: 15, fontFamily: 'inherit', fontWeight: 800,
              }}>
                {saving
                  ? <span style={{ width: 16, height: 16, borderRadius: 8, border: '2px solid var(--color-accent)', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                  : tr('Save', 'সংরক্ষণ')}
              </button>
            </div>

            <div style={{ overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Title */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{tr('TITLE', 'শিরোনাম')}</div>
                <input
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder={tr('e.g. Morning medicine', 'যেমন সকালের ওষুধ')}
                  style={{
                    width: '100%', background: 'var(--color-surface)',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: 14, padding: '14px 16px',
                    fontSize: 17, fontWeight: 600, color: 'var(--color-ink)',
                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Type grid */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{tr('TYPE', 'ধরন')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {PLAN_TYPES.map(opt => {
                    const a = newType === opt.v
                    return (
                      <button key={opt.v} onClick={() => setNewType(opt.v)} style={{
                        background: a ? 'var(--color-accent)' : 'var(--color-surface)',
                        color: a ? '#fff' : 'var(--color-ink)',
                        border: `1.5px solid ${a ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        borderRadius: 14, padding: '12px 4px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        fontFamily: 'inherit',
                      }}>
                        <Icon name={TYPE_ICONS[opt.v]} size={22} color={a ? '#fff' : 'var(--color-accent-dark)'} />
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{tr(opt.en, opt.bn)}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Day strip in modal */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{tr('DAY', 'দিন')}</div>
                <div style={{ overflowX: 'auto', whiteSpace: 'nowrap', scrollbarWidth: 'none' }}>
                  <div style={{ display: 'inline-flex', gap: 8 }}>
                    {days.map(d => {
                      const ds = isoDate(d)
                      const a = ds === dateStr
                      return (
                        <button key={ds} onClick={() => setSelectedDate(d)} style={{
                          background: a ? 'var(--color-accent)' : 'var(--color-surface)',
                          color: a ? '#fff' : 'var(--color-ink)',
                          border: `1.5px solid ${a ? 'var(--color-accent)' : 'var(--color-border)'}`,
                          borderRadius: 14, cursor: 'pointer',
                          padding: '10px 0', width: 62, flexShrink: 0,
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          fontFamily: 'inherit',
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.85, letterSpacing: 0.5 }}>
                            {fmtDayShort(d, lang).toUpperCase()}
                          </div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, marginTop: 2 }}>{fmtDayNum(d, lang)}</div>
                          <div style={{ fontSize: 10, opacity: 0.7 }}>{fmtMonthShort(d, lang)}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Quick times */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{tr('TIME', 'সময়')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {QUICK_TIMES.map(qt => {
                    const a = newTime === qt
                    return (
                      <button key={qt} onClick={() => setNewTime(qt)} style={{
                        background: a ? 'var(--color-accent)' : 'var(--color-surface)',
                        color: a ? '#fff' : 'var(--color-ink)',
                        border: `1.5px solid ${a ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        borderRadius: 14, padding: '12px 4px', cursor: 'pointer',
                        fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700,
                      }}>{qt}</button>
                    )
                  })}
                </div>
                <input
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  placeholder={tr('Or type a time', 'অথবা সময় লিখুন')}
                  style={{
                    marginTop: 8, width: '100%',
                    background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                    borderRadius: 12, padding: '10px 14px',
                    fontSize: 15, color: 'var(--color-ink)',
                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Recurring */}
              <button onClick={() => setNewRecurring(!newRecurring)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 14,
                background: newRecurring ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                border: `1.5px solid ${newRecurring ? 'var(--color-accent)' : 'var(--color-border)'}`,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: newRecurring ? 'var(--color-accent)' : 'transparent',
                  border: `2px solid ${newRecurring ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {newRecurring && <Icon name="check" size={14} color="#fff" />}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>{tr('Repeat every day', 'প্রতিদিন পুনরাবৃত্তি')}</span>
              </button>

              {/* Save button */}
              <button onClick={addPlan} disabled={!newTitle.trim() || saving} style={{
                background: newTitle.trim() ? 'var(--color-accent)' : 'var(--color-ink-mute)',
                color: '#fff', border: 'none',
                cursor: newTitle.trim() ? 'pointer' : 'default',
                padding: '16px 24px', borderRadius: 16,
                fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700,
                marginTop: 6, marginBottom: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                {saving
                  ? <span style={{ width: 18, height: 18, borderRadius: 9, border: '2px solid #fff', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                  : tr('Save event', 'সংরক্ষণ করুন')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {confirmDelete && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'var(--color-surface)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, margin: '0 auto', borderRadius: 28, background: 'var(--color-danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="calendar" size={28} color="var(--color-danger)" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, margin: '12px 0 4px', color: 'var(--color-ink)' }}>
              {tr('Delete this event?', 'এই ইভেন্ট মুছবে?')}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: 0 }}>
              {tr("You can't undo this.", 'এটা ফিরিয়ে আনা যাবে না।')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                padding: '14px 0', borderRadius: 14, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: 'var(--color-ink)',
              }}>{tr('Cancel', 'বাতিল')}</button>
              <button onClick={() => deletePlan(confirmDelete)} style={{
                background: 'var(--color-danger)', color: '#fff', border: 'none',
                padding: '14px 0', borderRadius: 14, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
              }}>{tr('Delete', 'মুছুন')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Calendar picker modal ── */}
      {showCalendar && (
        <PlanCalendarModal
          planDatesMap={planDatesMap}
          calViewDate={calViewDate}
          setCalViewDate={setCalViewDate}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          todayStr={todayStr}
          lang={lang}
          tr={tr}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  )
}

