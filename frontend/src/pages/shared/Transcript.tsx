import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, fsAddPlan } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { Recording, Transcript as TranscriptType, DetectedPlan } from '@/types'
import { format } from 'date-fns'

const SPEAKER_PALETTE = [
  { bg: '#FCE9D5', fg: '#9C5A12', ring: '#E89B4A' },
  { bg: '#D9E8E7', fg: '#0E4145', ring: '#1E6E72' },
  { bg: '#E5DCEF', fg: '#4C2E76', ring: '#7A5AE0' },
  { bg: '#D6E3F4', fg: '#1E4A87', ring: '#3771C8' },
  { bg: '#DCEAD3', fg: '#2E5D2C', ring: '#3F8A5C' },
]

const EMOTIONS: Record<string, { l: string; icon: string; bg: string; fg: string }> = {
  Warm:    { l: 'Warm',    icon: '●', bg: '#FCE9D5', fg: '#9C5A12' },
  warm:    { l: 'Warm',    icon: '●', bg: '#FCE9D5', fg: '#9C5A12' },
  Calm:    { l: 'Calm',    icon: '○', bg: '#D9E8E7', fg: '#0E4145' },
  calm:    { l: 'Calm',    icon: '○', bg: '#D9E8E7', fg: '#0E4145' },
  Worried: { l: 'Worried', icon: '◑', bg: '#F4E2BF', fg: '#7A4A0F' },
  worried: { l: 'Worried', icon: '◑', bg: '#F4E2BF', fg: '#7A4A0F' },
  Joyful:  { l: 'Joyful',  icon: '◉', bg: '#DCEAD3', fg: '#2E5D2C' },
  joyful:  { l: 'Joyful',  icon: '◉', bg: '#DCEAD3', fg: '#2E5D2C' },
  Tired:   { l: 'Tired',   icon: '●', bg: '#E5E1DA', fg: '#534F66' },
  tired:   { l: 'Tired',   icon: '●', bg: '#E5E1DA', fg: '#534F66' },
  Happy:   { l: 'Happy',   icon: '◉', bg: '#DCEAD3', fg: '#2E5D2C' },
  Low:     { l: 'Low',     icon: '◑', bg: '#F4E2BF', fg: '#7A4A0F' },
  Sad:     { l: 'Sad',     icon: '●', bg: '#E5E1DA', fg: '#534F66' },
  Neutral: { l: 'Neutral', icon: '○', bg: '#E5E5E5', fg: '#6B7280' },
}

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtDuration(secs: number) {
  if (!secs) return '–'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtSize(bytes: number) {
  if (!bytes) return '–'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(rec: any): string {
  try {
    const d = rec.createdAt?.toDate?.() ?? (rec.created_at ? new Date(rec.created_at) : null)
    return d ? format(d, 'EEE d MMM, h:mm a') : ''
  } catch { return '' }
}

export default function Transcript() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tr } = useLang()
  const { profile } = useAuth()
  const [recording, setRecording] = useState<Recording | null>(null)
  const [transcript, setTranscript] = useState<TranscriptType | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingPlan, setAddingPlan] = useState<DetectedPlan | null>(null)
  const [addedPlans, setAddedPlans] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!id) return
    async function load() {
      const recSnap = await getDoc(doc(db, 'recordings', id!))
      setRecording(recSnap.exists() ? { id: recSnap.id, ...recSnap.data() } as unknown as Recording : null)
      const trSnap = await getDocs(query(
        collection(db, 'transcripts'),
        where('recording_id', '==', id)
      ))
      setTranscript(trSnap.empty ? null : { id: trSnap.docs[0].id, ...trSnap.docs[0].data() } as unknown as TranscriptType)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: 12 }}>
        <span style={{
          width: 32, height: 32, display: 'block',
          border: '2px solid var(--color-accent)', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: 14, color: 'var(--color-ink-mute)' }}>{tr('Loading transcript...', 'ট্রান্সক্রিপ্ট লোড হচ্ছে...')}</p>
      </div>
    )
  }

  if (!recording) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: 16 }}>
        <p style={{ color: 'var(--color-ink-mute)' }}>{tr('Recording not found', 'রেকর্ডিং পাওয়া যায়নি')}</p>
        <button onClick={() => navigate(-1)} style={{
          background: 'transparent', border: '1.5px solid var(--color-accent)', color: 'var(--color-accent)',
          borderRadius: 14, padding: '10px 24px', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>
          {tr('Go back', 'ফিরে যান')}
        </button>
      </div>
    )
  }

  const recAny = recording as any
  const speakers = recording.speakers || []
  const turns = transcript?.turns || []
  const detectedPlans = transcript?.detected_plans || []

  const speakerColorMap: Record<string, typeof SPEAKER_PALETTE[0]> = {}
  speakers.forEach((sp, idx) => {
    speakerColorMap[sp.name] = SPEAKER_PALETTE[idx % SPEAKER_PALETTE.length]
  })

  const handleAddPlan = async (plan: DetectedPlan) => {
    const patientId = (recAny.patientId || recAny.patient_id || profile?.id) as string
    if (!patientId) return
    setAddingPlan(null)
    setAddedPlans(prev => new Set([...prev, plan.text]))
    await fsAddPlan(patientId, {
      title: plan.text,
      type: plan.type || 'task',
      date: plan.date || new Date().toISOString().split('T')[0],
      time: plan.time || '',
      is_done: false,
      is_recurring: false,
    })
  }

  function handleExportPDF() {
    const rec = recording!
    const dateStr = fmtDate(recAny)
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${rec.title}</title>
<style>
  body{font-family:sans-serif;max-width:720px;margin:40px auto;color:#111;line-height:1.6}
  h1{font-size:22px;margin-bottom:4px}
  .meta{font-size:13px;color:#666;margin-bottom:24px}
  .section-label{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#888;font-weight:700;margin:20px 0 8px}
  .speaker-chip{display:inline-block;background:#e5e7eb;border-radius:20px;padding:4px 12px;margin:0 6px 6px 0;font-size:13px}
  .turn{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f0f0f0}
  .avatar{width:32px;height:32px;border-radius:50%;background:#1E6E72;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;padding-top:6px;text-align:center}
  .turn-name{font-weight:700;font-size:13px;color:#0E4145}
  .turn-time{font-size:11px;color:#9ca3af;margin-left:6px}
  .turn-text{font-size:15px;margin-top:2px}
  .summary-box{background:#f0fafa;border-left:4px solid #1E6E72;padding:12px 16px;border-radius:0 8px 8px 0;margin:8px 0}
  .plan-row{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:6px}
  @media print{body{margin:20px}}
</style></head><body>
<h1>${rec.title}</h1>
<div class="meta">${dateStr} &nbsp;·&nbsp; ${fmtDuration(rec.duration)} &nbsp;·&nbsp; ${fmtSize(rec.file_size)}</div>
${speakers.length ? `<div class="section-label">Speakers</div>${speakers.map(s => `<span class="speaker-chip">${s.name}</span>`).join('')}` : ''}
${transcript?.summary ? `<div class="section-label">Summary</div><div class="summary-box">${transcript.summary}</div>` : ''}
${turns.length ? `<div class="section-label">Transcript</div>${turns.map(t => `<div class="turn"><div class="avatar">${(t.speaker_name||'?')[0]}</div><div><div><span class="turn-name">${t.speaker_name}</span><span class="turn-time">${fmtTime(t.timestamp)}</span></div><div class="turn-text">${t.text}</div></div></div>`).join('')}` : ''}
${detectedPlans.length ? `<div class="section-label">Plans detected</div>${detectedPlans.map(p => `<div class="plan-row"><strong>${p.text}</strong>${p.date ? ` — ${p.date}` : ''}${p.time ? ` ${p.time}` : ''}</div>`).join('')}` : ''}
</body></html>`

    const w = window.open('', '_blank')
    if (!w) { alert('Allow pop-ups to export PDF'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 300)
  }

  function handleAskMemoryMate() {
    const rec = recording!
    const title = rec.title

    // Build an inline memory so the AI has the actual content — no vector search needed
    const inlineMemory = {
      created_at: (recAny.createdAt?.toDate?.() ?? new Date()).toISOString(),
      summary: transcript?.summary || `Conversation titled "${title}"`,
      people_met: (rec.speakers || []).map((s: any) => ({ name: s.name, role: s.role || '' })),
      key_info: transcript?.summary ? [transcript.summary] : [],
      raw_transcript: turns.length
        ? turns.map(t => `${t.speaker_name}: ${t.text}`).join('\n')
        : `(recording: ${title})`,
      _source: 'transcript_page',
    }

    const question = tr(
      `Tell me about my conversation: "${title}"`,
      `আমার "${title}" কথোপকথনটির ব্যাপারে বলো`
    )
    navigate('/patient', { state: { tab: 'chat', initialMessage: question, inlineMemories: [inlineMemory] } })
  }

  return (
    <div className="screen screen-no-tab" style={{ background: 'var(--color-bg)' }}>
      {/* Sticky top bar */}
      <div style={{
        padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
        position: 'sticky', top: 0, background: 'var(--color-bg)', zIndex: 5,
        borderBottom: '1px solid var(--color-border)',
      }}>
        <button onClick={() => navigate(-1)} style={{
          width: 40, height: 40, borderRadius: 20,
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, color: 'var(--color-ink-soft)',
        }}>‹</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
          {tr('Transcript', 'ট্রান্সক্রিপ্ট')}
        </div>
        <button style={{
          width: 40, height: 40, borderRadius: 20,
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 800, color: 'var(--color-ink-soft)',
        }}>⋯</button>
      </div>

      {/* Document header card */}
      <div style={{ padding: '12px 20px 0' }}>
        <div style={{
          background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
          borderRadius: 18, padding: 18, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, right: 0, width: 0, height: 0,
            borderTop: '36px solid var(--color-bg-warm)',
            borderLeft: '36px solid transparent',
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 56, height: 70, flexShrink: 0,
              background: 'var(--color-accent)', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 800, letterSpacing: 1,
            }}>.TXT</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1 }}>CONVERSATION</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, lineHeight: 1.25, color: 'var(--color-ink)', marginTop: 2 }}>
                {recording.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-ink-soft)', marginTop: 4 }}>{fmtDate(recAny)}</div>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
            {[
              { l: 'Duration', v: fmtDuration(recording.duration) },
              { l: 'Speakers', v: speakers.length ? String(speakers.length) : '–' },
              { l: 'File',     v: fmtSize(recording.file_size) },
            ].map(stat => (
              <div key={stat.l} style={{ background: 'var(--color-bg-warm)', borderRadius: 10, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 0.5 }}>
                  {stat.l.toUpperCase()}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', marginTop: 1 }}>
                  {stat.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Voices detected */}
      {speakers.length > 0 && (
        <div style={{ padding: '14px 20px 0' }}>
          <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
            {tr('VOICES DETECTED', 'শনাক্ত কণ্ঠ')}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {speakers.map((sp, idx) => {
              const c = SPEAKER_PALETTE[idx % SPEAKER_PALETTE.length]
              return (
                <div key={sp.id || sp.name} style={{
                  background: c.bg, color: c.fg,
                  padding: '6px 10px 6px 6px', borderRadius: 14,
                  fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 13,
                    background: c.ring, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800,
                  }}>
                    {(sp.name || '?')[0]}
                  </div>
                  <div>
                    <div style={{ lineHeight: 1.1 }}>{sp.name}</div>
                    <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 600 }}>
                      {sp.turn_count} {sp.turn_count === 1 ? 'turn' : 'turns'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Full transcript */}
      <div style={{ padding: '20px 20px 12px' }}>
        <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>
          {tr('FULL TRANSCRIPT', 'সম্পূর্ণ ট্রান্সক্রিপ্ট')}
        </div>
        <div style={{
          background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
          borderRadius: 18, padding: 4, overflow: 'hidden',
        }}>
          {turns.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-ink-mute)', fontSize: 14 }}>
              {tr('Transcript being processed…', 'ট্রান্সক্রিপ্ট প্রক্রিয়া হচ্ছে…')}
            </div>
          ) : (
            turns.map((turn, idx) => {
              const c = speakerColorMap[turn.speaker_name] || SPEAKER_PALETTE[0]
              const e = EMOTIONS[turn.emotion || '']
              return (
                <div key={turn.id || idx} style={{
                  display: 'flex', gap: 10, padding: 14,
                  borderBottom: idx < turns.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 18, flexShrink: 0,
                    background: c.ring, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800,
                  }}>
                    {(turn.speaker_name || '?')[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: c.fg }}>{turn.speaker_name}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtTime(turn.timestamp)}
                      </span>
                      {e && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          background: e.bg, color: e.fg,
                          padding: '2px 7px', borderRadius: 8,
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                        }}>{e.icon} {e.l}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--color-ink)', marginTop: 4, fontWeight: 500 }}>
                      {turn.text}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* AI Insights */}
      <div style={{ padding: '4px 20px 24px' }}>
        <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>
          {tr('AI INSIGHTS', 'AI বিশ্লেষণ')}
        </div>

        {/* Summary */}
        {transcript?.summary && (
          <div style={{
            background: 'var(--color-accent-soft)',
            border: '1.5px solid rgba(30,110,114,0.2)',
            borderRadius: 14, padding: 14,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
              fontSize: 11, color: '#0E4145', fontWeight: 700, letterSpacing: 0.5,
            }}>
              ✦ {tr('SUMMARY', 'সারসংক্ষেপ')}
            </div>
            <div style={{ fontSize: 15, color: 'var(--color-ink)', lineHeight: 1.55 }}>
              {transcript.summary}
            </div>
          </div>
        )}

        {/* Detected plans */}
        {detectedPlans.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {detectedPlans.map((plan, idx) => (
              <div key={idx} style={{
                background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                borderRadius: 14, padding: 12,
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'var(--color-accent-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  fontSize: 18,
                }}>📅</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 700, letterSpacing: 0.5 }}>
                    {tr('PLAN DETECTED', 'পরিকল্পনা শনাক্ত')}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>{plan.text}</div>
                  {(plan.date || plan.time) && (
                    <div style={{ fontSize: 13, color: 'var(--color-ink-soft)', marginTop: 1 }}>
                      {[plan.date, plan.time].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => !addedPlans.has(plan.text) && setAddingPlan(plan)}
                  style={{
                    fontSize: 12, fontWeight: 700, background: 'none', border: 'none',
                    cursor: addedPlans.has(plan.text) ? 'default' : 'pointer',
                    color: addedPlans.has(plan.text) ? 'var(--color-good)' : 'var(--color-accent)',
                    padding: '4px 8px', flexShrink: 0,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {addedPlans.has(plan.text) ? tr('✓ Added', '✓ যোগ হয়েছে') : tr('+ Add', '+ যোগ')}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Emotion over time */}
        {turns.length > 0 && (
          <div style={{
            marginTop: 12,
            background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
            borderRadius: 14, padding: 14,
          }}>
            <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>
              {tr('EMOTION OVER TIME', 'সময়ের সাথে আবেগ')}
            </div>
            <div style={{ display: 'flex', height: 36, gap: 2, borderRadius: 6, overflow: 'hidden' }}>
              {turns.map((turn, idx) => {
                const e = EMOTIONS[turn.emotion || '']
                return (
                  <div key={idx} style={{ flex: 1, background: e?.fg || '#aaa', opacity: 0.85 }}
                    title={`${turn.speaker_name}: ${e?.l || turn.emotion || ''}`} />
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {[...new Set(turns.map(t => t.emotion).filter(Boolean))].map(key => {
                const e = EMOTIONS[key as string]
                if (!e) return null
                return (
                  <div key={key} style={{
                    fontSize: 10, fontWeight: 700,
                    background: e.bg, color: e.fg,
                    padding: '2px 7px', borderRadius: 8,
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                  }}>{e.icon} {e.l}</div>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          <button onClick={handleExportPDF} style={{
            background: 'var(--color-surface)', color: 'var(--color-ink)',
            border: '1.5px solid var(--color-border)',
            padding: '12px 0', borderRadius: 14, cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            📄 {tr('Export PDF', 'PDF রপ্তানি')}
          </button>
          <button onClick={handleAskMemoryMate} style={{
            background: 'var(--color-accent)', color: '#fff', border: 'none',
            padding: '12px 0', borderRadius: 14, cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            💬 {tr('Ask Memory Mate', 'Memory Mate-কে জিজ্ঞেস')}
          </button>
        </div>
      </div>

      {/* Add plan confirmation sheet */}
      {addingPlan && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 60, display: 'flex', alignItems: 'flex-end',
          }}
          onClick={() => setAddingPlan(null)}
        >
          <div
            style={{
              width: '100%', background: 'var(--color-bg)',
              borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 6px' }}>
              {tr('Add to plans?', 'পরিকল্পনায় যোগ করবেন?')}
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: '0 0 20px' }}>{addingPlan.text}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => setAddingPlan(null)} style={{
                background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                padding: '14px 0', borderRadius: 14, cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--color-ink)',
              }}>
                {tr('Cancel', 'বাতিল')}
              </button>
              <button onClick={() => handleAddPlan(addingPlan)} style={{
                background: 'var(--color-accent)', color: '#fff', border: 'none',
                padding: '14px 0', borderRadius: 14, cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
              }}>
                {tr('Add plan', 'পরিকল্পনা যোগ করুন')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

