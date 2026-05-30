import { initializeApp, getApps } from 'firebase/app'
import { getAnalytics, logEvent } from 'firebase/analytics'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth'
import { getDatabase, ref, set, onValue, push, update, serverTimestamp, get } from 'firebase/database'
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs,
  addDoc, updateDoc, deleteDoc, onSnapshot, query, where,
  orderBy, limit, Timestamp, serverTimestamp as fsServerTimestamp,
} from 'firebase/firestore'
import {
  getStorage, ref as storageRef, uploadBytesResumable,
  getDownloadURL, deleteObject,
} from 'firebase/storage'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

// ── Init ──────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// ── Auth ─────────────────────────────────────────────────────
export const auth = getAuth(app)
export {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fbSignOut,
  onAuthStateChanged,
}
export type { FirebaseUser }

export const analytics = typeof window !== 'undefined'
  ? (() => { try { return getAnalytics(app) } catch { return null } })()
  : null
export const rtdb      = getDatabase(app)
export const db        = getFirestore(app)
export const storage   = getStorage(app)

// Messaging requires a service worker + HTTPS — guard against local dev failures
export const messaging = typeof window !== 'undefined'
  ? (() => { try { return getMessaging(app) } catch { return null } })()
  : null

// ── Analytics helper ─────────────────────────────────────────
export function logAppEvent(eventName: string, params?: Record<string, unknown>) {
  if (analytics) logEvent(analytics, eventName, params)
}

// ══════════════════════════════════════════════════════════════
// FIRESTORE — collections: profiles, recordings, plans, reminders, alerts
// ══════════════════════════════════════════════════════════════

// ── Profiles ─────────────────────────────────────────────────
export async function fsSetProfile(userId: string, data: Record<string, unknown>) {
  return setDoc(doc(db, 'profiles', userId), { ...data, updatedAt: fsServerTimestamp() }, { merge: true })
}

export async function fsGetProfile(userId: string) {
  const snap = await getDoc(doc(db, 'profiles', userId))
  return snap.exists() ? snap.data() : null
}

// ── Plans ─────────────────────────────────────────────────────
export async function fsAddPlan(patientId: string, plan: Record<string, unknown>) {
  return addDoc(collection(db, 'plans'), { ...plan, patientId, createdAt: fsServerTimestamp() })
}

export async function fsUpdatePlan(planId: string, data: Record<string, unknown>) {
  return updateDoc(doc(db, 'plans', planId), data)
}

export async function fsDeletePlan(planId: string) {
  return deleteDoc(doc(db, 'plans', planId))
}

export function fsListenPlans(
  patientId: string,
  dateStr: string,
  callback: (plans: Array<{ id: string; [k: string]: unknown }>) => void
) {
  if (!patientId || !dateStr) return () => {}
  const q = query(
    collection(db, 'plans'),
    where('patientId', '==', patientId),
    where('date', '==', dateStr),
  )
  return onSnapshot(
    q,
    snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (((a as Record<string, unknown>).time as string) || '').localeCompare(((b as Record<string, unknown>).time as string) || ''))
      callback(docs)
    },
    err => console.warn('fsListenPlans error:', err.message)
  )
}

// ── Recordings ────────────────────────────────────────────────
export function fsListenRecordings(
  patientId: string,
  callback: (recs: Array<{ id: string; [k: string]: unknown }>) => void,
  onError?: (err: Error) => void
) {
  if (!patientId) { callback([]); return () => {} }
  // No orderBy to avoid requiring a composite index — sort in JS after fetch
  const q = query(
    collection(db, 'recordings'),
    where('patientId', '==', patientId),
    limit(50)
  )
  return onSnapshot(
    q,
    snap => {
      const recs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => {
          const ta = a.createdAt?.toMillis?.() ?? (a.created_at ? new Date(a.created_at).getTime() : 0)
          const tb = b.createdAt?.toMillis?.() ?? (b.created_at ? new Date(b.created_at).getTime() : 0)
          return tb - ta
        })
      callback(recs)
    },
    err => {
      console.warn('fsListenRecordings error:', err.message)
      onError?.(err)
    }
  )
}

export async function fsAddRecording(data: Record<string, unknown>) {
  return addDoc(collection(db, 'recordings'), { ...data, createdAt: fsServerTimestamp() })
}

export async function fsUpdateRecording(id: string, data: Record<string, unknown>) {
  return updateDoc(doc(db, 'recordings', id), data)
}

export async function fsAddTranscript(data: Record<string, unknown>) {
  return addDoc(collection(db, 'transcripts'), { ...data, createdAt: fsServerTimestamp() })
}

// ── Reminders ────────────────────────────────────────────────
export function fsListenReminders(
  caregiverId: string,
  callback: (r: Array<{ id: string; [k: string]: unknown }>) => void
) {
  if (!caregiverId) return () => {}
  const q = query(
    collection(db, 'reminders'),
    where('caregiverId', '==', caregiverId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.warn('fsListenReminders error:', err.message)
  )
}

export async function fsAddReminder(data: Record<string, unknown>) {
  return addDoc(collection(db, 'reminders'), { ...data, createdAt: fsServerTimestamp() })
}

export async function fsDeleteReminder(id: string) {
  return deleteDoc(doc(db, 'reminders', id))
}

// ── Unique caregiver code generator ──────────────────────────
export async function fsGenerateUniqueCode(): Promise<string> {
  // Keep trying random 6-digit numbers until we find one not already in use
  for (;;) {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const snap = await getDocs(query(
      collection(db, 'profiles'),
      where('caregiver_code', '==', code)
    ))
    if (snap.empty) return code
  }
}

// ── Delete recording ─────────────────────────────────────────
export async function fsDeleteRecording(id: string) {
  return deleteDoc(doc(db, 'recordings', id))
}

export async function fsDeleteTranscriptByRecording(recordingId: string) {
  const q = query(collection(db, 'transcripts'), where('recording_id', '==', recordingId))
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
}

// ── Demo recording seeder ─────────────────────────────────────
export async function fsSeedDemoRecording(patientId: string): Promise<string> {
  const recRef = await addDoc(collection(db, 'recordings'), {
    patientId,
    title: 'ভাই-ভাই আলাপ',
    duration: 245,
    file_size: 2890000,
    mood: 'Joyful',
    summary: 'আনিক এবং আবির পারিবারিক স্মৃতি ও ভবিষ্যৎ পরিকল্পনা নিয়ে কথা বলেছেন। দুজনেই অনেক হেসেছেন এবং মায়ের স্বাস্থ্য নিয়ে আলোচনা করেছেন। শুক্রবার ডাক্তারের কাছে যাওয়ার পরিকল্পনা করেছেন।',
    speakers: [
      { id: 'sp1', name: 'Anik', color: '#3771C8', turn_count: 8 },
      { id: 'sp2', name: 'Abir', color: '#1E6E72', turn_count: 7 },
    ],
    plan_count: 1,
    flag_count: 0,
    is_demo: true,
    createdAt: fsServerTimestamp(),
  })

  await addDoc(collection(db, 'transcripts'), {
    recording_id: recRef.id,
    summary: 'আনিক এবং আবির পারিবারিক স্মৃতি ও ভবিষ্যৎ পরিকল্পনা নিয়ে কথা বলেছেন। দুজনেই অনেক হেসেছেন এবং মায়ের স্বাস্থ্য নিয়ে আলোচনা করেছেন।',
    detected_plans: [
      { text: 'শুক্রবার মাকে ডাক্তারের কাছে নিয়ে যাওয়া', type: 'appointment', date: '2026-06-06' },
    ],
    emotions: [
      { label: 'Joyful', value: 60, color: '#3F8A5C' },
      { label: 'Warm',   value: 25, color: '#E89B4A' },
      { label: 'Calm',   value: 10, color: '#1E6E72' },
      { label: 'Worried', value: 5, color: '#7A4A0F' },
    ],
    turns: [
      { id: 't1',  speaker_id: 'sp1', speaker_name: 'Anik', text: 'আবির ভাই, কেমন আছো? অনেকদিন দেখি নি।', timestamp: 0,   emotion: 'Warm' },
      { id: 't2',  speaker_id: 'sp2', speaker_name: 'Abir', text: 'আলহামদুলিল্লাহ, ভালো আছি। তুমি কেমন আছো আনিক?', timestamp: 12, emotion: 'Warm' },
      { id: 't3',  speaker_id: 'sp1', speaker_name: 'Anik', text: 'আমিও ভালো। আম্মু কেমন আছেন? গতকাল ফোন করেছিলাম, ধরেননি।', timestamp: 20, emotion: 'Worried' },
      { id: 't4',  speaker_id: 'sp2', speaker_name: 'Abir', text: 'হ্যাঁ, আম্মু একটু অসুস্থ ছিলেন। সর্দি-কাশি। এখন একটু ভালো।', timestamp: 32, emotion: 'Calm' },
      { id: 't5',  speaker_id: 'sp1', speaker_name: 'Anik', text: 'আচ্ছা, শুক্রবার কি ডাক্তারের কাছে নিয়ে যাবে? আমিও যাবো।', timestamp: 44, emotion: 'Calm' },
      { id: 't6',  speaker_id: 'sp2', speaker_name: 'Abir', text: 'হ্যাঁ, শুক্রবার নিয়ে যাওয়ার প্ল্যান আছে। তুমি আসলে ভালো হয়।', timestamp: 58, emotion: 'Joyful' },
      { id: 't7',  speaker_id: 'sp1', speaker_name: 'Anik', text: 'ঠিক আছে। আচ্ছা, ছোটবেলার কথা মনে আছে? যখন আমরা ছাদে ঘুড়ি উড়াতাম?', timestamp: 70, emotion: 'Joyful' },
      { id: 't8',  speaker_id: 'sp2', speaker_name: 'Abir', text: 'হা হা! অবশ্যই মনে আছে। একবার তোমার ঘুড়ি আটকে গিয়েছিল গাছে!', timestamp: 84, emotion: 'Joyful' },
      { id: 't9',  speaker_id: 'sp1', speaker_name: 'Anik', text: 'হ্যাঁ, সেদিন আম্মু কত রাগ করেছিলেন! বলেছিলেন পড়াশোনা বাদ দিয়ে ঘুড়ি উড়াচ্ছি।', timestamp: 98, emotion: 'Joyful' },
      { id: 't10', speaker_id: 'sp2', speaker_name: 'Abir', text: 'আম্মু সেই একই! এখনো বলেন ঠিকমতো খাচ্ছি কিনা।', timestamp: 114, emotion: 'Joyful' },
      { id: 't11', speaker_id: 'sp1', speaker_name: 'Anik', text: 'মায়েরা সব সময় এমনই হন। ভাই, তুমি কি কাল বাড়ি আসবে?', timestamp: 128, emotion: 'Warm' },
      { id: 't12', speaker_id: 'sp2', speaker_name: 'Abir', text: 'না রে, কালকে অফিসে মিটিং আছে। পরশু আসবো ইনশাআল্লাহ।', timestamp: 140, emotion: 'Calm' },
      { id: 't13', speaker_id: 'sp1', speaker_name: 'Anik', text: 'ঠিক আছে। পরশু একসাথে আম্মুর জন্য রান্না করবো। ভালো লাগবে।', timestamp: 154, emotion: 'Warm' },
      { id: 't14', speaker_id: 'sp2', speaker_name: 'Abir', text: 'দারুণ আইডিয়া! আম্মু খুব খুশি হবেন। আমি খিচুড়ি বানাবো।', timestamp: 168, emotion: 'Joyful' },
      { id: 't15', speaker_id: 'sp1', speaker_name: 'Anik', text: 'আর আমি মাছের ঝোল রান্না করবো। আম্মুর পছন্দের।', timestamp: 182, emotion: 'Joyful' },
    ],
  })

  return recRef.id
}

// ── Caregiver ↔ Patient connection ───────────────────────────
export async function fsConnectPatientByCode(
  caregiverId: string,
  code: string
): Promise<{ success: true; patientName: string } | { success: false; error: string }> {
  const trimmed = code.replace(/\s/g, '')
  if (!trimmed || trimmed.length !== 6) return { success: false, error: 'Enter the full 6-digit code' }

  const q = query(
    collection(db, 'profiles'),
    where('caregiver_code', '==', trimmed),
    where('role', '==', 'patient')
  )
  const snap = await getDocs(q)
  if (snap.empty) return { success: false, error: 'No patient found with that code' }

  const patientDoc = snap.docs[0]
  const patientId = patientDoc.id

  // Check not already linked
  const linkQ = query(
    collection(db, 'caregiver_patients'),
    where('caregiver_id', '==', caregiverId),
    where('patient_id', '==', patientId)
  )
  const existing = await getDocs(linkQ)
  if (!existing.empty) return { success: false, error: 'Already connected to this patient' }

  await addDoc(collection(db, 'caregiver_patients'), {
    caregiver_id: caregiverId,
    patient_id:   patientId,
    status:       'active',
    linked_at:    fsServerTimestamp(),
  })

  return { success: true, patientName: patientDoc.data().name || 'Patient' }
}

// ── Activity feed ─────────────────────────────────────────────
export function fsListenActivityFeed(
  patientId: string,
  callback: (items: Array<{ id: string; [k: string]: unknown }>) => void
) {
  if (!patientId) return () => {}
  const q = query(
    collection(db, 'activity'),
    where('patientId', '==', patientId),
    orderBy('createdAt', 'desc'),
    limit(20)
  )
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.warn('fsListenActivityFeed error:', err.message)
  )
}

export async function fsLogActivity(patientId: string, text: string, tone = 'accent') {
  return addDoc(collection(db, 'activity'), {
    patientId, text, tone, createdAt: fsServerTimestamp(),
  })
}

// ══════════════════════════════════════════════════════════════
// FIREBASE STORAGE — audio recordings
// ══════════════════════════════════════════════════════════════

export function uploadRecording(
  patientId: string,
  blob: Blob,
  fileName: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileRef = storageRef(storage, `recordings/${patientId}/${fileName}`)
    const task = uploadBytesResumable(fileRef, blob, { contentType: blob.type || 'audio/webm' })
    task.on(
      'state_changed',
      snap => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => { resolve(await getDownloadURL(task.snapshot.ref)) }
    )
  })
}

export async function deleteRecordingFile(patientId: string, fileName: string) {
  return deleteObject(storageRef(storage, `recordings/${patientId}/${fileName}`))
}

export function uploadProfilePhoto(
  uid: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop() || 'jpg'
    const fileRef = storageRef(storage, `profiles/${uid}/avatar.${ext}`)
    const task = uploadBytesResumable(fileRef, file, { contentType: file.type || 'image/jpeg' })
    task.on(
      'state_changed',
      snap => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => { resolve(await getDownloadURL(task.snapshot.ref)) }
    )
  })
}

// ══════════════════════════════════════════════════════════════
// FIREBASE REALTIME DB — live location + emergency alerts
// ══════════════════════════════════════════════════════════════

export function pushLocation(patientId: string, lat: number, lng: number, label?: string, accuracy?: number) {
  return set(ref(rtdb, `locations/${patientId}/current`), {
    lat, lng, label: label ?? null, accuracy: accuracy ?? null, ts: serverTimestamp(),
  })
}

export function listenLocation(
  patientId: string,
  callback: (data: { lat: number; lng: number; label?: string; accuracy?: number; ts: number } | null) => void
) {
  const locRef = ref(rtdb, `locations/${patientId}/current`)
  return onValue(locRef, snap => callback(snap.val()))
}

export function sendEmergencyAlert(patientId: string, patientName: string) {
  return push(ref(rtdb, `alerts/${patientId}`), {
    type: 'emergency', patientId, patientName,
    ts: serverTimestamp(), resolved: false,
  })
}

export function listenAlerts(
  patientId: string,
  callback: (alerts: unknown[]) => void
) {
  const alertRef = ref(rtdb, `alerts/${patientId}`)
  return onValue(alertRef, snap => {
    const val = snap.val()
    callback(val ? Object.values(val) : [])
  })
}

export async function resolveAllAlerts(patientId: string) {
  const alertRef = ref(rtdb, `alerts/${patientId}`)
  const snap = await get(alertRef)
  const val = snap.val()
  if (!val) return
  const updates: Record<string, boolean> = {}
  Object.keys(val).forEach(key => { updates[`${key}/resolved`] = true })
  return update(alertRef, updates)
}

// ══════════════════════════════════════════════════════════════
// FCM — push notifications
// ══════════════════════════════════════════════════════════════

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

export async function requestNotificationPermission(): Promise<string | null> {
  if (!messaging) return null
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null
    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    return token
  } catch {
    return null
  }
}

export function onForegroundMessage(callback: (payload: unknown) => void) {
  if (!messaging) return () => {}
  return onMessage(messaging, callback)
}
