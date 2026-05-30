import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

const API_KEY = import.meta.env.VITE_GOOGLE2_API_KEY as string

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GMaps = any

let _ready = false
function init() {
  if (!_ready) {
    setOptions({ key: API_KEY, v: 'weekly', authReferrerPolicy: 'origin' })
    _ready = true
  }
}

// importLibrary handles deduplication internally — no manual caching needed
async function mapsLib():    Promise<GMaps> { init(); return importLibrary('maps') }
async function markerLib():  Promise<GMaps> { init(); return importLibrary('marker') }
async function geocodeLib(): Promise<GMaps> { init(); return importLibrary('geocoding') }
async function routesLib():  Promise<GMaps> { init(); return importLibrary('routes') }
async function coreLib():    Promise<GMaps> { init(); return importLibrary('core') }

// ── Map ──────────────────────────────────────────────────────────
export async function initMap(
  container: HTMLElement,
  center: { lat: number; lng: number },
  zoom = 15
): Promise<GMaps> {
  const { Map } = await mapsLib()
  return new Map(container, {
    center, zoom,
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'greedy',
    styles: [
      { featureType: 'poi',       stylers: [{ visibility: 'off' }] },
      { featureType: 'transit',   stylers: [{ visibility: 'off' }] },
      { featureType: 'water',     elementType: 'geometry', stylers: [{ color: '#aadaff' }] },
      { featureType: 'road',      elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
      { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f5f0' }] },
    ],
  })
}

// ── Safe zone circle ─────────────────────────────────────────────
export async function addSafeZone(
  map: GMaps,
  center: { lat: number; lng: number },
  radiusMeters = 500
): Promise<GMaps> {
  const { Circle } = await mapsLib()
  return new Circle({
    map, center, radius: radiusMeters,
    fillColor: '#1E6E72', fillOpacity: 0.08,
    strokeColor: '#1E6E72', strokeOpacity: 0.6, strokeWeight: 2,
  })
}

// ── GPS accuracy circle (Google Maps blue radius) ─────────────────
export async function addAccuracyCircle(
  map: GMaps,
  center: { lat: number; lng: number },
  radiusMeters: number
): Promise<GMaps> {
  const { Circle } = await mapsLib()
  return new Circle({
    map, center, radius: Math.max(radiusMeters, 5),
    fillColor: '#4285F4', fillOpacity: 0.12,
    strokeColor: '#4285F4', strokeOpacity: 0.35, strokeWeight: 1.5,
    clickable: false, zIndex: 1,
  })
}

// ── Profile photo marker (Google Maps blue dot style) ─────────────
export async function addProfileMarker(
  map: GMaps,
  position: { lat: number; lng: number },
  photoUrl: string | null | undefined,
  displayName: string
): Promise<GMaps> {
  const { Marker }           = await mapsLib()
  const { Size, Point }      = await coreLib()

  const SIZE   = 52
  const BORDER = 3
  const canvas = document.createElement('canvas')
  canvas.width  = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  const cx = SIZE / 2, cy = SIZE / 2, r = SIZE / 2 - 1

  // Drop shadow
  ctx.shadowColor   = 'rgba(0,0,0,0.28)'
  ctx.shadowBlur    = 6
  ctx.shadowOffsetY = 2

  // White border ring
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur  = 0
  ctx.shadowOffsetY = 0

  // Blue background
  ctx.beginPath()
  ctx.arc(cx, cy, r - BORDER, 0, Math.PI * 2)
  ctx.fillStyle = '#4285F4'
  ctx.fill()

  // Profile photo inside the circle
  let drewPhoto = false
  if (photoUrl) {
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          ctx.save()
          ctx.beginPath()
          ctx.arc(cx, cy, r - BORDER, 0, Math.PI * 2)
          ctx.clip()
          const d = (r - BORDER) * 2
          ctx.drawImage(img, cx - (r - BORDER), cy - (r - BORDER), d, d)
          ctx.restore()
          drewPhoto = true
          resolve()
        }
        img.onerror = reject
        img.src = photoUrl
        setTimeout(reject, 4000)
      })
    } catch { /* fall through to initials */ }
  }

  if (!drewPhoto) {
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${Math.round(r * 0.72)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText((displayName[0] || 'U').toUpperCase(), cx, cy)
  }

  return new Marker({
    map, position,
    icon: {
      url: canvas.toDataURL(),
      scaledSize: new Size(SIZE, SIZE),
      anchor: new Point(cx, cy),
    },
    optimized: false,
    zIndex: 1000,
  })
}

// ── Caregiver marker ─────────────────────────────────────────────
export async function addCaregiverMarker(
  map: GMaps,
  position: { lat: number; lng: number },
): Promise<GMaps> {
  const { Marker, SymbolPath } = await mapsLib()
  return new Marker({
    map, position, title: 'You',
    icon: {
      path: SymbolPath.CIRCLE, scale: 12,
      fillColor: '#E89B4A', fillOpacity: 1,
      strokeColor: '#ffffff', strokeWeight: 3,
    },
    label: { text: 'C', color: 'white', fontWeight: '700', fontSize: '12px' },
  })
}

// ── Patient marker ───────────────────────────────────────────────
export async function addPatientMarker(
  map: GMaps,
  position: { lat: number; lng: number },
  label: string
): Promise<GMaps> {
  const { Marker, SymbolPath } = await mapsLib()
  return new Marker({
    map, position, title: label,
    icon: {
      path: SymbolPath.CIRCLE, scale: 14,
      fillColor: '#1E6E72', fillOpacity: 1,
      strokeColor: '#ffffff', strokeWeight: 3,
    },
    label: {
      text: (label[0] || '?').toUpperCase(),
      color: 'white', fontWeight: '700', fontSize: '13px',
    },
  })
}

// ── Polyline route ───────────────────────────────────────────────
export async function drawRoute(
  map: GMaps,
  waypoints: Array<{ lat: number; lng: number }>
): Promise<GMaps> {
  const { Polyline } = await mapsLib()
  return new Polyline({
    map, path: waypoints,
    strokeColor: '#1E6E72', strokeOpacity: 0.7, strokeWeight: 3,
  })
}

// ── Directions ───────────────────────────────────────────────────
export async function getDirections(
  origin: string | { lat: number; lng: number },
  destination: string | { lat: number; lng: number }
): Promise<GMaps | null> {
  const { DirectionsService, TravelMode } = await routesLib()
  return new Promise(resolve => {
    new DirectionsService().route(
      { origin, destination, travelMode: TravelMode.DRIVING },
      (result: GMaps, status: string) => resolve(status === 'OK' ? result : null)
    )
  })
}

export async function renderDirections(map: GMaps, result: GMaps): Promise<GMaps> {
  const { DirectionsRenderer } = await routesLib()
  const renderer = new DirectionsRenderer({
    map, suppressMarkers: false,
    polylineOptions: { strokeColor: '#1E6E72', strokeWeight: 4, strokeOpacity: 0.8 },
  })
  renderer.setDirections(result)
  return renderer
}

// ── Nominatim fallback (used when Google Geocoder fails) ─────────
async function nominatimReverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'Accept-Language': 'en' } }
  )
  const data = await res.json()
  if (data.display_name) return data.display_name
  const a = data.address || {}
  const parts = [a.road, a.neighbourhood, a.suburb, a.city_district, a.city, a.country].filter(Boolean)
  return parts.length ? parts.join(', ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

// ── Reverse geocode ──────────────────────────────────────────────
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const { Geocoder } = await geocodeLib()
    const result = await new Promise<string>((resolve, reject) => {
      new Geocoder().geocode(
        { location: { lat, lng } },
        (results: GMaps[], status: string) => {
          if (status === 'OK' && results?.[0]) resolve(results[0].formatted_address)
          else reject(new Error(status))
        }
      )
    })
    return result
  } catch {
    // Google Geocoding API unavailable or key lacks permission — fall back to Nominatim
    try {
      return await nominatimReverseGeocode(lat, lng)
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  }
}

export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const { Geocoder } = await geocodeLib()
  return new Promise(resolve => {
    new Geocoder().geocode(
      { address },
      (results: GMaps[], status: string) => {
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location
          resolve({ lat: loc.lat(), lng: loc.lng() })
        } else {
          resolve(null)
        }
      }
    )
  })
}
