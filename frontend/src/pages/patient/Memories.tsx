import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { fsListenRecordings, fsDeleteRecording, fsDeleteTranscriptByRecording, fsSeedDemoRecording } from '@/lib/firebase'
import { Recording } from '@/types'
import { format } from 'date-fns'

const SPEAKER_PALETTE = [
  { bg: '#FCE9D5', fg: '#9C5A12', ring: '#E89B4A' },
  { bg: '#D9E8E7', fg: '#0E4145', ring: '#1E6E72' },
  { bg: '#E5DCEF', fg: '#4C2E76', ring: '#7A5AE0' },
  { bg: '#D6E3F4', fg: '#1E4A87', ring: '#3771C8' },
  { bg: '#DCEAD3', fg: '#2E5D2C', ring: '#3F8A5C' },
]

const EMOTIONS: Record<string, { l: string; icon: string; bg: string; fg: string }> = {
  Warm:    { l: 'Warm',    icon: '◐', bg: '#FCE9D5', fg: '#9C5A12' },
  warm:    { l: 'Warm',    icon: '◐', bg: '#FCE9D5', fg: '#9C5A12' },
  Calm:    { l: 'Calm',    icon: '○', bg: '#D9E8E7', fg: '#0E4145' },
  calm:    { l: 'Calm',    icon: '○', bg: '#D9E8E7', fg: '#0E4145' },
  Worried: { l: 'Worried', icon: '◑', bg: '#F4E2BF', fg: '#7A4A0F' },
  worried: { l: 'Worried', icon: '◑', bg: '#F4E2BF', fg: '#7A4A0F' },
  Joyful:  { l: 'Joyful',  icon: '◉', bg: '#DCEAD3', fg: '#2E5D2C' },
  joyful:  { l: 'Joyful',  icon: '◉', bg: '#DCEAD3', fg: '#2E5D2C' },
  Tired:   { l: 'Tired',   icon: '◍', bg: '#E5E1DA', fg: '#534F66' },
  tired:   { l: 'Tired',   icon: '◍', bg: '#E5E1DA', fg: '#534F66' },
  Low:     { l: 'Low',     icon: '◑', bg: '#F4E2BF', fg: '#7A4A0F' },
  Happy:   { l: 'Happy',   icon: '◉', bg: '#DCEAD3', fg: '#2E5D2C' },
  Sad:     { l: 'Sad',     icon: '◍', bg: '#E5E1DA', fg: '#534F66' },
  Neutral: { l: 'Neutral', icon: '○', bg: '#E5E5E5', fg: '#6B7280' },
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatFileSize(bytes: number) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatRecDate(rec: any): string {
  try {
    const d = rec.createdAt?.toDate?.() ?? (rec.created_at ? new Date(rec.created_at) : null)
    if (!d) return ''
    return format(d, 'EEE d MMM, h:mm a')
  } catch { return '' }
}

export default function Memories() {
  const { profile, loading: authLoading } = useAuth()
  const { tr } = useLang()
  const navigate = useNavigate()
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Recording | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // If auth is still initializing, wait
    if (authLoading) return

    // Auth done but no profile — show empty state
    if (!profile?.id) {
      setLoading(false)
      return
    }

    // Safety timeout: never stay stuck on loading
    timeoutRef.current = setTimeout(() => setLoading(false), 8000)

    const unsub = fsListenRecordings(
      profile.id,
      recs => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setRecordings(recs as unknown as Recording[])
        setLoading(false)
      },
      () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setLoading(false)
      }
    )
    return () => {
      unsub()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [profile?.id, authLoading])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fsDeleteRecording(deleteTarget.id)
      await fsDeleteTranscriptByRecording(deleteTarget.id)
      setRecordings(prev => prev.filter(r => r.id !== deleteTarget.id))
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  async function handleSeedDemo() {
    if (!profile?.id) return
    setSeeding(true)
    try {
      await fsSeedDemoRecording(profile.id)
    } catch (err) {
      console.error('Seed failed:', err)
      setSeeding(false)
    }
  }

  if (loading) {
    return (
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="waveform-bar" style={{ height: 32, animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-ink-mute)' }}>{tr('Loading memories...', 'স্মৃতি লোড হচ্ছে...')}</p>
      </div>
    )
  }

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ padding: '8px 20px 12px' }}>
        <div style={{ fontSize: 13, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1.5 }}>
          {tr('RECORDINGS', 'রেকর্ডিং')}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800,
          margin: '4px 0 0', color: 'var(--color-ink)', letterSpacing: -0.5,
        }}>
          {tr('Conversations', 'কথাবার্তা')}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', marginTop: 4 }}>
          {recordings.length} {tr('conversations · AI processed', 'কথোপকথন · AI প্রক্রিয়াকৃত')}
        </p>
      </div>

      {/* Gradient record CTA */}
      <div style={{ padding: '0 20px 16px' }}>
        <div
          onClick={() => navigate('/patient/record')}
          style={{
            background: 'linear-gradient(135deg, var(--color-accent), #0E4145)',
            borderRadius: 20, padding: 18, color: '#fff',
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: 26,
            background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
              {tr('Start a new recording', 'নতুন রেকর্ডিং শুরু করুন')}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
              {tr('AI will transcribe & summarize', 'AI ট্রান্সক্রাইব ও সারসংক্ষেপ করবে')}
            </div>
          </div>
          <div style={{ fontSize: 26, opacity: 0.8 }}>›</div>
        </div>
      </div>

      {/* List */}
      {recordings.length === 0 ? (
        <div style={{ padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎙️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 6 }}>
            {tr('No conversations yet', 'এখনও কোনো কথোপকথন নেই')}
          </div>
          <p style={{ color: 'var(--color-ink-soft)', fontSize: 14, marginBottom: 20 }}>
            {tr('Tap above to start your first recording.', 'রেকর্ড করতে উপরে ট্যাপ করুন।')}
          </p>
          <button
            onClick={handleSeedDemo}
            disabled={seeding}
            style={{
              background: 'var(--color-surface)', border: '1.5px dashed var(--color-border)',
              borderRadius: 14, padding: '12px 20px', cursor: 'pointer',
              color: 'var(--color-accent)', fontWeight: 700, fontSize: 14,
              fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            {seeding ? (
              <span style={{ width: 16, height: 16, borderRadius: 8, border: '2px solid var(--color-accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
            ) : '✨'}
            {tr('Try a demo conversation', 'ডেমো কথোপকথন দেখুন')}
          </button>
        </div>
      ) : (
        <div style={{ padding: '0 20px' }}>
          {recordings.map((rec) => {
            const recAny = rec as any
            const speakers = rec.speakers || []
            const emotion = EMOTIONS[rec.mood || '']
            const dateStr = formatRecDate(recAny)
            const meta = [
              dateStr,
              rec.duration ? formatDuration(rec.duration) : '',
              rec.file_size ? formatFileSize(rec.file_size) : '',
            ].filter(Boolean).join(' · ')

            return (
              <div
                key={rec.id}
                onClick={() => navigate(`/transcript/${rec.id}`)}
                style={{
                  background: 'var(--color-surface)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 18, padding: 16, marginBottom: 12,
                  cursor: 'pointer', position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Document corner */}
                <div style={{
                  position: 'absolute', top: 0, right: 0, width: 0, height: 0,
                  borderTop: '28px solid var(--color-bg-warm)',
                  borderLeft: '28px solid transparent',
                }} />

                {/* Remove button */}
                <button
                  onClick={e => { e.stopPropagation(); setDeleteTarget(rec) }}
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 26, height: 26, borderRadius: 13,
                    background: 'var(--color-danger-soft)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-danger)', fontSize: 14, fontWeight: 800,
                    lineHeight: 1, zIndex: 2,
                  }}
                  title={tr('Remove', 'মুছুন')}
                >
                  ×
                </button>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* Document icon */}
                  <div style={{
                    width: 48, height: 56, flexShrink: 0,
                    background: 'var(--color-bg-warm)',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: 6, position: 'relative',
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                    padding: 5, gap: 3,
                  }}>
                    <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, color: 'var(--color-accent)', fontWeight: 800, letterSpacing: 0.5 }}>TXT</div>
                    <div style={{ height: 2, background: 'var(--color-border)', width: '100%', borderRadius: 1 }} />
                    <div style={{ height: 2, background: 'var(--color-border)', width: '80%', borderRadius: 1 }} />
                    <div style={{ height: 2, background: 'var(--color-border)', width: '90%', borderRadius: 1 }} />
                    <div style={{ height: 2, background: 'var(--color-accent)', width: '60%', borderRadius: 1 }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.25 }}>
                      {rec.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-ink-soft)', marginTop: 4 }}>{meta}</div>

                    {/* Speaker chips */}
                    {speakers.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {speakers.map((sp, idx) => {
                          const c = SPEAKER_PALETTE[idx % SPEAKER_PALETTE.length]
                          return (
                            <div key={sp.id || sp.name} style={{
                              background: c.bg, color: c.fg,
                              padding: '3px 10px 3px 4px', borderRadius: 12,
                              fontSize: 12, fontWeight: 700,
                              display: 'flex', alignItems: 'center', gap: 5,
                            }}>
                              <div style={{
                                width: 18, height: 18, borderRadius: 9,
                                background: c.ring, color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 800,
                              }}>
                                {(sp.name || '?')[0]}
                              </div>
                              {sp.name}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Summary */}
                    {rec.summary && (
                      <p style={{
                        fontSize: 14, color: 'var(--color-ink)', lineHeight: 1.5,
                        marginTop: 10, marginBottom: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      } as React.CSSProperties}>
                        {rec.summary}
                      </p>
                    )}

                    {/* Bottom badges */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      {emotion && (
                        <div style={{
                          fontSize: 11, fontWeight: 700,
                          background: emotion.bg, color: emotion.fg,
                          padding: '3px 9px', borderRadius: 10,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          {emotion.icon} {emotion.l}
                        </div>
                      )}
                      {recAny.plan_count != null && recAny.plan_count > 0 && (
                        <div style={{
                          fontSize: 11, fontWeight: 700,
                          background: 'var(--color-accent-soft)', color: '#0E4145',
                          padding: '3px 9px', borderRadius: 10,
                        }}>
                          📅 {recAny.plan_count} {tr('plan', 'পরিকল্পনা')}
                        </div>
                      )}
                      {recAny.flag_count != null && recAny.flag_count > 0 && (
                        <div style={{
                          fontSize: 11, fontWeight: 700,
                          background: 'var(--color-danger-soft)', color: 'var(--color-danger)',
                          padding: '3px 9px', borderRadius: 10,
                        }}>
                          ⚠ {recAny.flag_count} {tr('flag', 'সতর্কতা')}
                        </div>
                      )}
                      {recAny.is_demo && (
                        <div style={{
                          fontSize: 11, fontWeight: 700,
                          background: '#E5DCEF', color: '#4C2E76',
                          padding: '3px 9px', borderRadius: 10,
                        }}>
                          ✨ Demo
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirm sheet */}
      {deleteTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            style={{ width: '100%', background: 'var(--color-bg)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 56, height: 56, margin: '0 auto 12px', borderRadius: 28, background: 'var(--color-danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
              🗑️
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 4px' }}>
              {tr('Remove this recording?', 'এই রেকর্ডিং মুছবেন?')}
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: '0 0 20px', fontWeight: 600 }}>
              {deleteTarget.title}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-ink-mute)', margin: '0 0 20px' }}>
              {tr('This cannot be undone.', 'এটি পূর্বাবস্থায় ফেরানো যাবে না।')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{
                  background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                  padding: '14px 0', borderRadius: 14, cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--color-ink)',
                }}
              >
                {tr('Cancel', 'বাতিল')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: 'var(--color-danger)', color: '#fff', border: 'none',
                  padding: '14px 0', borderRadius: 14, cursor: deleting ? 'default' : 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {deleting
                  ? <span style={{ width: 20, height: 20, borderRadius: 10, border: '2.5px solid #fff', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  : tr('Remove', 'মুছুন')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
