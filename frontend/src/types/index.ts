export type UserRole = 'patient' | 'caregiver'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  phone?: string
  avatar_url?: string
  age?: number
  language?: 'en' | 'bn'
  caregiver_code?: string
  created_at: string
}

export interface Recording {
  id: string
  patient_id: string
  title: string
  duration: number
  file_size: number
  file_url: string
  transcript?: Transcript
  mood?: MoodType
  created_at: string
  speakers?: Speaker[]
  summary?: string
  plan_count?: number
  flag_count?: number
  call_sid?: string
}

export interface Transcript {
  id: string
  recording_id: string
  turns: TranscriptTurn[]
  summary: string
  detected_plans: DetectedPlan[]
  emotions: EmotionEntry[]
}

export interface TranscriptTurn {
  id: string
  speaker_id: string
  speaker_name: string
  text: string
  timestamp: number
  emotion?: string
}

export interface Speaker {
  id: string
  name: string
  color: string
  turn_count: number
}

export interface DetectedPlan {
  text: string
  type: PlanType
  date?: string
  time?: string
}

export interface EmotionEntry {
  label: string
  value: number
  color: string
}

export type MoodType = 'Warm' | 'Calm' | 'Worried' | 'Joyful' | 'Tired' | 'Low'

export type PlanType = 'medicine' | 'visit' | 'call' | 'task' | 'appointment'

export interface Plan {
  id: string
  patient_id: string
  title: string
  type: PlanType
  date: string
  time?: string
  is_recurring: boolean
  recurrence?: string
  is_done: boolean
  created_at: string
}

export interface Reminder {
  id: string
  caregiver_id: string
  patient_id: string
  title: string
  type: PlanType
  time: string
  date: string
  is_recurring: boolean
  recurrence?: string
  notify_push: boolean
  notify_voice: boolean
  notify_sms: boolean
  created_at: string
}

export interface CaregiverPatient {
  caregiver_id: string
  patient_id: string
  patient: User
  linked_at: string
  status: 'active' | 'pending'
}

export interface PatientCaregiver {
  caregiver_id: string
  patient_id: string
  caregiver: User
  linked_at: string
  status: 'active' | 'pending'
  is_online?: boolean
}

export interface LocationEntry {
  id: string
  patient_id: string
  lat: number
  lng: number
  label?: string
  recorded_at: string
}

export interface CallSession {
  id: string
  call_sid: string
  from_number: string
  to_number: string
  patient_id: string
  status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed'
  recording_url?: string
  duration?: number
  created_at: string
}

export interface DashboardStats {
  reminders_total: number
  reminders_done: number
  recordings_today: number
  alerts: number
  last_briefing?: string
  location_label?: string
  next_reminder?: string
}
