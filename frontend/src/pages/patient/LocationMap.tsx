import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { pushLocation } from '@/lib/firebase'
import Icon from '@/components/ui/Icon'

type GpsStatus = 'searching' | 'found' | 'denied' | 'unavailable'

export default function LocationMap() {
  const { profile } = useAuth()
  const { tr } = useLang()

  const [gpsStatus, setGpsStatus]     = useState<GpsStatus>('searching')
  const [accuracy, setAccuracy]       = useState<number | null>(null)
  const [address, setAddress]         = useState<string | null>(null)
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const watchId      = useRef<number | null>(null)
  const geocodeTimer = useRef<ReturnType<typeof setTimeout>>()

  function applyPosition(loc: { lat: number; lng: number }, acc: number) {
    setGpsStatus('found')
    setAccuracy(Math.round(acc))
    setCoords(loc)
    setLastUpdated(new Date())

    clearTimeout(geocodeTimer.current)
    geocodeTimer.current = setTimeout(async () => {
      if (profile) pushLocation(profile.id, loc.lat, loc.lng, undefined, Math.round(acc))
    }, 1200)
  }

  useEffect(() => {
    if (!navigator.geolocation) { setGpsStatus('unavailable'); return }

    navigator.geolocation.getCurrentPosition(
      pos => applyPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }, pos.coords.accuracy),
      () => {},
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 3000 }
    )

    navigator.geolocation.getCurrentPosition(
      pos => applyPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }, pos.coords.accuracy),
      err => {
        if (err.code === 1) setGpsStatus('denied')
        else if (err.code === 2) setGpsStatus('unavailable')
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )

    watchId.current = navigator.geolocation.watchPosition(
      pos => applyPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }, pos.coords.accuracy),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    )

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
      clearTimeout(geocodeTimer.current)
    }
  }, [])

  function retryGps() {
    setGpsStatus('searching')
    setAccuracy(null)
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => applyPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }, pos.coords.accuracy),
      err => setGpsStatus(err.code === 2 ? 'unavailable' : 'denied'),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  const accuracyColor =
    accuracy === null       ? 'var(--color-ink-mute)'
    : accuracy < 100        ? 'var(--color-good)'
    : accuracy < 500        ? '#E89B4A'
    : 'var(--color-danger)'

  const updatedText = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="screen" style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-ink)', fontFamily: 'var(--font-display)', margin: '0 0 4px' }}>
          {tr('My Location', 'আমার অবস্থান')}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {gpsStatus === 'found' ? (
            <>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--color-good)', display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-good)' }}>
                {tr('GPS Live', 'GPS সক্রিয়')}
              </span>
              {accuracy !== null && (
                <span style={{ fontSize: 11, color: accuracyColor, fontWeight: 700 }}>±{accuracy}m</span>
              )}
              {updatedText && (
                <span style={{ fontSize: 11, color: 'var(--color-ink-mute)' }}>· {updatedText}</span>
              )}
            </>
          ) : gpsStatus === 'searching' ? (
            <>
              <span style={{ width: 10, height: 10, borderRadius: 5, border: '2px solid var(--color-accent)', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 12, color: 'var(--color-ink-mute)' }}>{tr('Finding location…', 'অবস্থান খোঁজা হচ্ছে…')}</span>
            </>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 600 }}>
              {gpsStatus === 'denied' ? tr('Location blocked', 'অবস্থান ব্লক') : tr('GPS unavailable', 'GPS পাওয়া যাচ্ছে না')}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Location card */}
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 20, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: coords ? 14 : 0 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: gpsStatus === 'found' ? 'var(--color-good-soft)' : 'var(--color-bg-warm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="map-pin" size={26} color={gpsStatus === 'found' ? 'var(--color-good)' : 'var(--color-ink-mute)'} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 2 }}>
                {address
                  ? address.split(',').slice(0, 2).join(',')
                  : gpsStatus === 'found'
                    ? tr('Getting address…', 'ঠিকানা নেওয়া হচ্ছে…')
                    : tr('Searching…', 'খোঁজা হচ্ছে…')}
              </div>
              {coords && (
                <div style={{ fontSize: 12, color: 'var(--color-ink-mute)', fontVariantNumeric: 'tabular-nums' }}>
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </div>
              )}
            </div>
          </div>

          {accuracy !== null && (
            <div style={{
              background: 'var(--color-bg-warm)', borderRadius: 12, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: accuracyColor, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                {tr('Accuracy', 'নির্ভুলতা')}: <span style={{ color: accuracyColor }}>±{accuracy}m</span>
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-ink-mute)', marginLeft: 'auto' }}>
                {accuracy < 100 ? tr('High', 'উচ্চ') : accuracy < 500 ? tr('Medium', 'মধ্যম') : tr('Low', 'কম')}
              </span>
            </div>
          )}
        </div>

        {/* Error / retry */}
        {(gpsStatus === 'denied' || gpsStatus === 'unavailable') && (
          <div style={{ background: 'var(--color-danger-soft)', border: '1.5px solid var(--color-danger)', borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon name="alert-triangle" size={18} color="var(--color-danger)" />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-danger)' }}>
                {gpsStatus === 'denied' ? tr('Location access blocked', 'অবস্থান অ্যাক্সেস ব্লক') : tr('GPS signal unavailable', 'GPS সংকেত নেই')}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-ink-soft)', lineHeight: 1.6, margin: '0 0 12px' }}>
              {gpsStatus === 'denied'
                ? tr('Allow location access in your browser settings, then tap Retry.', 'ব্রাউজার সেটিংসে অবস্থানের অনুমতি দিন, তারপর আবার চেষ্টা করুন।')
                : tr('Move to an open area and make sure your device GPS is on, then tap Retry.', 'খোলা জায়গায় যান, ডিভাইসের GPS চালু আছে কিনা দেখুন, তারপর আবার চেষ্টা করুন।')}
            </p>
            <button
              onClick={retryGps}
              style={{
                background: 'var(--color-danger)', color: '#fff', border: 'none',
                borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {tr('Retry', 'আবার চেষ্টা করুন')}
            </button>
          </div>
        )}

        {/* Sharing info */}
        {gpsStatus === 'found' && (
          <div style={{ background: 'var(--color-accent-soft)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="shield" size={18} color="var(--color-accent-dark)" />
            <p style={{ fontSize: 12, color: 'var(--color-accent-dark)', fontWeight: 600, margin: 0 }}>
              {tr('Your location is being shared with your caregivers.', 'আপনার অবস্থান আপনার কেয়ারগিভারদের সাথে শেয়ার হচ্ছে।')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
