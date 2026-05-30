import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import api from '@/lib/api'
import { uploadRecording, fsAddRecording, logAppEvent } from '@/lib/firebase'
import Icon from '@/components/ui/Icon'


type RecordMode = 'idle' | 'recording' | 'uploading' | 'processing' | 'done'

// Prototype waveform heights (15 bars)
const WAVE_HEIGHTS = [14, 28, 44, 22, 52, 36, 18, 48, 30, 12, 40, 24, 50, 32, 16]

export default function Record() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { tr } = useLang()
  const [mode, setMode] = useState<RecordMode>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [bars, setBars] = useState<number[]>(WAVE_HEIGHTS)
  const [uploadPct, setUploadPct] = useState(0)
  const [callNumber, setCallNumber] = useState('')
  const [title, setTitle] = useState('')
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [showCallSection, setShowCallSection] = useState(false)

  const mediaRef    = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  const timerRef    = useRef<ReturnType<typeof setInterval>>()
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)

  function startWaveFromMic(stream: MediaStream) {
    const ctx = new AudioContext()
    const src = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 64
    src.connect(analyser)
    analyserRef.current = analyser
    const data = new Uint8Array(analyser.frequencyBinCount)
    function draw() {
      analyser.getByteFrequencyData(data)
      // Map mic data to the 15 prototype bars
      const mapped = WAVE_HEIGHTS.map((base, i) => {
        const val = data[i * 2] || 0
        return base * 0.4 + (val / 255) * 52
      })
      setBars(mapped)
      animFrameRef.current = requestAnimationFrame(draw)
    }
    draw()
  }

  function stopWaveAnim() {
    cancelAnimationFrame(animFrameRef.current)
    setBars(WAVE_HEIGHTS)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.start()
      setMode('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
      startWaveFromMic(stream)
      logAppEvent('recording_started')
    } catch {
      alert(tr('Microphone access denied', 'মাইক্রোফোন অ্যাক্সেস অস্বীকার'))
    }
  }

  async function stopRecording() {
    if (!mediaRef.current) return
    clearInterval(timerRef.current)
    stopWaveAnim()
    setMode('uploading')
    setUploadPct(0)

    mediaRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const fileName = `${Date.now()}.webm`
      try {
        const fileUrl = await uploadRecording(
          profile?.id || 'anon', blob, fileName,
          pct => setUploadPct(pct)
        )
        setMode('processing')
        const docRef = await fsAddRecording({
          patientId: profile?.id,
          title: title || tr('Voice memo', 'ভয়েস মেমো'),
          duration: elapsed,
          file_url: fileUrl,
          file_size: blob.size,
          mood: 'Calm',
          fileName,
        })
        setRecordingId(docRef.id)
        await api.post('/recordings/transcribe', {
          recording_id: docRef.id,
          file_url: fileUrl,
          patient_id: profile?.id,
          duration: elapsed,
          title: title || tr('Voice memo', 'ভয়েস মেমো'),
        })
        logAppEvent('recording_saved', { duration: elapsed })
        setMode('done')
      } catch (err) {
        console.error(err)
        alert(tr('Upload failed. Check your connection.', 'আপলোড ব্যর্থ। সংযোগ পরীক্ষা করুন।'))
        setMode('idle')
      }
    }

    mediaRef.current.stop()
    mediaRef.current.stream.getTracks().forEach(t => t.stop())
  }

  function startCall() {
    if (!callNumber.trim()) return
    logAppEvent('call_initiated', { to: callNumber })
    window.location.href = `tel:${callNumber.trim().replace(/\s/g, '')}`
  }

  useEffect(() => () => { clearInterval(timerRef.current); stopWaveAnim() }, [])

  const rec = mode === 'recording'
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div style={{
      width: '100%', height: '100dvh',
      background: 'var(--color-bg)',
      color: 'var(--color-ink)',
      fontFamily: 'var(--font-body)',
      paddingTop: 54,
      paddingBottom: 34,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Back button */}
      <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{
          width: 40, height: 40, borderRadius: 20,
          background: 'var(--color-bg-warm)',
          border: '1.5px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <Icon name="chevron-left" size={20} color="var(--color-ink-soft)" />
        </button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--color-ink)' }}>
          {tr('Record Memory', 'স্মৃতি রেকর্ড')}
        </div>
      </div>

      {/* Done */}
      {mode === 'done' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, background: 'var(--color-good-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>✅</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--color-ink)' }}>{tr('Recording saved!', 'রেকর্ডিং সংরক্ষিত!')}</div>
            <div style={{ fontSize: 15, color: 'var(--color-ink-mute)', marginTop: 6 }}>{tr('Transcription in progress...', 'ট্রান্সক্রিপ্ট প্রক্রিয়া হচ্ছে...')}</div>
          </div>
          <div style={{ display: 'flex', gap: 12, width: '100%', padding: '0 4px' }}>
            <button onClick={() => { setMode('idle'); setTitle('') }} style={{
              flex: 1, minHeight: 56, borderRadius: 'var(--radius)',
              background: 'transparent', border: '1.5px solid var(--color-accent)',
              color: 'var(--color-accent)', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}>{tr('Record again', 'আবার রেকর্ড')}</button>
            <button onClick={() => navigate(recordingId ? `/transcript/${recordingId}` : '/patient/memories')} style={{
              flex: 1, minHeight: 56, borderRadius: 'var(--radius)',
              background: 'var(--color-accent)', border: 'none',
              color: '#fff', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}>{tr('View transcript', 'ট্রান্সক্রিপ্ট দেখুন')}</button>
          </div>
        </div>
      )}

      {/* Uploading */}
      {mode === 'uploading' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, border: '4px solid var(--color-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="var(--color-accent)" strokeWidth="4"
                strokeDasharray={`${uploadPct * 2.26} 226`} strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--color-accent)' }}>{uploadPct}%</span>
          </div>
          <div style={{ fontSize: 15, color: 'var(--color-ink-mute)' }}>{tr('Uploading...', 'আপলোড হচ্ছে...')}</div>
        </div>
      )}

      {/* Processing */}
      {mode === 'processing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 5, height: 60 }}>
            {WAVE_HEIGHTS.map((h, i) => (
              <div key={i} style={{
                width: 5, height: h, borderRadius: 3, background: 'var(--color-accent)',
                animation: `memora-wave 1.${(i * 7) % 9}s ease-in-out infinite`,
                animationDelay: `${i * 0.07}s`,
              }} />
            ))}
          </div>
          <div style={{ fontSize: 15, color: 'var(--color-ink-mute)' }}>{tr('AI transcription running...', 'AI ট্রান্সক্রিপ্ট চলছে...')}</div>
        </div>
      )}

      {/* Idle / Recording — prototype layout */}
      {(mode === 'idle' || mode === 'recording') && (
        <>
          {/* Prompt text */}
          <div style={{ padding: '16px 24px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-ink-soft)', lineHeight: 1.35 }}>
              {rec ? tr('Recording…', 'রেকর্ড হচ্ছে…') : tr('Talking with someone?', 'কারো সাথে কথা বলছেন?')}<br />
              <span style={{ color: 'var(--color-ink)', fontWeight: 700 }}>
                {rec ? tr('Tap stop when done.', 'শেষ হলে থামাতে ট্যাপ করুন।') : tr('Tap to record.', 'রেকর্ড করতে ট্যাপ করুন।')}
              </span>
            </div>
          </div>

          {/* Centered: waveform + button + timer */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
            {/* Waveform */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 60, opacity: rec ? 1 : 0.2 }}>
              {bars.map((h, idx) => (
                <div key={idx} style={{
                  width: 5, height: Math.round(h), borderRadius: 3,
                  background: 'var(--color-accent)',
                  animation: rec ? `memora-wave 1.${(idx * 7) % 9}s ease-in-out infinite` : 'none',
                  animationDelay: `${idx * 0.07}s`,
                }} />
              ))}
            </div>

            {/* Big circular button — 180×180 */}
            <button
              onClick={rec ? stopRecording : startRecording}
              style={{
                width: 180, height: 180, borderRadius: '50%',
                background: rec
                  ? 'radial-gradient(circle at 35% 30%, #d94e3a, #8b2920)'
                  : 'radial-gradient(circle at 35% 30%, var(--color-ink-mute), var(--color-ink-soft))',
                border: '6px solid #fff',
                cursor: 'pointer',
                boxShadow: rec
                  ? '0 12px 40px rgba(139,41,32,0.45)'
                  : '0 6px 20px rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 300ms ease',
              }}
            >
              {rec
                ? <div style={{ width: 56, height: 56, borderRadius: 10, background: '#fff' }} />
                : <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fff' }} />
              }
            </button>

            {/* Timer */}
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700,
              color: rec ? 'var(--color-ink)' : 'var(--color-ink-mute)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {mm}:{ss}
            </div>
          </div>

          {/* Bottom area */}
          <div style={{ padding: '0 24px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* BigButton */}
            <button
              onClick={rec ? stopRecording : startRecording}
              style={{
                width: '100%', minHeight: 64,
                borderRadius: 'var(--radius)',
                background: rec ? 'var(--color-accent-soft)' : 'var(--color-accent)',
                color: rec ? 'var(--color-accent-dark)' : '#fff',
                border: `1.5px solid ${rec ? 'var(--color-accent-soft)' : 'var(--color-accent)'}`,
                fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                cursor: 'pointer',
                boxShadow: rec ? 'none' : '0 8px 22px rgba(30,110,114,0.35)',
              }}
            >
              <Icon name={rec ? 'stop-circle' : 'mic'} size={24} color={rec ? 'var(--color-accent-dark)' : '#fff'} />
              {rec ? tr('Stop and save', 'থামান এবং সংরক্ষণ করুন') : tr('Start recording', 'রেকর্ড শুরু করুন')}
            </button>

            {/* Optional title + phone call */}
            <button
              onClick={() => setShowCallSection(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-ink-mute)', fontSize: 13, fontWeight: 600,
                padding: '4px 0', textAlign: 'center',
              }}
              disabled={rec}
            >
              {showCallSection ? '▲' : '▼'} {tr('More options', 'আরও বিকল্প')}
            </button>

            {showCallSection && !rec && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Title */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-mute)', display: 'block', marginBottom: 6 }}>
                    {tr('Title (optional)', 'শিরোনাম (ঐচ্ছিক)')}
                  </label>
                  <input
                    style={{
                      width: '100%', background: 'var(--color-surface)',
                      border: '1.5px solid var(--color-border)',
                      borderRadius: 14, padding: '10px 14px',
                      fontSize: 15, color: 'var(--color-ink)', outline: 'none',
                      fontFamily: 'var(--font-body)', boxSizing: 'border-box',
                    }}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={tr('e.g. Call with Sara', 'যেমন: সারার সাথে কথা')}
                  />
                </div>

                {/* Phone call section — opens native phone dialer */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{
                      flex: 1, background: 'var(--color-surface)',
                      border: '1.5px solid var(--color-border)',
                      borderRadius: 14, padding: '10px 14px',
                      fontSize: 15, color: 'var(--color-ink)', outline: 'none',
                      fontFamily: 'var(--font-body)',
                    }}
                    value={callNumber}
                    onChange={e => setCallNumber(e.target.value)}
                    placeholder="+880 1XX XXX XXXX"
                    type="tel"
                  />
                  <button
                    onClick={startCall}
                    disabled={!callNumber.trim()}
                    style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: callNumber.trim() ? 'var(--color-accent)' : 'var(--color-border)',
                      border: 'none', cursor: callNumber.trim() ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon name="phone" size={20} color="#fff" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  )
}
