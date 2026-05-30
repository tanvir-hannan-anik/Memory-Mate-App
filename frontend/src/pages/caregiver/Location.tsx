import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { db, listenLocation, listenAlerts, resolveAllAlerts } from '@/lib/firebase'
import { collection, query, where, getDocs, getDoc, doc as fsDoc } from 'firebase/firestore'
import { CaregiverPatient } from '@/types'
import Icon from '@/components/ui/Icon'
import { format } from 'date-fns'

interface MovementEntry {
  lat: number; lng: number; label: string; time: string
}

export default function Location() {
  const { profile } = useAuth()
  const { tr } = useLang()

  const [patients, setPatients]         = useState<CaregiverPatient[]>([])
  const [selected, setSelected]         = useState<CaregiverPatient | null>(null)
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number; label?: string; accuracy?: number } | null>(null)
  const [hasAlert, setHasAlert]         = useState(false)
  const [movements, setMovements]       = useState<MovementEntry[]>([])
  const [calling] = useState(false)

  // Load patients
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
      if (list.length > 0) setSelected(list[0])
    }
    load()
  }, [profile])

  // Subscribe to Firebase live location
  useEffect(() => {
    if (!selected) return
    const unsubLoc = listenLocation(selected.patient_id, data => {
      if (!data) return
      setLiveLocation(data)
      setMovements(prev => {
        const entry = {
          lat: data.lat, lng: data.lng,
          label: data.label || `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`,
          time: format(new Date(), 'h:mm a'),
        }
        const filtered = prev.filter(m => !(Math.abs(m.lat - data.lat) < 0.0002 && Math.abs(m.lng - data.lng) < 0.0002))
        return [entry, ...filtered].slice(0, 8)
      })
    })

    const THIRTY_MIN = 30 * 60 * 1000
    const unsubAlert = listenAlerts(selected.patient_id, alerts => {
      const now = Date.now()
      const recent = (alerts as any[]).filter(a => {
        if (a.resolved) return false
        const ts = typeof a.ts === 'number' ? a.ts : (a.ts?.toMillis?.() ?? 0)
        return ts === 0 || (now - ts) < THIRTY_MIN
      })
      setHasAlert(recent.length > 0)
    })

    return () => { unsubLoc(); unsubAlert() }
  }, [selected])

  function callPatient() {
    const phone = selected?.patient?.phone
    if (!phone) { alert(tr('No phone number on file for this patient', 'এই রোগীর ফোন নম্বর নেই')); return }
    window.location.href = `tel:${String(phone).replace(/\s/g, '')}`
  }

  return (
    <div className="screen" style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-800 text-ink">{tr('Location', 'অবস্থান')}</h1>
          {liveLocation ? (
            <p className="text-xs text-good font-600 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-good inline-block" />
              {tr('Live tracking', 'সরাসরি ট্র্যাকিং')}
            </p>
          ) : (
            <p className="text-xs text-ink-mute mt-0.5">{tr('Waiting for patient location…', 'রোগীর অবস্থানের জন্য অপেক্ষা করছে…')}</p>
          )}
        </div>
        <button
          onClick={callPatient}
          disabled={calling || !selected}
          className="btn btn-primary flex items-center gap-2 px-4"
          style={{ minHeight: 38, fontSize: 13 }}
        >
          <Icon name="phone" size={15} />
          {tr('Call', 'কল')}
        </button>
      </div>

      {/* Emergency alert */}
      {hasAlert && selected && (
        <div className="mx-4 mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-danger-soft border border-danger">
          <Icon name="alert-triangle" size={18} color="var(--color-danger)" />
          <div className="flex-1">
            <p className="font-700 text-danger text-sm">{tr('Emergency alert!', 'জরুরি সতর্কতা!')}</p>
            <p className="text-xs text-danger opacity-80">{tr('Patient needs help', 'রোগীর সাহায্য দরকার')}</p>
          </div>
          <button
            onClick={() => resolveAllAlerts(selected.patient_id)}
            className="text-xs font-700 text-danger underline underline-offset-2 flex-shrink-0 px-1"
          >
            {tr('Resolve', 'সমাধান')}
          </button>
          <span className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
        </div>
      )}

      {/* Current location card */}
      <div className="mx-4 mb-4 card">
        <div className="flex items-center gap-3 mb-3">
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: liveLocation ? 'var(--color-good-soft)' : 'var(--color-bg-warm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="map-pin" size={20} color={liveLocation ? 'var(--color-good)' : 'var(--color-ink-mute)'} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-700 text-ink">
              {liveLocation
                ? (movements[0]?.label || tr('Location received', 'অবস্থান পাওয়া গেছে'))
                : tr('No location yet', 'এখনও অবস্থান নেই')}
            </p>
            {liveLocation && (
              <p className="text-xs text-ink-mute mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {liveLocation.lat.toFixed(5)}, {liveLocation.lng.toFixed(5)}
                {liveLocation.accuracy != null && (
                  <span className="ml-2 font-600" style={{
                    color: liveLocation.accuracy < 100 ? 'var(--color-good)' : liveLocation.accuracy < 500 ? '#E89B4A' : 'var(--color-danger)',
                  }}>
                    ±{liveLocation.accuracy}m
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Patient selector */}
        {patients.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {patients.map(p => (
              <button
                key={p.patient_id}
                onClick={() => setSelected(p)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: selected?.patient_id === p.patient_id ? 'var(--color-accent)' : 'var(--color-bg-warm)',
                  color: selected?.patient_id === p.patient_id ? '#fff' : 'var(--color-ink-soft)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                {p.patient?.name || 'Patient'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Movement timeline */}
      <div className="px-4">
        <p className="text-xs font-700 text-ink-mute uppercase tracking-wide mb-3">
          {tr("Today's movements", 'আজকের চলাফেরা')} ({movements.length})
        </p>

        {movements.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 py-8 text-center">
            <Icon name="map-pin" size={32} color="var(--color-ink-mute)" />
            <p className="text-sm text-ink-soft font-600">{tr('No location data yet', 'এখনও কোনো অবস্থান ডেটা নেই')}</p>
            <p className="text-xs text-ink-mute px-4">
              {tr('Location updates appear here when the patient opens the app', 'রোগী অ্যাপ খুললে অবস্থান আপডেট এখানে দেখাবে')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {movements.map((m, i) => (
              <div key={i} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: i === 0 ? 'var(--color-good-soft)' : 'var(--color-bg-warm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="map-pin" size={16} color={i === 0 ? 'var(--color-good)' : 'var(--color-ink-mute)'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.label}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-ink-mute)', marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {m.lat.toFixed(5)}, {m.lng.toFixed(5)}
                  </p>
                </div>
                <span style={{ fontSize: 11, color: 'var(--color-ink-mute)', flexShrink: 0 }}>{m.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
