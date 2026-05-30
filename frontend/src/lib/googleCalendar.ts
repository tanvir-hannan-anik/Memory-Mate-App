const API_KEY   = import.meta.env.VITE_GOOGLE_API_KEY as string
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string  // set after OAuth setup
const SCOPES    = 'https://www.googleapis.com/auth/calendar.events'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tokenClient: any = null
let gapiLoaded  = false
let gisLoaded   = false

// â”€â”€ Load GAPI + GIS scripts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload = () => res()
    s.onerror = rej
    document.head.appendChild(s)
  })
}

export async function initGoogleCalendar(): Promise<void> {
  await Promise.all([
    loadScript('https://apis.google.com/js/api.js'),
    loadScript('https://accounts.google.com/gsi/client'),
  ])

  await new Promise<void>(res =>
    (window as any).gapi.load('client', async () => {
      await (window as any).gapi.client.init({ apiKey: API_KEY, discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'] })
      gapiLoaded = true
      res()
    })
  )

  if (CLIENT_ID) {
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: () => {},
    })
    gisLoaded = true
  }
}

// â”€â”€ Request calendar access â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function requestCalendarAccess(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) { reject(new Error('Google Calendar not initialised. Set VITE_GOOGLE_CLIENT_ID.')); return }
    tokenClient.callback = (resp: any) => {
      if (resp.error) reject(resp)
      else resolve()
    }
    if ((window as any).gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' })
    } else {
      tokenClient.requestAccessToken({ prompt: '' })
    }
  })
}

// â”€â”€ Create calendar event â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function createCalendarEvent(event: {
  title: string
  date: string       // 'YYYY-MM-DD'
  time?: string      // 'HH:mm'
  description?: string
}): Promise<string | null> {
  try {
    const startDate = event.time
      ? `${event.date}T${event.time}:00`
      : event.date

    const endDate = event.time
      ? `${event.date}T${event.time.split(':')[0]}:${(parseInt(event.time.split(':')[1]) + 30) % 60}:00`
      : event.date

    const body = event.time
      ? { start: { dateTime: startDate, timeZone: 'Asia/Dhaka' }, end: { dateTime: endDate, timeZone: 'Asia/Dhaka' } }
      : { start: { date: event.date }, end: { date: event.date } }

    const resp = await (window as any).gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: {
        summary: event.title,
        description: event.description || 'Added by Memory Mate',
        ...body,
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
      },
    })
    return resp.result.id
  } catch {
    return null
  }
}

// â”€â”€ List upcoming events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function listCalendarEvents(maxResults = 10): Promise<CalendarEvent[]> {
  try {
    const resp = await (window as any).gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    })
    return (resp.result.items || []).map((e: any) => ({
      id: e.id,
      title: e.summary,
      date: e.start?.date || e.start?.dateTime?.slice(0, 10),
      time: e.start?.dateTime?.slice(11, 16),
    }))
  } catch {
    return []
  }
}

// â”€â”€ Delete calendar event â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  await (window as any).gapi.client.calendar.events.delete({ calendarId: 'primary', eventId })
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  time?: string
}

// Build a Google Calendar event URL â€” no OAuth or API key required.
// Opens Google Calendar in a new tab with the event pre-filled.
export function buildCalendarUrl(event: {
  title: string
  date: string       // 'YYYY-MM-DD'
  time?: string      // e.g. '9:00 AM' or '09:00'
  description?: string
}): string {
  const dateStr = event.date.replace(/-/g, '')
  let start: string
  let end: string

  if (event.time) {
    const t = event.time.trim()
    let hours = 0, minutes = 0
    const match = t.match(/(\d+):(\d+)\s*(AM|PM)?/i)
    if (match) {
      hours = parseInt(match[1])
      minutes = parseInt(match[2])
      const ampm = match[3]?.toUpperCase()
      if (ampm === 'PM' && hours !== 12) hours += 12
      if (ampm === 'AM' && hours === 12) hours = 0
    }
    const hh = String(hours).padStart(2, '0')
    const mm = String(minutes).padStart(2, '0')
    const endH = String((hours + 1) % 24).padStart(2, '0')
    start = `${dateStr}T${hh}${mm}00`
    end = `${dateStr}T${endH}${mm}00`
  } else {
    // All-day: end is next day
    const d = new Date(event.date)
    d.setDate(d.getDate() + 1)
    const nd = d.toISOString().slice(0, 10).replace(/-/g, '')
    start = dateStr
    end = nd
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description || 'Added by Memory Mate',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

