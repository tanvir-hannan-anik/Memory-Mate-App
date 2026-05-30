import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { Plan, PlanType } from '@/types'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import { format, addDays, startOfDay } from 'date-fns'
import { db, fsListenPlans, fsAddPlan, fsUpdatePlan, fsDeletePlan, logAppEvent } from '@/lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { fmtDayShort, fmtMonthDay, fmtDayFull } from '@/lib/dateLocale'
import {
  initGoogleCalendar, requestCalendarAccess,
  createCalendarEvent, listCalendarEvents, buildCalendarUrl, CalendarEvent,
} from '@/lib/googleCalendar'

// â"€â"€ helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function isoDate(d: Date) {
  return format(d, 'yyyy-MM-dd')
}
function fmtDayLabel(d: Date, today: Date, tr: (en: string, bn: string) => string, lang: 'en' | 'bn') {
  const todayStr = isoDate(today)
  const ds = isoDate(d)
  if (ds === todayStr) return tr('Today', 'à¦†à¦œ')
  if (ds === isoDate(addDays(today, 1))) return tr('Tomorrow', 'à¦†à¦—à¦¾à¦®à§€à¦•à¦¾à¦²')
  if (ds === isoDate(addDays(today, -1))) return tr('Yesterday', 'à¦—à¦¤à¦•à¦¾à¦²')
  return `${fmtDayFull(d, lang)}, ${fmtMonthDay(d, lang)}`
}

const TYPE_ICONS: Record<PlanType, string> = {
  medicine: 'pill', call: 'phone', visit: 'heart',
  task: 'check', appointment: 'calendar',
}

const PLAN_TYPES = [
  { v: 'medicine'    as PlanType, en: 'Medicine',    bn: 'à¦"à¦·à§à¦§' },
  { v: 'call'        as PlanType, en: 'Call',         bn: 'à¦«à§‹à¦¨' },
  { v: 'visit'       as PlanType, en: 'Visit',        bn: 'à¦¦à§‡à¦–à¦¾' },
  { v: 'task'        as PlanType, en: 'Task',         bn: 'à¦•à¦¾à¦œ' },
  { v: 'appointment' as PlanType, en: 'Appointment',  bn: 'à¦…à§à¦¯à¦¾à¦ªà¦¯à¦¼à§‡à¦¨à§à¦Ÿà¦®à§‡à¦¨à§à¦Ÿ' },
]
const QUICK_TIMES = ['7:00 AM', '8:30 AM', '11:00 AM', '1:00 PM', '4:00 PM', '8:00 PM']

export default function Plans() {
  const { profile } = useAuth()
  const { tr, lang } = useLang()
  const today = startOfDay(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [plans, setPlans] = useState<Plan[]>([])
  const [planDatesSet, setPlanDatesSet] = useState<Set<string>>(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([])
  const [calConnected, setCalConnected] = useState(false)
  const [calLoading, setCalLoading] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Add-form state
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<PlanType>('task')
  const [newTime, setNewTime] = useState('09:00 AM')
  const [newRecurring, setNewRecurring] = useState(false)
  const [syncToCalendar, setSyncToCalendar] = useState(false)

  // Day strip â€" 14 days from today
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i))
  const dateStr = isoDate(selectedDate)
  const todayStr = isoDate(today)

  // â"€â"€ Firestore listener â€" plans for selected date â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  useEffect(() => {
    if (!profile) return
    const unsub = fsListenPlans(profile.id, dateStr, docs => setPlans(docs as unknown as Plan[]))
    return unsub
  }, [profile, dateStr])

  // â"€â"€ Track all plan dates (for day-strip dots) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  useEffect(() => {
    if (!profile) return
    const q = query(collection(db, 'plans'), where('patientId', '==', profile.id))
    const unsub = onSnapshot(q, snap => {
      setPlanDatesSet(new Set(snap.docs.map(d => d.data().date as string)))
    }, err => console.warn('planDates error:', err.message))
    return unsub
  }, [profile])

  // â"€â"€ Google Calendar â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  useEffect(() => { initGoogleCalendar().catch(() => {}) }, [])

  async function connectCalendar() {
    setCalLoading(true)
    try {
      await requestCalendarAccess()
      setCalConnected(true)
      setCalEvents(await listCalendarEvents(20))
      setSyncMsg(tr('Calendar connected!', 'à¦•à§à¦¯à¦¾à¦²à§‡à¦¨à§à¦¡à¦¾à¦° à¦¸à¦‚à¦¯à§à¦•à§à¦¤!'))
      setTimeout(() => setSyncMsg(''), 2000)
    } catch {
      setSyncMsg(tr('Calendar needs VITE_GOOGLE_CLIENT_ID', 'Client ID à¦ªà§à¦°à¦¯à¦¼à§‹à¦œà¦¨'))
      setTimeout(() => setSyncMsg(''), 4000)
    }
    setCalLoading(false)
  }

  async function importFromCalendar(ev: CalendarEvent) {
    if (!profile) return
    await fsAddPlan(profile.id, { title: ev.title, type: 'appointment', date: ev.date, time: ev.time || null, is_recurring: false, is_done: false })
    setSyncMsg(tr('Event imported!', 'à¦‡à¦­à§‡à¦¨à§à¦Ÿ à¦†à¦®à¦¦à¦¾à¦¨à¦¿ à¦¹à¦¯à¦¼à§‡à¦›à§‡!'))
    setTimeout(() => setSyncMsg(''), 1500)
  }

  // â"€â"€ Plan CRUD â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  async function addPlan() {
    if (!profile || !newTitle.trim()) return
    setSaving(true)
    const docRef = await fsAddPlan(profile.id, {
      title: newTitle, type: newType, date: dateStr,
      time: newTime, is_recurring: newRecurring,
      recurrence: newRecurring ? 'daily' : null, is_done: false,
    })
    if (syncToCalendar) {
      if (calConnected) {
        await createCalendarEvent({ title: newTitle, date: dateStr, time: newTime })
      } else {
        window.open(buildCalendarUrl({ title: newTitle, date: dateStr, time: newTime, description: 'Added by Memory Mate' }), '_blank')
      }
    }
    logAppEvent('plan_created', { type: newType })
    setShowAdd(false)
    setNewTitle(''); setNewType('task'); setNewTime('09:00 AM'); setNewRecurring(false); setSyncToCalendar(false)
    setSaving(false)
  }

  async function toggleDone(plan: Plan) { await fsUpdatePlan(plan.id, { is_done: !plan.is_done }) }
  async function deletePlan(id: string) { await fsDeletePlan(id); setConfirmDelete(null) }

  // Sorted plans for selected day
  const sorted = [...plans].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const soonest = sorted.find(p => !p.is_done && isoDate(selectedDate) === todayStr)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--color-bg)', fontFamily: 'var(--font-body)',
      overflow: 'hidden',
    }}>

      {/* â"€â"€ Header â"€â"€ */}
      <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, letterSpacing: 1.5, color: 'var(--color-ink-mute)', fontWeight: 700 }}>
              {tr('PLANS', 'à¦ªà¦°à¦¿à¦•à¦²à§à¦ªà¦¨à¦¾')}
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800,
              margin: '4px 0 0', color: 'var(--color-ink)', letterSpacing: -0.5,
            }}>
              {fmtDayLabel(selectedDate, today, tr, lang)}
            </h1>
            <div style={{ fontSize: 13, color: 'var(--color-ink-soft)', marginTop: 2 }}>
              {sorted.length} {tr(sorted.length === 1 ? 'event' : 'events', 'à¦Ÿà¦¿ à¦‡à¦­à§‡à¦¨à§à¦Ÿ')}
              {' Â· '}{sorted.filter(p => p.is_done).length} {tr('done', 'à¦¹à¦¯à¦¼à§‡ à¦—à§‡à¦›à§‡')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={calConnected ? undefined : connectCalendar}
              disabled={calLoading}
              style={{
                height: 40, padding: '0 12px', borderRadius: 12,
                background: calConnected ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 600, color: 'var(--color-ink-soft)', fontFamily: 'inherit',
              }}
            >
              {calLoading
                ? <span style={{ width: 12, height: 12, borderRadius: 6, border: '2px solid var(--color-accent)', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                : <Icon name="calendar" size={14} color="var(--color-ink-soft)" />}
              {calConnected ? 'Cal âœ"' : 'Google Cal'}
            </button>
            <button onClick={() => setShowAdd(true)} style={{
              width: 44, height: 44, borderRadius: 22,
              background: 'var(--color-accent)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(30,110,114,0.4)',
            }}>
              <Icon name="plus" size={22} color="#fff" />
            </button>
          </div>
        </div>
      </div>

      {/* Sync message */}
      {syncMsg && (
        <div style={{ margin: '8px 16px 0', padding: '8px 14px', borderRadius: 12, background: 'var(--color-good-soft)', color: 'var(--color-good)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Icon name="check" size={14} color="var(--color-good)" /> {syncMsg}
        </div>
      )}

      {/* â"€â"€ Day strip â"€â"€ */}
      <div style={{ padding: '12px 16px 8px', overflowX: 'auto', whiteSpace: 'nowrap', flexShrink: 0, scrollbarWidth: 'none' }}>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          {days.map(d => {
            const ds = isoDate(d)
            const active = ds === dateStr
            const isToday2 = ds === todayStr
            const hasPlans = planDatesSet.has(ds)
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
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, letterSpacing: 0.5 }}>
                  {format(d, 'EEE').toUpperCase()}
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, lineHeight: 1,
                  color: active ? '#fff' : isToday2 ? 'var(--color-accent)' : 'var(--color-ink)',
                }}>
                  {d.getDate()}
                </div>
                {hasPlans && (
                  <div style={{ width: 5, height: 5, borderRadius: 3, marginTop: 2, background: active ? '#fff' : 'var(--color-accent)' }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* â"€â"€ Google Calendar events â"€â"€ */}
      {calConnected && calEvents.filter(e => e.date === dateStr).length > 0 && (
        <div style={{ margin: '0 16px 8px', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 16, padding: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <svg width="14" height="14" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M46 24c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-ink-soft)' }}>Google Calendar</span>
          </div>
          {calEvents.filter(e => e.date === dateStr).map(ev => (
            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>{ev.title}</div>
                {ev.time && <div style={{ fontSize: 12, color: 'var(--color-ink-mute)' }}>{ev.time}</div>}
              </div>
              <button onClick={() => importFromCalendar(ev)} style={{
                padding: '6px 12px', borderRadius: 10, background: 'var(--color-accent-soft)',
                border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: 'var(--color-accent-dark)', fontFamily: 'inherit',
              }}>
                {tr('Import', 'à¦†à¦®à¦¦à¦¾à¦¨à¦¿')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* â"€â"€ Timeline â"€â"€ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 80px' }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-ink-soft)' }}>
            <div style={{ width: 80, height: 80, margin: '0 auto', borderRadius: 40, background: 'var(--color-bg-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="calendar" size={36} color="var(--color-ink-mute)" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--color-ink)', marginTop: 14 }}>
              {tr('Nothing planned yet', 'à¦•à¦¿à¦›à§ à¦ªà¦°à¦¿à¦•à¦²à§à¦ªà¦¨à¦¾ à¦¨à§‡à¦‡')}
            </div>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              {tr('Tap + to add an event', '+ à¦šà¦¾à¦ªà§à¦¨ à¦‡à¦­à§‡à¦¨à§à¦Ÿ à¦¯à§‹à¦— à¦•à¦°à¦¤à§‡')}
            </div>
          </div>
        ) : (
          sorted.map(plan => {
            const isSoon = soonest?.id === plan.id
            const icon = TYPE_ICONS[plan.type] || 'calendar'
            return (
              <div key={plan.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {/* Time rail */}
                <div style={{ width: 52, flexShrink: 0, textAlign: 'right', paddingTop: 10 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: plan.is_done ? 'var(--color-ink-mute)' : isSoon ? 'var(--color-accent)' : 'var(--color-ink)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
                  }}>
                    {plan.time || 'â€"'}
                  </div>
                </div>

                {/* Dot rail */}
                <div style={{ width: 14, position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', left: 6, top: 0, bottom: -12, width: 2, background: 'var(--color-border)' }} />
                  <div style={{
                    position: 'absolute', left: 0, top: 18,
                    width: 14, height: 14, borderRadius: 8,
                    background: plan.is_done ? 'var(--color-good)' : isSoon ? 'var(--color-accent)' : 'var(--color-surface)',
                    border: `2px solid ${plan.is_done ? 'var(--color-good)' : isSoon ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }} />
                </div>

                {/* Event card */}
                <div style={{
                  flex: 1, padding: '10px 10px',
                  background: isSoon ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                  border: `1.5px solid ${isSoon ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius)',
                  opacity: plan.is_done ? 0.55 : 1,
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  {/* Toggle circle */}
                  <button onClick={() => toggleDone(plan)} style={{
                    width: 26, height: 26, borderRadius: 13, flexShrink: 0,
                    background: plan.is_done ? 'var(--color-good)' : 'transparent',
                    border: `2px solid ${plan.is_done ? 'var(--color-good)' : 'var(--color-accent)'}`,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {plan.is_done && <Icon name="check" size={18} color="#fff" />}
                  </button>

                  {/* Icon */}
                  <Icon name={icon} size={20} color={plan.is_done ? 'var(--color-good)' : 'var(--color-accent-dark)'} />

                  {/* Title + person */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 700, lineHeight: 1.2,
                      color: plan.is_done ? 'var(--color-ink-mute)' : 'var(--color-ink)',
                      textDecoration: plan.is_done ? 'line-through' : 'none',
                    }}>
                      {plan.title}
                    </div>
                    {(plan as any).person && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Avatar name={(plan as any).person} size={20} />
                        <span style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>{(plan as any).person}</span>
                      </div>
                    )}
                  </div>

                  {/* NEXT badge */}
                  {isSoon && (
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-accent)', letterSpacing: 0.5, padding: '4px 8px', background: 'var(--color-surface)', borderRadius: 8 }}>
                      {tr('NEXT', 'à¦ªà¦°à¦¬à¦°à§à¦¤à§€')}
                    </div>
                  )}

                  {/* Google Calendar link */}
                  <a
                    href={buildCalendarUrl({ title: plan.title, date: plan.date, time: plan.time || undefined })}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    title="Open in Google Calendar"
                    style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: 'var(--color-accent-soft)',
                      border: '1px solid var(--color-accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    <Icon name="calendar" size={15} color="var(--color-accent-dark)" />
                  </a>

                  {/* Delete button */}
                  <button
                    onClick={() => setConfirmDelete(plan.id)}
                    title="Delete"
                    style={{
                      width: 30, height: 30, borderRadius: 15, flexShrink: 0,
                      background: 'var(--color-danger-soft)',
                      border: '1px solid var(--color-danger)',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon name="trash" size={14} color="var(--color-danger)" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* â"€â"€ Add modal â"€â"€ */}
      {showAdd && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 70, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{
            width: '100%', background: 'var(--color-bg)',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            display: 'flex', flexDirection: 'column',
            maxHeight: '92%', overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)' }}>
              <button onClick={() => setShowAdd(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-ink-soft)', fontSize: 15, fontFamily: 'inherit', fontWeight: 600 }}>
                {tr('Cancel', 'à¦¬à¦¾à¦¤à¦¿à¦²')}
              </button>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--color-ink)' }}>
                {tr('New event', 'à¦¨à¦¤à§à¦¨ à¦‡à¦­à§‡à¦¨à§à¦Ÿ')}
              </div>
              <button onClick={addPlan} disabled={!newTitle.trim() || saving} style={{
                background: 'transparent', border: 'none',
                cursor: newTitle.trim() ? 'pointer' : 'default',
                color: newTitle.trim() ? 'var(--color-accent)' : 'var(--color-ink-mute)',
                fontSize: 15, fontFamily: 'inherit', fontWeight: 800,
              }}>
                {saving
                  ? <span style={{ width: 16, height: 16, borderRadius: 8, border: '2px solid var(--color-accent)', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                  : tr('Save', 'à¦¸à¦‚à¦°à¦•à§à¦·à¦£')}
              </button>
            </div>

            <div style={{ overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Title */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{tr('TITLE', 'à¦¶à¦¿à¦°à§‹à¦¨à¦¾à¦®')}</div>
                <input
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder={tr('e.g. Lunch with Sara', 'à¦¯à§‡à¦®à¦¨ Sara-à¦° à¦¸à¦¾à¦¥à§‡ à¦–à¦¾à¦¬à¦¾à¦°')}
                  style={{
                    width: '100%', background: 'var(--color-surface)',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: 14, padding: '14px 16px',
                    fontSize: 17, fontWeight: 600, color: 'var(--color-ink)',
                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Type grid â€" 3 columns */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{tr('TYPE', 'à¦§à¦°à¦¨')}</div>
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

              {/* Day strip */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{tr('DAY', 'à¦¦à¦¿à¦¨')}</div>
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
                            {format(d, 'EEE').toUpperCase()}
                          </div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, marginTop: 2 }}>{d.getDate()}</div>
                          <div style={{ fontSize: 10, opacity: 0.7 }}>{format(d, 'MMM')}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Quick times â€" 3 columns */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{tr('TIME', 'à¦¸à¦®à¦¯à¦¼')}</div>
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
                  placeholder={tr('Or type a time', 'à¦…à¦¥à¦¬à¦¾ à¦¸à¦®à¦¯à¦¼ à¦²à¦¿à¦–à§à¦¨')}
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
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>{tr('Repeat every day', 'à¦ªà§à¦°à¦¤à¦¿à¦¦à¦¿à¦¨ à¦ªà§à¦¨à¦°à¦¾à¦¬à§ƒà¦¤à§à¦¤à¦¿')}</span>
              </button>

              {calConnected && (
                <button onClick={() => setSyncToCalendar(!syncToCalendar)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 14,
                  background: syncToCalendar ? '#EFF6FF' : 'var(--color-surface)',
                  border: `1.5px solid ${syncToCalendar ? '#4285F4' : 'var(--color-border)'}`,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: syncToCalendar ? '#4285F4' : 'transparent',
                    border: `2px solid ${syncToCalendar ? '#4285F4' : 'var(--color-border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {syncToCalendar && <Icon name="check" size={14} color="#fff" />}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>ðŸ"… {tr('Open in Google Calendar', 'Google Calendar-à¦ à¦–à§à¦²à§à¦¨')}</span>
                </button>
              )}

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
                  : tr('Save event', 'à¦¸à¦‚à¦°à¦•à§à¦·à¦£ à¦•à¦°à§à¦¨')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â"€â"€ Delete confirm â"€â"€ */}
      {confirmDelete && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'var(--color-surface)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, margin: '0 auto', borderRadius: 28, background: 'var(--color-danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="bell" size={28} color="var(--color-danger)" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, margin: '12px 0 4px', color: 'var(--color-ink)' }}>
              {tr('Delete this event?', 'à¦à¦‡ à¦‡à¦­à§‡à¦¨à§à¦Ÿ à¦®à§à¦›à¦¬à§‡?')}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: 0 }}>
              {tr("You can't undo this.", 'à¦à¦Ÿà¦¾ à¦«à¦¿à¦°à¦¿à¦¯à¦¼à§‡ à¦†à¦¨à¦¾ à¦¯à¦¾à¦¬à§‡ à¦¨à¦¾à¥¤')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                padding: '14px 0', borderRadius: 14, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: 'var(--color-ink)',
              }}>{tr('Cancel', 'à¦¬à¦¾à¦¤à¦¿à¦²')}</button>
              <button onClick={() => deletePlan(confirmDelete)} style={{
                background: 'var(--color-danger)', color: '#fff', border: 'none',
                padding: '14px 0', borderRadius: 14, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
              }}>{tr('Delete', 'à¦®à§à¦›à§à¦¨')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


