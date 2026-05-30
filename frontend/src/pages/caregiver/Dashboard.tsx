import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { db, fsListenActivityFeed, listenAlerts } from '@/lib/firebase'
import { collection, query, where, getDocs, getDoc, doc, onSnapshot } from 'firebase/firestore'
import { CaregiverPatient } from '@/types'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import { format } from 'date-fns'
import clsx from 'clsx'

const QUICK_ACTIONS = [
  { id: 'remind',        icon: 'bell',   label: 'Remind',   labelBn: 'রিমাইন্ড', tab: 'remind'        },
  { id: 'conversations', icon: 'chat',   label: 'Messages', labelBn: 'বার্তা',   tab: 'conversations' },
  { id: 'logs',          icon: 'mic',    label: 'Logs',     labelBn: 'লগ',       tab: 'conversations' },
  { id: 'location',      icon: 'map',    label: 'Location', labelBn: 'অবস্থান',  tab: 'location'      },
]

const TONE_BG: Record<string, string> = {
  good: 'var(--color-good-soft)', accent: 'var(--color-accent-soft)', warn: 'var(--color-warn-soft)',
}
const TONE_FG: Record<string, string> = {
  good: 'var(--color-good)', accent: 'var(--color-accent-dark)', warn: 'var(--color-warn)',
}

interface DashboardProps { onTabChange: (tab: string) => void }

interface ActivityEntry { id: string; text: string; tone: string; createdAt?: { toMillis?: () => number } }

export default function Dashboard({ onTabChange }: DashboardProps) {
  const { profile } = useAuth()
  const { tr } = useLang()
  const [patients, setPatients] = useState<CaregiverPatient[]>([])
  const [activityFeed, setActivityFeed] = useState<ActivityEntry[]>([])
  const [alertCount, setAlertCount] = useState(0)
  const [plansTotal, setPlansTotal] = useState(0)
  const [plansDone, setPlansDone] = useState(0)
  const [recordingsToday, setRecordingsToday] = useState(0)

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
        const patSnap = await getDoc(doc(db, 'profiles', data.patient_id))
        return { ...data, patient: patSnap.exists() ? patSnap.data() : null }
      }))
      setPatients(list as CaregiverPatient[])
    }
    load()
  }, [profile])

  const activePatient = patients[0]

  // Real-time data once patient is known
  useEffect(() => {
    if (!activePatient?.patient_id) return
    const pid = activePatient.patient_id
    const today = format(new Date(), 'yyyy-MM-dd')

    // Activity feed
    const unsubActivity = fsListenActivityFeed(pid, items => setActivityFeed(items as unknown as ActivityEntry[]))

    // Alerts from RTDB
    const unsubAlerts = listenAlerts(pid, alerts => {
      const now = Date.now()
      const recent = (alerts as any[]).filter(a => {
        if (a.resolved) return false
        const ts = typeof a.ts === 'number' ? a.ts : (a.ts?.toMillis?.() ?? 0)
        return ts === 0 || (now - ts) < 30 * 60 * 1000
      })
      setAlertCount(recent.length)
    })

    // Plans for today
    const unsubPlans = onSnapshot(
      query(collection(db, 'plans'), where('patientId', '==', pid), where('date', '==', today)),
      snap => {
        setPlansTotal(snap.size)
        setPlansDone(snap.docs.filter(d => d.data().is_done).length)
      },
      err => console.warn('dashboard plans:', err.message)
    )

    // Recordings today
    const unsubRec = onSnapshot(
      query(collection(db, 'recordings'), where('patientId', '==', pid)),
      snap => {
        const todayRecs = snap.docs.filter(d => {
          const ts = d.data().createdAt?.toDate?.()
          return ts && format(ts, 'yyyy-MM-dd') === today
        })
        setRecordingsToday(todayRecs.length)
      },
      err => console.warn('dashboard recordings:', err.message)
    )

    return () => { unsubActivity(); unsubAlerts(); unsubPlans(); unsubRec() }
  }, [activePatient?.patient_id])

  const patientName = activePatient?.patient?.name || tr('your patient', 'রোগী')

  // ── Mobile: exact prototype CareDashboard recreation ──────────────
  const MobileDashboard = (
    <div className="md:hidden screen" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Top bar */}
      <div style={{ padding: '8px 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--color-ink-mute)', fontWeight: 600 }}>
            {format(new Date(), 'EEE, MMM d').toUpperCase()}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, margin: '2px 0 0', color: 'var(--color-ink)' }}>
            {tr(`Caring for ${patientName}`, `${patientName}-এর যত্ন`)}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bell" size={20} color="var(--color-ink)" />
          </div>
          <Avatar name={patientName} size={40} />
        </div>
      </div>

      {/* Status hero */}
      <div style={{ padding: '0 16px' }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))',
          borderRadius: 22, padding: 20, color: '#fff',
          boxShadow: '0 10px 28px color-mix(in srgb, var(--color-accent) 30%, transparent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={patientName} size={56} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: '#7DDFA0', boxShadow: '0 0 0 4px rgba(125,223,160,0.25)' }} />
                <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600, letterSpacing: 0.4 }}>
                  {tr('ACTIVE · ON TRACK', 'সক্রিয় · সব ঠিক')}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                {patientName}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 600 }}>{tr('PLANS TODAY', 'আজকের পরিকল্পনা')}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{plansDone}/{plansTotal} {tr('done', 'সম্পন্ন')}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 600 }}>{tr('ALERTS', 'সতর্কতা')}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{alertCount === 0 ? '✅ ' + tr('None', 'নেই') : `🚨 ${alertCount}`}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: '18px 16px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {QUICK_ACTIONS.map(a => (
          <button
            key={a.id}
            onClick={() => onTabChange(a.tab)}
            style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 16, padding: '12px 4px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              cursor: 'pointer',
            }}
          >
            <Icon name={a.icon} size={22} color="var(--color-accent)" />
            <div style={{ fontSize: 12, color: 'var(--color-ink)', fontWeight: 600 }}>{tr(a.label, a.labelBn)}</div>
          </button>
        ))}
      </div>

      {/* Today's progress */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 8px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--color-ink-soft)', letterSpacing: 0.5, margin: 0, textTransform: 'uppercase' }}>
            {tr("Today's progress", 'আজকের অগ্রগতি')}
          </h3>
          <span style={{ fontSize: 14, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
            {tr('See all', 'সব দেখুন')}
          </span>
        </div>
        <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { v: `${plansDone}/${plansTotal}`, l: tr('Plans', 'পরিকল্পনা'), c: 'var(--color-good)' },
            { v: String(recordingsToday), l: tr('Recordings', 'রেকর্ডিং'), c: 'var(--color-accent)' },
            { v: String(alertCount), l: tr('Alerts', 'সতর্কতা'), c: alertCount > 0 ? 'var(--color-danger)' : 'var(--color-ink-mute)' },
          ].map(m => (
            <div key={m.l} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 18, padding: 12, boxShadow: '0 1px 3px rgba(43,32,14,0.04)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: m.c }}>{m.v}</div>
              <div style={{ fontSize: 12, color: 'var(--color-ink-soft)', fontWeight: 600, marginTop: 2 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity feed */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 8px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--color-ink-soft)', letterSpacing: 0.5, margin: 0, textTransform: 'uppercase' }}>
            {tr('Activity', 'কার্যকলাপ')}
          </h3>
        </div>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activityFeed.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-ink-mute)', fontSize: 14 }}>
              {tr('No recent activity', 'সাম্প্রতিক কোনো কার্যকলাপ নেই')}
            </div>
          ) : activityFeed.map(e => (
            <div key={e.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 18, padding: 12, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(43,32,14,0.04)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: TONE_BG[e.tone] || TONE_BG.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="sun" size={20} color={TONE_FG[e.tone] || TONE_FG.accent} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: 'var(--color-ink)', fontWeight: 600 }}>{e.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 24 }} />
    </div>
  )

  // ── Desktop: full 3-column layout ────────────────────────────────
  const DesktopDashboard = (
    <div className="hidden md:block desktop-content">
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink-mute)' }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, color: 'var(--color-ink)', margin: '4px 0 0', letterSpacing: -0.5 }}>
            {tr('Good morning', 'সুপ্রভাত')}, <span style={{ color: 'var(--color-accent)' }}>{profile?.name?.split(' ')[0]}</span> 👋
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="badge badge-good">{tr('System Online', 'সিস্টেম সচল')}</span>
          <Avatar name={profile?.name || 'C'} size={40} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-[1fr_1fr_360px]">
        {/* Col 1: Patient status + quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Hero */}
          <div style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))', borderRadius: 22, padding: 24, color: '#fff', boxShadow: '0 10px 28px color-mix(in srgb, var(--color-accent) 30%, transparent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <Avatar name={patientName} size={60} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 5, background: '#7DDFA0', boxShadow: '0 0 0 4px rgba(125,223,160,0.25)' }} />
                  <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 700, letterSpacing: 1 }}>ACTIVE · ON TRACK</div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800 }}>{patientName}</div>
              </div>
              <button onClick={() => onTabChange('location')} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                📍 Track
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 700, letterSpacing: 1 }}>PLANS TODAY</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{plansDone}/{plansTotal} done</div>
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 700, letterSpacing: 1 }}>ALERTS</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{alertCount === 0 ? '✅ None' : `🚨 ${alertCount}`}</div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 22, padding: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 14 }}>{tr('Quick actions', 'দ্রুত কার্যক্রম')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {QUICK_ACTIONS.map(a => (
                <button key={a.id} onClick={() => onTabChange(a.tab)} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '14px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <Icon name={a.icon} size={22} color="var(--color-accent)" />
                  <div style={{ fontSize: 12, color: 'var(--color-ink)', fontWeight: 600 }}>{tr(a.label, a.labelBn)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Col 2: Stats + Today summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stats */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink-soft)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>{tr("Today's Progress", 'আজকের অগ্রগতি')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { v: `${plansDone}/${plansTotal}`, l: tr('Plans', 'পরিকল্পনা'), c: 'var(--color-good)' },
                { v: String(recordingsToday), l: tr('Recordings', 'রেকর্ডিং'), c: 'var(--color-accent)' },
                { v: String(alertCount), l: tr('Alerts', 'সতর্কতা'), c: alertCount > 0 ? 'var(--color-danger)' : 'var(--color-ink-mute)' },
              ].map(m => (
                <div key={m.l} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 18, padding: '16px 12px', boxShadow: '0 1px 3px rgba(43,32,14,0.04)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: m.c }}>{m.v}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-ink-soft)', fontWeight: 600, marginTop: 2 }}>{m.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Today summary card */}
          <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 22, padding: 20, flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 14 }}>{tr("Today's summary", 'আজকের সারসংক্ষেপ')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: tr('Plans done', 'সম্পন্ন পরিকল্পনা'), value: `${plansDone} / ${plansTotal}` },
                { label: tr('Recordings today', 'আজকের রেকর্ডিং'), value: String(recordingsToday) },
                { label: tr('Active alerts', 'সক্রিয় সতর্কতা'), value: alertCount === 0 ? '✅ ' + tr('None', 'নেই') : `🚨 ${alertCount}` },
                { label: tr('Patient', 'রোগী'), value: patientName },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col 3: Activity feed — spans 2 cols on md, 1 col on xl */}
        <div className="md:col-span-2 xl:col-span-1" style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 22, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink-soft)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>{tr('Activity', 'কার্যকলাপ')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activityFeed.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-ink-mute)', fontSize: 13 }}>
                {tr('No recent activity', 'সাম্প্রতিক কোনো কার্যকলাপ নেই')}
              </div>
            ) : activityFeed.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--color-bg)', borderRadius: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: TONE_BG[e.tone] || TONE_BG.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="sun" size={20} color={TONE_FG[e.tone] || TONE_FG.accent} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--color-ink)', fontWeight: 600, lineHeight: 1.4 }}>{e.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {MobileDashboard}
      {DesktopDashboard}
    </>
  )
}
