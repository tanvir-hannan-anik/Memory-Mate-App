import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { db, sendEmergencyAlert, pushLocation } from '@/lib/firebase'
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { PatientCaregiver } from '@/types'
import Icon from '@/components/ui/Icon'
import { format } from 'date-fns'
import api from '@/lib/api'
import { initMap, addProfileMarker, addAccuracyCircle, reverseGeocode } from '@/lib/googleMaps'

const HOLD_DURATION = 700

interface EmergencyProps {
  onClose: () => void
}

export default function Emergency({ onClose }: EmergencyProps) {
  const { profile } = useAuth()
  const { tr } = useLang()
  const [active, setActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [holding, setHolding] = useState(false)
  const [caregivers, setCaregivers] = useState<PatientCaregiver[]>([])
  const [now, setNow] = useState(new Date())
  const [calling, setCalling] = useState<string | null>(null)
  const [locLabel, setLocLabel] = useState<string | null>(null)
  const [locCoordLabel, setLocCoordLabel] = useState<string | null>(null)
  const [locAccuracy, setLocAccuracy] = useState<number | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'found' | 'denied' | 'unavailable'>('searching')

  const holdTimer   = useRef<ReturnType<typeof setInterval>>()
  const holdStart   = useRef<number>(0)
  const mapRef        = useRef<HTMLDivElement>(null)
  const mapObj        = useRef<google.maps.Map | null>(null)
  const markerRef     = useRef<google.maps.Marker | null>(null)
  const accuracyRef   = useRef<google.maps.Circle | null>(null)
  const watchId       = useRef<number | null>(null)
  const clockTimer    = useRef<ReturnType<typeof setInterval>>()

  const displayName = profile?.name || 'User'

  // Load caregivers
  useEffect(() => {
    if (!profile) return
    async function load() {
      const snap = await getDocs(query(
        collection(db, 'caregiver_patients'),
        where('patient_id', '==', profile!.id)
      ))
      const list = await Promise.all(snap.docs.map(async d => {
        const data = d.data()
        const cgSnap = await getDoc(doc(db, 'profiles', data.caregiver_id))
        return { ...data, caregiver: cgSnap.exists() ? cgSnap.data() : null }
      }))
      setCaregivers(list as PatientCaregiver[])
    }
    load()
  }, [profile])

  // Clock tick
  useEffect(() => {
    if (!active) return
    clockTimer.current = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(clockTimer.current)
  }, [active])

  // Init map + GPS when emergency activates
  useEffect(() => {
    if (!active) return
    if (!mapRef.current || mapObj.current) return

    const photoUrl = profile?.avatar_url ?? null

    async function applyPosition(m: any, loc: { lat: number; lng: number }, accuracy: number) {
      setGpsStatus('found')
      setLocAccuracy(Math.round(accuracy))
      setLocCoordLabel(`${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`)
      m.panTo(loc)
      m.setZoom(accuracy < 200 ? 17 : accuracy < 1000 ? 16 : 15)

      // Update or create profile marker
      if (markerRef.current) {
        markerRef.current.setPosition(loc)
      } else {
        markerRef.current = await addProfileMarker(m, loc, photoUrl, displayName)
      }

      // Update or create blue accuracy circle
      if (accuracyRef.current) {
        accuracyRef.current.setCenter(loc)
        accuracyRef.current.setRadius(Math.max(accuracy, 5))
      } else {
        accuracyRef.current = await addAccuracyCircle(m, loc, accuracy)
      }
    }

    async function start() {
      try {
        // Init map at a neutral center — GPS will pan it immediately
        const m = await initMap(mapRef.current!, { lat: 23.8103, lng: 90.4125 }, 5)
        mapObj.current = m
        setMapReady(true)

        if (!navigator.geolocation) { setGpsStatus('denied'); return }

        // ── Step 1: cached/coarse position (shows map fast, like Google Maps) ──
        navigator.geolocation.getCurrentPosition(
          async pos => {
            if (!mapObj.current) return
            await applyPosition(mapObj.current, { lat: pos.coords.latitude, lng: pos.coords.longitude }, pos.coords.accuracy)
            const label = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
            setLocLabel(label)
            if (profile) pushLocation(profile.id, pos.coords.latitude, pos.coords.longitude, label, Math.round(pos.coords.accuracy))
          },
          () => { setGpsStatus('searching') },
          { enableHighAccuracy: false, maximumAge: 30000, timeout: 3000 }
        )

        // ── Step 2: high-accuracy GPS fix (refines the position) ──
        navigator.geolocation.getCurrentPosition(
          async pos => {
            if (!mapObj.current) return
            await applyPosition(mapObj.current, { lat: pos.coords.latitude, lng: pos.coords.longitude }, pos.coords.accuracy)
            const label = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
            setLocLabel(label)
            if (profile) pushLocation(profile.id, pos.coords.latitude, pos.coords.longitude, label, Math.round(pos.coords.accuracy))
          },
          err => {
            if (err.code === 1) setGpsStatus('denied')
            else if (err.code === 2) setGpsStatus('unavailable')
            // code 3 = timeout — watchPosition below will keep trying
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        )

        // ── Step 3: continuous watch for live updates ──
        watchId.current = navigator.geolocation.watchPosition(
          async pos => {
            if (!mapObj.current) return
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
            await applyPosition(mapObj.current, loc, pos.coords.accuracy)
            if (profile) pushLocation(profile.id, loc.lat, loc.lng, undefined, Math.round(pos.coords.accuracy))
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000 }
        )
      } catch (e) {
        console.error('Map init failed:', e)
      }
    }

    start()

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
    }
  }, [active])

  function recenter() {
    if (mapObj.current && markerRef.current) {
      const pos = markerRef.current.getPosition()
      if (pos) mapObj.current.panTo(pos)
    }
  }

  function retryGps() {
    setGpsStatus('searching')
    if (!navigator.geolocation || !mapObj.current) return
    const photoUrl = profile?.avatar_url ?? null
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        const acc = pos.coords.accuracy
        setGpsStatus('found')
        setLocAccuracy(Math.round(acc))
        setLocCoordLabel(`${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`)
        mapObj.current!.panTo(loc)
        mapObj.current!.setZoom(acc < 200 ? 17 : 16)
        if (markerRef.current) markerRef.current.setPosition(loc)
        else markerRef.current = await addProfileMarker(mapObj.current!, loc, photoUrl, displayName)
        if (accuracyRef.current) { accuracyRef.current.setCenter(loc); accuracyRef.current.setRadius(Math.max(acc, 5)) }
        else accuracyRef.current = await addAccuracyCircle(mapObj.current!, loc, acc)
        const label = await reverseGeocode(loc.lat, loc.lng)
        setLocLabel(label)
        if (profile) pushLocation(profile.id, loc.lat, loc.lng, label, Math.round(acc))
      },
      err => setGpsStatus(err.code === 2 ? 'unavailable' : 'denied'),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  function startHold() {
    setHolding(true)
    holdStart.current = Date.now()
    holdTimer.current = setInterval(() => {
      const elapsed = Date.now() - holdStart.current
      const p = Math.min((elapsed / HOLD_DURATION) * 100, 100)
      setProgress(p)
      if (p >= 100) {
        clearInterval(holdTimer.current)
        setActive(true)
        setHolding(false)
        setProgress(0)
        if (profile) {
          sendEmergencyAlert(profile.id, profile.name)
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos =>
              pushLocation(profile.id, pos.coords.latitude, pos.coords.longitude, 'Emergency')
            )
          }
        }
      }
    }, 16)
  }

  function endHold() {
    clearInterval(holdTimer.current)
    setProgress(0)
    setHolding(false)
  }

  function dismissActive() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    mapObj.current = null
    markerRef.current = null
    accuracyRef.current = null
    setActive(false)
    setMapReady(false)
    setGpsStatus('searching')
    setLocLabel(null)
    setLocCoordLabel(null)
    onClose()
  }

  async function callCaregiver(cg: PatientCaregiver) {
    if (!cg.caregiver?.phone) return
    setCalling(cg.caregiver_id)
    try {
      await api.post('/calls/initiate', {
        to: cg.caregiver.phone, patient_id: profile?.id, caregiver_id: cg.caregiver_id,
      })
    } catch {
      alert(tr('Could not initiate call', 'কল শুরু করা যায়নি'))
    } finally {
      setCalling(null)
    }
  }

  const hh = now.getHours()
  const greeting = hh < 12
    ? tr('GOOD MORNING', 'সুপ্রভাত')
    : hh < 17 ? tr('GOOD AFTERNOON', 'শুভ দুপুর')
    : tr('GOOD EVENING', 'শুভ সন্ধ্যা')

  /* ── IDLE ── */
  if (!active) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'var(--color-bg)',
        display: 'flex', flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            width: 44, height: 44, borderRadius: 22,
            background: 'var(--color-bg-warm)', border: '1.5px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Icon name="x" size={20} color="var(--color-ink-mute)" />
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px' }}>
          <div style={{ position: 'relative', marginBottom: 36 }}>
            <div style={{ position: 'absolute', inset: -36, borderRadius: '50%', background: 'var(--color-accent)', opacity: 0.07, animation: 'memora-ripple 2.4s ease-out infinite' }} />
            <div style={{ position: 'absolute', inset: -18, borderRadius: '50%', background: 'var(--color-accent)', opacity: 0.12, animation: 'memora-ripple 2.4s ease-out infinite', animationDelay: '0.6s' }} />
            <button
              onMouseDown={startHold} onMouseUp={endHold} onMouseLeave={endHold}
              onTouchStart={startHold} onTouchEnd={endHold}
              style={{
                width: 220, height: 220, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, var(--color-accent), var(--color-accent-dark))',
                border: 'none', color: '#fff',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 20px 50px rgba(30,110,114,0.50), inset 0 -8px 20px rgba(0,0,0,0.15)',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                transform: holding ? 'scale(0.93)' : 'scale(1)',
                transition: 'transform 200ms ease-out',
              }}
            >
              {progress > 0 && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.22)',
                  clipPath: `inset(${100 - progress}% 0 0 0)`,
                }} />
              )}
              <Icon name="shield" size={52} color="#fff" />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, position: 'relative', zIndex: 1, textAlign: 'center', lineHeight: 1.2 }}>
                {tr('I need help', 'আমার সাহায্য')}
                <br /><span style={{ fontSize: 17, fontWeight: 600, opacity: 0.85 }}>{tr('', 'দরকার')}</span>
              </div>
            </button>
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-ink)', textAlign: 'center', lineHeight: 1.4, marginBottom: 8 }}>
            {tr('If you feel lost or scared', 'যদি হারিয়ে যাওয়ার ভয় লাগে')}
          </p>
          <p style={{ fontSize: 16, color: 'var(--color-ink-soft)', textAlign: 'center', lineHeight: 1.5 }}>
            {tr('Press and hold the button.', 'বোতামটি চেপে ধরুন।')}<br />
            {tr('We will help you.', 'আমরা সাহায্য করবো।')}
          </p>
        </div>

        {caregivers.length > 0 && (
          <div style={{ padding: '0 20px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1.2, marginBottom: 10, textAlign: 'center' }}>
              {tr('YOUR SUPPORT TEAM', 'তোমার পরিবার')}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {caregivers.slice(0, 3).map(cg => (
                <div key={cg.caregiver_id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                  borderRadius: 16, padding: '10px 14px',
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 19, background: 'var(--color-accent)', color: '#fff', fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {(cg.caregiver?.name || 'C')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>{cg.caregiver?.name || tr('Caregiver', 'পরিচর্যাকারী')}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-mute)' }}>{(cg as any).relationship || tr('Caregiver', 'পরিচর্যাকারী')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: '0 20px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--color-ink-mute)' }}>
            {tr('Works even without internet', 'ইন্টারনেট ছাড়াও কাজ করে')}
          </div>
        </div>
      </div>
    )
  }

  /* ── ACTIVE ── */
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Reassurance banner */}
      <div style={{
        background: 'linear-gradient(160deg, var(--color-accent), var(--color-accent-dark))',
        padding: '52px 20px 18px',
        color: '#fff', position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="shield" size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, letterSpacing: 1.5 }}>{tr('YOU ARE SAFE', 'আপনি নিরাপদ')}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{tr("Take a breath. We've got you.", 'শ্বাস নিন। আমরা আছি।')}</div>
          </div>
          <button onClick={dismissActive} style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Icon name="x" size={18} color="#fff" />
          </button>
        </div>
      </div>

      {/* ── Identity + caregivers strip (fixed, no scroll) ── */}
      <div style={{ padding: '10px 16px', flexShrink: 0 }}>

        {/* Identity row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
          borderRadius: 16, padding: '10px 14px', marginBottom: 10,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 24, flexShrink: 0,
            background: 'var(--color-accent)', color: '#fff',
            fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {displayName[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1 }}>{tr('YOU ARE', 'তুমি হলো')}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--color-ink)', lineHeight: 1.1 }}>{displayName}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--color-accent)', lineHeight: 1 }}>{format(now, 'h:mm')}</div>
            <div style={{ fontSize: 11, color: 'var(--color-ink-mute)' }}>{format(now, 'a · MMM d')}</div>
          </div>
        </div>

        {/* Caregivers horizontal strip */}
        {caregivers.length > 0 && (
          <div style={{ overflowX: 'auto', whiteSpace: 'nowrap', scrollbarWidth: 'none', marginBottom: 2 }}>
            <div style={{ display: 'inline-flex', gap: 8 }}>
              {caregivers.slice(0, 4).map((cg, idx) => (
                <button
                  key={cg.caregiver_id}
                  onClick={() => callCaregiver(cg)}
                  disabled={calling === cg.caregiver_id}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    background: idx === 0 ? 'var(--color-good-soft)' : 'var(--color-surface)',
                    border: `1.5px solid ${idx === 0 ? 'var(--color-good)' : 'var(--color-border)'}`,
                    borderRadius: 14, padding: '10px 14px', cursor: 'pointer',
                    fontFamily: 'inherit', flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 18, flexShrink: 0,
                    background: idx === 0 ? 'var(--color-good)' : 'var(--color-accent)',
                    color: '#fff', fontSize: 15, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {(cg.caregiver?.name || 'C')[0].toUpperCase()}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)', whiteSpace: 'nowrap' }}>
                      {cg.caregiver?.name || tr('Caregiver', 'পরিচর্যাকারী')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-ink-soft)' }}>
                      {(cg as any).relationship || tr('Caregiver', 'পরিচর্যাকারী')}
                    </div>
                  </div>
                  <div style={{
                    background: idx === 0 ? 'var(--color-good)' : 'var(--color-accent)',
                    color: '#fff', borderRadius: 10, padding: '6px 12px',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    {calling === cg.caregiver_id
                      ? <span style={{ width: 12, height: 12, borderRadius: 6, border: '2px solid #fff', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                      : <Icon name="phone" size={13} color="#fff" />}
                    {tr('Call', 'ফোন')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Map — fills all remaining space ── */}
      <div style={{ flex: 1, margin: '0 16px', borderRadius: 20, overflow: 'hidden', border: '1.5px solid var(--color-border)', position: 'relative', minHeight: 0 }}>

        {/* Map canvas — fills parent */}
        <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />

        {/* Loading overlay */}
        {!mapReady && (
          <div style={{ position: 'absolute', inset: 0, background: 'var(--color-bg-warm)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: 13, border: '3px solid var(--color-accent)', borderTopColor: 'transparent', display: 'block', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 13, color: 'var(--color-ink-soft)', fontWeight: 600 }}>{tr('Loading map…', 'মানচিত্র লোড হচ্ছে…')}</span>
          </div>
        )}

        {/* GPS status badge — top left */}
        {mapReady && gpsStatus === 'found' && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(255,255,255,0.95)', border: '1.5px solid var(--color-good)',
            borderRadius: 12, padding: '5px 10px',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 700, color: 'var(--color-good)',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--color-good)', display: 'inline-block' }} />
            GPS LIVE
            {locAccuracy !== null && <span style={{ color: 'var(--color-ink-mute)', fontWeight: 500 }}>±{locAccuracy}m</span>}
          </div>
        )}
        {mapReady && gpsStatus === 'searching' && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(255,255,255,0.95)', border: '1.5px solid var(--color-border)',
            borderRadius: 12, padding: '5px 10px',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, color: 'var(--color-ink-soft)',
          }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, border: '2px solid var(--color-accent)', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
            {tr('Finding location…', 'অবস্থান খোঁজা হচ্ছে…')}
          </div>
        )}
        {mapReady && (gpsStatus === 'denied' || gpsStatus === 'unavailable') && (
          <div style={{
            position: 'absolute', top: 10, left: 10, right: 10,
            background: 'rgba(255,255,255,0.97)', border: '1.5px solid var(--color-danger)',
            borderRadius: 14, padding: '10px 14px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--color-danger)' }}>
              <span>⚠️</span>
              {gpsStatus === 'denied'
                ? tr('Location access blocked', 'অবস্থান অ্যাক্সেস ব্লক করা হয়েছে')
                : tr('GPS signal unavailable', 'জিপিএস সংকেত পাওয়া যাচ্ছে না')}
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-ink-soft)', lineHeight: 1.5, margin: 0 }}>
              {gpsStatus === 'denied'
                ? tr(
                    'Open browser Settings → Site settings → Location → Allow for this site, then tap Retry.',
                    'ব্রাউজার সেটিংস → সাইট সেটিংস → অবস্থান → এই সাইটের জন্য অনুমতি দিন, তারপর Retry চাপুন।'
                  )
                : tr(
                    'Move to an open area or check that your device GPS is turned on, then tap Retry.',
                    'খোলা জায়গায় যান বা ডিভাইসের GPS চালু আছে কিনা দেখুন, তারপর Retry চাপুন।'
                  )}
            </p>
            <button
              onClick={retryGps}
              style={{
                alignSelf: 'flex-start',
                background: 'var(--color-danger)', color: '#fff',
                border: 'none', borderRadius: 8, padding: '5px 14px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {tr('Retry', 'আবার চেষ্টা করুন')}
            </button>
          </div>
        )}

        {/* Recenter button */}
        {mapReady && gpsStatus === 'found' && (
          <button onClick={recenter} style={{
            position: 'absolute', top: 10, right: 10,
            width: 36, height: 36, borderRadius: 18,
            background: '#fff', border: '1.5px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}>
            <Icon name="crosshair" size={17} color="var(--color-accent)" />
          </button>
        )}

        {/* Address pill — bottom of map */}
        <div style={{
          position: 'absolute', bottom: 10, left: 10, right: 10,
          background: 'rgba(255,255,255,0.96)',
          border: '1px solid var(--color-border)',
          borderRadius: 14, padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="map-pin" size={14} color="var(--color-accent-dark)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {locLabel
                ? locLabel.split(',').slice(0, 2).join(',')
                : gpsStatus === 'found'
                  ? tr('Getting address…', 'ঠিকানা নেওয়া হচ্ছে…')
                  : tr('Locating…', 'অবস্থান খোঁজা হচ্ছে…')}
            </div>
            {locCoordLabel && (
              <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
                {locCoordLabel}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* spacer */}
      <div style={{ height: 10, flexShrink: 0 }} />

      {/* Footer dismiss */}
      <div style={{ padding: '10px 20px 28px', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)', flexShrink: 0 }}>
        <button onClick={dismissActive} style={{
          width: '100%', padding: '16px 24px',
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: 18,
          color: 'var(--color-ink)', fontSize: 17, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {tr("I'm okay now", 'আমি এখন ভালো আছি')}
          <span style={{ color: 'var(--color-good)', fontSize: 20 }}>✓</span>
        </button>
      </div>
    </div>
  )
}
