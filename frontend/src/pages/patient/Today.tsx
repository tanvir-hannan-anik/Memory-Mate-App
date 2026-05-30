import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Plan } from '@/types'
import Icon from '@/components/ui/Icon'
import { format } from 'date-fns'
import { pushLocation, fsListenPlans, fsUpdatePlan } from '@/lib/firebase'

async function reverseGeocodeNominatim(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    if (data.display_name) return data.display_name
    const a = data.address || {}
    const parts = [a.road, a.neighbourhood, a.suburb, a.city_district, a.city, a.country].filter(Boolean)
    return parts.length ? parts.join(', ') : 'Current Location'
  } catch {
    return 'Current Location'
  }
}

const PLAN_ICONS: Record<string, string> = {
  medicine: 'pill', call: 'phone', walk: 'walk', task: 'check',
  visit: 'heart', appointment: 'calendar', coffee: 'coffee',
}

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? ['Good morning', 'সুপ্রভাত'] : h < 17 ? ['Good afternoon', 'শুভ অপরাহ্ন'] : ['Good evening', 'শুভ সন্ধ্যা']
}

export default function Today() {
  const { profile } = useAuth()
  const { tr } = useLang()
  const isMobile = useIsMobile()
  const [plans, setPlans] = useState<Plan[]>([])
  const [speakerActive, setSpeakerActive] = useState(false)
  const [now, setNow] = useState(new Date())
  const today = new Date()
  const [greetEn, greetBn] = getGreeting()
  const firstName = profile?.name?.split(' ')[0] || 'Friend'

  // Tick clock every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!profile) return

    let watchId: number | null = null
    let lastGeocodedPos = { lat: 0, lng: 0 }
    let cachedLabel = 'Current Location'

    async function onPosition(pos: GeolocationPosition) {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords
      // Accuracy > 2000 m means the browser is guessing via IP (often shows Dhaka for BD ISPs)
      if (accuracy > 2000) return
      const moved = Math.abs(lat - lastGeocodedPos.lat) + Math.abs(lng - lastGeocodedPos.lng)
      if (moved > 0.001) {
        lastGeocodedPos = { lat, lng }
        cachedLabel = await reverseGeocodeNominatim(lat, lng)
      }
      pushLocation(profile!.id, lat, lng, cachedLabel, Math.round(accuracy))
    }

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(onPosition, () => {}, {
        enableHighAccuracy: true, maximumAge: 15000, timeout: 15000,
      })
    }

    const unsub = fsListenPlans(profile.id, format(today, 'yyyy-MM-dd'), p => setPlans(p as unknown as Plan[]))
    return () => { unsub(); if (watchId !== null) navigator.geolocation.clearWatch(watchId) }
  }, [profile])

  async function toggleDone(plan: Plan) {
    await fsUpdatePlan(plan.id, { is_done: !plan.is_done })
  }

  const doneCount = plans.filter(p => p.is_done).length

  function readAloud() {
    if (!window.speechSynthesis) return
    if (speakerActive) {
      window.speechSynthesis.cancel()
      setSpeakerActive(false)
      return
    }
    setSpeakerActive(true)
    const greetLine = `${tr(greetEn, greetBn)}, ${firstName}!`
    const taskLine = plans.length === 0
      ? tr('No tasks today. Enjoy your day!', 'আজ কোনো কাজ নেই। দিনটি উপভোগ করুন!')
      : plans.map(p =>
          `${p.is_done ? tr('Done', 'সম্পন্ন') : tr('Pending', 'বাকি')}: ${p.title}${p.time ? `, ${tr('at', 'সময়')} ${p.time}` : ''}`
        ).join('. ')
    const text = `${greetLine}. ${tr('Today you have', 'আজ তোমার আছে')} ${plans.length} ${tr('tasks', 'কাজ')}. ${taskLine}`
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = profile?.language === 'bn' ? 'bn-BD' : 'en-US'
    utterance.rate = 0.85
    utterance.onend = () => setSpeakerActive(false)
    utterance.onerror = () => setSpeakerActive(false)
    window.speechSynthesis.speak(utterance)
  }

  const TaskList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 8 }}>
      {plans.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-ink-mute)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>☀️</div>
          <p style={{ fontSize: 15 }}>{tr('No tasks today. Enjoy your day!', 'আজ কোনো কাজ নেই। দিনটি উপভোগ করুন!')}</p>
        </div>
      ) : (
        plans.map((plan, idx) => {
          const isSoon = !plan.is_done && idx === plans.findIndex(p => !p.is_done)
          return (
            <button
              key={plan.id}
              onClick={() => toggleDone(plan)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: 16, width: '100%',
                background: isSoon && !plan.is_done ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                border: `1.5px solid ${isSoon && !plan.is_done ? 'var(--color-accent)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius)',
                opacity: plan.is_done ? 0.55 : 1,
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: isMobile ? 52 : 50, height: isMobile ? 52 : 50,
                borderRadius: 14, flexShrink: 0,
                background: plan.is_done ? 'var(--color-good-soft)' : 'var(--color-surface)',
                border: plan.is_done ? '1.5px solid var(--color-good)' : '1.5px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon
                  name={plan.is_done ? 'check' : (PLAN_ICONS[plan.type] || 'calendar')}
                  size={isMobile ? 24 : 22}
                  color={plan.is_done ? 'var(--color-good)' : 'var(--color-accent-dark)'}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: isMobile ? 18 : 18, fontWeight: 700, lineHeight: 1.2, color: 'var(--color-ink)',
                  textDecoration: plan.is_done ? 'line-through' : 'none', fontFamily: 'var(--font-display)',
                }}>
                  {plan.title}
                </div>
                {plan.recurrence && (
                  <div style={{ fontSize: 14, color: 'var(--color-ink-soft)', marginTop: 4, lineHeight: 1.35 }}>
                    {plan.recurrence}
                  </div>
                )}
              </div>
              {plan.time && (
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
                  color: isSoon ? 'var(--color-accent)' : 'var(--color-ink-soft)',
                  textAlign: 'right', whiteSpace: 'nowrap',
                }}>
                  {plan.time}
                </div>
              )}
            </button>
          )
        })
      )}
    </div>
  )

  return (
    <div className="screen" style={{ overflowY: 'auto' }}>
      <div style={{ padding: isMobile ? '20px 18px 100px' : '36px 40px 60px' }}>

        {/* ── Header: date + greeting + read aloud ── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 24, gap: 12,
        }}>
          <div>
            <p style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-ink-mute)', marginBottom: 2 }}>
              {format(today, 'EEEE, MMMM d, yyyy')}
            </p>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: isMobile ? 26 : 34,
              fontWeight: 800, color: 'var(--color-ink)',
              margin: '4px 0 0', letterSpacing: -0.5,
            }}>
              {tr(greetEn, greetBn)},{' '}
              <span style={{ color: 'var(--color-accent)' }}>{firstName}</span> 👋
            </h1>
          </div>
          <button
            onClick={readAloud}
            style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 8,
              padding: isMobile ? '10px 12px' : '10px 16px', borderRadius: 12,
              background: speakerActive ? 'var(--color-accent)' : 'var(--color-accent-soft)',
              color: speakerActive ? '#fff' : 'var(--color-accent)',
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              animation: speakerActive ? 'memora-pulse 1.5s ease-in-out infinite' : 'none',
            }}
          >
            <Icon name="speaker" size={18} color="currentColor" />
            {!isMobile && tr('Read aloud', 'জোরে পড়ুন')}
          </button>
        </div>

        {/* ── Responsive grid: 2-col desktop / 1-col mobile ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
          gap: isMobile ? 16 : 24,
        }}>

          {/* ── Left / main: date strip + tasks ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Date strip */}
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 14,
              padding: '16px 20px', borderRadius: 'var(--radius)',
              background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
              boxShadow: '0 2px 6px rgba(43,32,14,0.04)',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: isMobile ? 44 : 52,
                fontWeight: 800, color: 'var(--color-accent)', letterSpacing: -1.5, lineHeight: 1,
              }}>
                {format(today, 'd')}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 17 : 20, fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.1 }}>
                  {format(today, 'EEEE')}
                </div>
                <div style={{ fontSize: 14, color: 'var(--color-ink-soft)', marginTop: 2 }}>
                  {format(today, 'MMMM yyyy')}
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <div style={{
                background: 'var(--color-good-soft)', color: 'var(--color-good)',
                padding: '5px 10px', borderRadius: 10,
                fontSize: isMobile ? 10 : 12, fontWeight: 700, letterSpacing: 0.5,
              }}>
                ● {tr('ALL WELL', 'সব প্রশান্ত')}
              </div>
              <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
                {doneCount}/{plans.length}
              </div>
            </div>

            {/* Task section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1.5 }}>
                {tr('TODAY', 'আজ')} · {plans.filter(p => !p.is_done).length} {tr('THINGS', 'কাজ')}
              </span>
            </div>

            <TaskList />
          </div>

          {/* ── Right / sidebar: daily tip + clock ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Daily tip */}
            <div style={{
              background: 'var(--color-accent-soft)',
              border: '1.5px solid color-mix(in srgb, var(--color-accent) 25%, transparent)',
              borderRadius: 'var(--radius)', padding: 'var(--padding)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>💡</span>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)' }}>
                  {tr('Daily tip', 'দৈনিক পরামর্শ')}
                </p>
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-ink-soft)', lineHeight: 1.6 }}>
                {tr(
                  'Taking short walks in the morning helps improve memory and mood throughout the day.',
                  'সকালে সংক্ষিপ্ত হাঁটাহাঁটি সারাদিনের স্মৃতি ও মেজাজ উন্নত করতে সাহায্য করে।'
                )}
              </p>
            </div>

            {/* Clock — only on desktop, phone already shows time */}
            {!isMobile && (
              <div style={{
                background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius)', padding: 'var(--padding)', textAlign: 'center',
              }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800, color: 'var(--color-ink)', letterSpacing: -1 }}>
                  {format(now, 'h:mm')}
                </p>
                <p style={{ fontSize: 14, color: 'var(--color-ink-mute)', marginTop: 4 }}>
                  {format(now, 'a')} · {format(now, 'EEEE')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
