import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { Recording } from '@/types'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import { format } from 'date-fns'

const FILTERS = [
  { id: 'all',     label: 'All',     labelBn: 'সব' },
  { id: 'today',   label: 'Today',   labelBn: 'আজ' },
  { id: 'family',  label: 'Family',  labelBn: 'পরিবার' },
  { id: 'doctor',  label: 'Doctor',  labelBn: 'ডাক্তার' },
  { id: 'flagged', label: 'Flagged', labelBn: 'ফ্ল্যাগড' },
]

const MOOD_BG: Record<string, string> = {
  Warm: 'var(--color-warn-soft)', Calm: 'var(--color-accent-soft)', Low: 'var(--color-danger-soft)',
  Worried: 'var(--color-danger-soft)', Joyful: 'var(--color-good-soft)', Tired: 'var(--color-bg-warm)',
}

function formatDuration(secs: number) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}

export default function Conversations() {
  const { profile } = useAuth()
  const { tr } = useLang()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [filter, setFilter] = useState('all')
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    setLoading(true)
    async function load() {
      const cpSnap = await getDocs(query(
        collection(db, 'caregiver_patients'),
        where('caregiver_id', '==', profile!.id),
        where('status', '==', 'active')
      ))
      const ids = cpSnap.docs.map(d => d.data().patient_id)
      if (!ids.length) { setLoading(false); return }

      const recSnap = await getDocs(query(
        collection(db, 'recordings'),
        where('patientId', 'in', ids)
      ))
      let recs = recSnap.docs.map(d => ({ id: d.id, ...d.data() })) as unknown as Recording[]
      recs.sort((a, b) => {
        const da = (a as any).createdAt?.toDate?.() ?? (a.created_at ? new Date(a.created_at) : new Date(0))
        const db2 = (b as any).createdAt?.toDate?.() ?? (b.created_at ? new Date(b.created_at) : new Date(0))
        return db2.getTime() - da.getTime()
      })

      if (filter === 'today') {
        const today = format(new Date(), 'yyyy-MM-dd')
        recs = recs.filter(r => {
          const d = (r as any).createdAt?.toDate?.() ?? (r.created_at ? new Date(r.created_at) : null)
          return d ? format(d, 'yyyy-MM-dd') === today : false
        })
      }
      if (filter === 'flagged') {
        recs = recs.filter(r => (r.flag_count || 0) > 0)
      }

      setRecordings(recs)
      setLoading(false)
    }
    load()
  }, [profile, filter])

  return (
    <div style={{
      width: '100%', minHeight: '100%',
      background: 'var(--color-bg)', fontFamily: 'var(--font-body)',
      paddingBottom: 30,
    }}>
    <div className={isMobile ? undefined : 'desktop-content'}>
      {/* ── Header ── */}
      <div style={{ padding: '8px 16px 14px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--color-ink)' }}>
          {tr('Conversations', 'কথোপকথন')}
        </h1>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '7px 14px', borderRadius: 18, flexShrink: 0,
                background: filter === f.id ? 'var(--color-ink)' : 'var(--color-surface)',
                color: filter === f.id ? 'var(--color-bg)' : 'var(--color-ink-soft)',
                border: `1px solid ${filter === f.id ? 'var(--color-ink)' : 'var(--color-border)'}`,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              {tr(f.label, f.labelBn)}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
            <span style={{ width: 24, height: 24, borderRadius: 12, border: '2.5px solid var(--color-accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', display: 'block' }} />
          </div>
        ) : recordings.length === 0 ? (
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 18,
            padding: '40px 16px', textAlign: 'center', color: 'var(--color-ink-mute)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <Icon name="mic" size={32} color="var(--color-ink-mute)" />
            <p style={{ fontSize: 14, margin: 0 }}>{tr('No recordings found', 'কোনো রেকর্ডিং পাওয়া যায়নি')}</p>
          </div>
        ) : recordings.map((rec, idx) => {
          const speakers = rec.speakers || []
          const mood = (rec as any).mood
          const flagCount = rec.flag_count || 0
          const dateObj = (rec as any).createdAt?.toDate?.() ?? (rec.created_at ? new Date(rec.created_at) : new Date())
          const timeStr = format(dateObj, 'h:mm a')
          const dur = formatDuration(rec.duration || 0)

          return (
            <button
              key={rec.id}
              onClick={() => navigate(`/transcript/${rec.id}`)}
              style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 18, padding: 14, textAlign: 'left', cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(43,32,14,0.04)',
                width: '100%',
              }}
            >
              {/* Top row: speakers + time */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {speakers.slice(0, 3).map((s: any) => (
                    <Avatar key={s.id} name={s.name} size={26} />
                  ))}
                  {speakers.length === 0 && <Avatar name="?" size={26} />}
                  <div style={{ fontSize: 13, color: 'var(--color-ink-soft)', fontWeight: 600, marginLeft: 4 }}>
                    {speakers.length > 0 ? speakers.map((s: any) => s.name).join(' & ') : tr('Recording', 'রেকর্ডিং')}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-ink-mute)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {timeStr} · {dur}
                </div>
              </div>

              {/* Summary */}
              {rec.summary && (
                <div style={{ fontSize: 14, color: 'var(--color-ink)', lineHeight: 1.5, marginTop: 8 }}>
                  {rec.summary}
                </div>
              )}

              {/* Badges */}
              <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {mood && (
                  <div style={{
                    fontSize: 11, fontWeight: 600,
                    background: MOOD_BG[mood] || 'var(--color-bg-warm)', color: 'var(--color-ink)',
                    padding: '4px 10px', borderRadius: 10,
                  }}>
                    {mood === 'Warm' ? '◐ Warm' : mood === 'Calm' ? '○ Calm' : mood === 'Low' ? '● Low' : mood}
                  </div>
                )}
                {flagCount > 0 && (
                  <div style={{
                    fontSize: 11, fontWeight: 600,
                    background: 'var(--color-danger-soft)', color: 'var(--color-danger)',
                    padding: '4px 10px', borderRadius: 10,
                  }}>
                    ⚠ {tr('Flagged', 'ফ্ল্যাগড')}
                  </div>
                )}
                {rec.plan_count && rec.plan_count > 0 ? (
                  <div style={{
                    fontSize: 11, fontWeight: 600,
                    background: 'var(--color-accent-soft)', color: 'var(--color-accent-dark)',
                    padding: '4px 10px', borderRadius: 10,
                  }}>
                    📋 {rec.plan_count} {tr('plans', 'পরিকল্পনা')}
                  </div>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
    </div>
  )
}
