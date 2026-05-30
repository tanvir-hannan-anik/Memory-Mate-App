import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import Icon from '@/components/ui/Icon'
import api from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Session {
  id: string
  name: string
  created_at: string
  updated_at: string
}

function formatSessionDate(iso: string, lang: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return lang === 'bn' ? 'আজ' : 'Today'
  if (diffDays === 1) return lang === 'bn' ? 'গতকাল' : 'Yesterday'
  if (diffDays < 7)  return lang === 'bn' ? `${diffDays} দিন আগে` : `${diffDays} days ago`
  return d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric' })
}

const SUGGESTIONS = [
  { en: 'Who is coming today?',       bn: 'আজ কে আসছে?'          },
  { en: 'What should I eat?',         bn: 'আমি কী খাবো?'          },
  { en: 'Remind me about my pills',   bn: 'ওষুধের কথা মনে করিয়ে দাও' },
  { en: 'Did I take my pills?',       bn: 'আমি কি ওষুধ নিয়েছি?'   },
]

export default function Chat({ openSessions: externalOpen, onSessionsOpened }: {
  openSessions?: boolean
  onSessionsOpened?: () => void
} = {}) {
  const { profile } = useAuth()
  const { tr } = useLang()
  const isMobile = useIsMobile()

  const [sessionId, setSessionId]     = useState<string | null>(null)
  const [sessionName, setSessionName] = useState('New Chat')
  const [sessions, setSessions]       = useState<Session[]>([])
  const [showSessions, setShowSessions] = useState(false)
  const [messages, setMessages]       = useState<Message[]>([])
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [isListening, setIsListening] = useState(false)

  const bottomRef      = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  const isEmptyState = !initializing && messages.length === 0
  const firstName    = profile?.name?.split(' ')[0] || 'friend'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (externalOpen) { setShowSessions(true); onSessionsOpened?.() }
  }, [externalOpen])

  useEffect(() => { return () => { recognitionRef.current?.abort() } }, [])

  const loadMessages = useCallback(async (sid: string) => {
    try {
      const { data } = await api.get(`/chat/${sid}/messages`)
      setMessages((data as any[]).map((m: any) => ({
        id: m.id, role: m.role as 'user' | 'assistant',
        content: m.content, timestamp: new Date(m.created_at),
      })))
    } catch { setMessages([]) }
  }, [])

  const createSession = useCallback(async (uid: string) => {
    const { data } = await api.post(`/chat/sessions/${uid}`)
    setSessionId(data.id); setSessionName('New Chat'); setMessages([])
    return data as Session
  }, [])

  const loadSessions = useCallback(async (uid: string) => {
    const { data } = await api.get(`/chat/sessions/${uid}`)
    setSessions(data as Session[]); return data as Session[]
  }, [])

  useEffect(() => {
    if (!profile?.id) return
    let cancelled = false
    async function init() {
      try {
        const all = await loadSessions(profile!.id)
        if (cancelled) return
        if (all.length > 0) {
          const latest = all[0]
          setSessionId(latest.id); setSessionName(latest.name)
          await loadMessages(latest.id)
        } else {
          await createSession(profile!.id)
        }
      } catch (err: any) {
        if (!cancelled) {
          const detail = err?.response?.data?.detail || err?.message || 'Unknown error'
          const status = err?.response?.status
          const base = import.meta.env.VITE_API_BASE_URL || '(VITE_API_BASE_URL not set)'
          setMessages([{
            id: 'init-err',
            role: 'assistant',
            content: tr(
              `Chat server error${status ? ` (${status})` : ''}: ${detail}. API URL: ${base}`,
              `সার্ভার সংযোগ ব্যর্থ: ${detail}`
            ),
            timestamp: new Date(),
          }])
        }
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [profile?.id, loadSessions, loadMessages, createSession])

  async function handleNewChat() {
    if (!profile?.id) return
    setShowSessions(false); setInitializing(true)
    try { const s = await createSession(profile.id); setSessions(prev => [s, ...prev]) }
    finally { setInitializing(false) }
  }

  async function handleSwitchSession(s: Session) {
    setShowSessions(false); setSessionId(s.id); setSessionName(s.name); setInitializing(true)
    try { await loadMessages(s.id) } finally { setInitializing(false) }
  }

  async function handleDeleteSession(sid: string) {
    try {
      await api.delete(`/chat/sessions/${sid}`)
      setSessions(prev => prev.filter(s => s.id !== sid))
      if (sid === sessionId) {
        const remaining = sessions.filter(s => s.id !== sid)
        if (remaining.length > 0) await handleSwitchSession(remaining[0])
        else if (profile?.id) { const s = await createSession(profile.id); setSessions([s]) }
      }
    } catch { /* ignore */ }
    setShowSessions(false)
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    let activeSessionId = sessionId
    if (!activeSessionId && profile?.id) {
      try { const s = await createSession(profile.id); activeSessionId = s.id }
      catch (err: any) {
        const detail = err?.response?.data?.detail || err?.message || 'unknown error'
        const status = err?.response?.status
        setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant',
          content: tr(
            `Could not connect to the chat server${status ? ` (${status})` : ''}: ${detail}`,
            `সার্ভারে সংযোগ হয়নি: ${detail}`
          ),
          timestamp: new Date() }])
        return
      }
    }
    if (!activeSessionId) return
    setMessages(prev => [...prev, { id: `opt-${Date.now()}`, role: 'user', content: text, timestamp: new Date() }])
    setInput(''); setLoading(true)
    try {
      const { data } = await api.post(`/chat/${activeSessionId}/message`, {
        content: text, language: profile?.language || 'en',
      })
      setMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: 'assistant', content: data.reply, timestamp: new Date() }])
      if (data.session_name && data.session_name !== sessionName) {
        setSessionName(data.session_name)
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, name: data.session_name } : s))
      }
    } catch {
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant',
        content: tr("I couldn't respond right now. Please try again.", 'এখন সাড়া দিতে পারছি না। আবার চেষ্টা করুন।'), timestamp: new Date() }])
    } finally { setLoading(false) }
  }

  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert(tr('Voice input not supported. Use Chrome or Edge.', 'এই ব্রাউজারে ভয়েস সমর্থিত নয়।')); return }
    if (isListening) { recognitionRef.current?.abort(); recognitionRef.current = null; setIsListening(false); return }
    const r = new SR(); recognitionRef.current = r
    r.continuous = false; r.interimResults = false
    r.lang = profile?.language === 'bn' ? 'bn-BD' : 'en-US'
    r.onstart  = () => setIsListening(true)
    r.onresult = (e: any) => { const t = e.results[0][0].transcript.trim(); if (t) setInput(t); setIsListening(false); recognitionRef.current = null }
    r.onerror  = (e: any) => {
      setIsListening(false); recognitionRef.current = null
      if (e.error === 'not-allowed') alert(tr('Microphone access denied.', 'মাইক্রোফোন অ্যাক্সেস অস্বীকৃত।'))
    }
    r.onend = () => { setIsListening(false); recognitionRef.current = null }
    try { r.start() } catch { setIsListening(false); recognitionRef.current = null }
  }

  // ── Shared input bar ──────────────────────────────────────────────
  const InputBar = (
    <div style={{
      padding: isMobile ? '10px 16px calc(86px + var(--sab))' : '10px 16px 14px',
      background: 'var(--color-bg)',
      flexShrink: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#f0f2f5',
        borderRadius: 50,
        padding: '6px 6px 6px 16px',
      }}>
        {/* Mic button */}
        <button
          onClick={toggleVoice}
          style={{
            width: 36, height: 36, borderRadius: 18, flexShrink: 0,
            background: isListening ? 'var(--color-danger)' : 'transparent',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon
            name={isListening ? 'stop-circle' : 'mic'}
            size={20}
            color={isListening ? '#fff' : '#6b7280'}
          />
        </button>

        {/* Input */}
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder={tr('Type a message', 'বার্তা লিখুন')}
          disabled={initializing}
          style={{
            flex: 1,
            background: 'transparent', border: 'none', outline: 'none',
            fontSize: 15, color: 'var(--color-ink)',
            fontFamily: 'var(--font-body)',
            padding: '8px 0',
          }}
        />

        {/* Send button */}
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading || initializing}
          style={{
            width: 40, height: 40, borderRadius: 20, flexShrink: 0,
            background: input.trim() ? '#1a2f5e' : '#c5cad4',
            border: 'none', cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
          }}
        >
          <Icon name="arrow-up" size={18} color="#fff" />
        </button>
      </div>
    </div>
  )

  // ── Empty / greeting state ────────────────────────────────────────
  if (isEmptyState) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: '#fff', fontFamily: 'var(--font-body)',
        position: 'relative',
      }}>
        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Center section */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '40px 24px 24px', textAlign: 'center',
          }}>
            {/* Sparkle icon */}
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: '#f5ede0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Icon name="sparkle" size={32} color="#1a2f5e" />
            </div>

            {/* Greeting */}
            <h1 style={{
              fontSize: 'clamp(20px, 4vw, 28px)',
              fontWeight: 800, color: '#111827',
              fontFamily: 'var(--font-display)',
              margin: '0 0 8px',
              lineHeight: 1.25,
            }}>
              {tr(`Hello, ${firstName}. How are you feeling?`, `হ্যালো, ${firstName}। কেমন আছো?`)}
            </h1>

            <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 24px' }}>
              {tr('Ask me anything, or tap a suggestion below.', 'যেকোনো কিছু জিজ্ঞেস করুন, বা নিচে থেকে বেছে নিন।')}
            </p>

            {/* Suggestion chips */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center',
              maxWidth: 520,
            }}>
              {SUGGESTIONS.slice(0, 3).map(s => (
                <button
                  key={s.en}
                  onClick={() => sendMessage(tr(s.en, s.bn))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#fff',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: 50,
                    padding: '9px 16px',
                    fontSize: 13, fontWeight: 600,
                    color: '#374151',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon name="sparkle" size={13} color="#1a2f5e" />
                  {tr(s.en, s.bn)}
                </button>
              ))}
            </div>
          </div>

          {/* Recent chats */}
          {sessions.length > 0 && (
            <div style={{ padding: '0 20px 24px', maxWidth: 560, width: '100%', margin: '0 auto' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
                  color: '#9ca3af', textTransform: 'uppercase',
                }}>
                  {tr('Recent Chats', 'সাম্প্রতিক চ্যাট')}
                </span>
                <button
                  onClick={handleNewChat}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'transparent', border: 'none',
                    fontSize: 12, fontWeight: 600, color: '#1a2f5e',
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >
                  <Icon name="plus" size={13} color="#1a2f5e" />
                  {tr('New', 'নতুন')}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessions.slice(0, 5).map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSwitchSession(s)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: '#fff',
                      border: '1.5px solid #f0f2f5',
                      borderRadius: 14,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--font-body)',
                      width: '100%',
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: '#eff6ff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name="chat" size={18} color="#1a2f5e" />
                    </div>

                    {/* Title */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600, color: '#111827',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        {formatSessionDate(s.updated_at, profile?.language || 'en')}
                      </div>
                    </div>

                    {/* Chevron */}
                    <Icon name="chevron-right" size={16} color="#d1d5db" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        {InputBar}
      </div>
    )
  }

  // ── Chat / messages state ─────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#fff', fontFamily: 'var(--font-body)',
      position: 'relative',
    }}>
      {/* ── Side panel backdrop ── */}
      {showSessions && (
        <div
          onClick={() => setShowSessions(false)}
          style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(0,0,0,0.3)' }}
        />
      )}

      {/* ── Sessions drawer ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: 270, zIndex: 30,
        background: '#fff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex', flexDirection: 'column',
        transform: showSessions ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        boxShadow: showSessions ? '4px 0 20px rgba(0,0,0,0.12)' : 'none',
      }}>
        <div style={{
          padding: '16px 14px 10px',
          borderBottom: '1px solid #f0f2f5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>
            {tr('Recent Chats', 'সাম্প্রতিক চ্যাট')}
          </span>
          <button onClick={() => setShowSessions(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Icon name="x" size={16} color="#9ca3af" />
          </button>
        </div>

        <button
          onClick={handleNewChat}
          style={{
            margin: '10px 12px 4px',
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#1a2f5e', border: 'none', borderRadius: 10,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            fontSize: 13, fontWeight: 600, color: '#fff',
          }}
        >
          <Icon name="plus" size={15} color="#fff" />
          {tr('New Chat', 'নতুন চ্যাট')}
        </button>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 12px' }}>
          {sessions.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center',
              borderRadius: 8, marginBottom: 2,
              background: s.id === sessionId ? '#eff6ff' : 'transparent',
            }}>
              <button
                onClick={() => handleSwitchSession(s)}
                style={{
                  flex: 1, padding: '10px 10px 8px',
                  textAlign: 'left', border: 'none',
                  background: 'transparent', cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  minWidth: 0,
                }}
              >
                <div style={{
                  fontSize: 13, fontWeight: s.id === sessionId ? 700 : 500,
                  color: s.id === sessionId ? '#1a2f5e' : '#374151',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  {formatSessionDate(s.updated_at, profile?.language || 'en')}
                </div>
              </button>
              {s.id !== sessionId && (
                <button
                  onClick={() => handleDeleteSession(s.id)}
                  style={{
                    width: 26, height: 26, border: 'none',
                    background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0.5, flexShrink: 0,
                  }}
                >
                  <Icon name="x" size={12} color="#6b7280" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Header ── */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #f0f2f5',
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#fff', flexShrink: 0,
      }}>
        {/* Sparkle avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: '#f5ede0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon name="sparkle" size={20} color="#1a2f5e" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: '#111827',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {sessionName === 'New Chat' ? tr('Memory Mate', 'মেমোরি মেট') : sessionName}
          </div>
          <div style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: '#10b981', display: 'inline-block' }} />
            {tr('Online', 'অনলাইন')}
          </div>
        </div>

        <button
          onClick={() => setShowSessions(v => !v)}
          style={{
            height: 34, borderRadius: 17, padding: '0 12px',
            background: showSessions ? '#eff6ff' : '#f9fafb',
            border: '1px solid #e5e7eb',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
            color: '#374151',
          }}
        >
          <Icon name="clock" size={13} color="#6b7280" />
          {tr('Chats', 'চ্যাট')}
        </button>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {initializing ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: 48, fontSize: 14 }}>
            {tr('Loading chat…', 'চ্যাট লোড হচ্ছে…')}
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div key={msg.id} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: '#f5ede0', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: 8, alignSelf: 'flex-end',
                  }}>
                    <Icon name="sparkle" size={14} color="#1a2f5e" />
                  </div>
                )}
                <div style={{
                  maxWidth: 'min(78%, 480px)',
                  background: msg.role === 'user' ? '#1a2f5e' : '#f0f2f5',
                  color: msg.role === 'user' ? '#fff' : '#111827',
                  borderRadius: 18,
                  borderBottomRightRadius: msg.role === 'user' ? 4 : 18,
                  borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 18,
                  padding: '11px 15px',
                  fontSize: 14, lineHeight: 1.6, fontWeight: 500,
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing dots */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: '#f5ede0', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="sparkle" size={14} color="#1a2f5e" />
                </div>
                <div style={{
                  background: '#f0f2f5', borderRadius: 18, borderBottomLeftRadius: 4,
                  padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center',
                }}>
                  {[0, 1, 2].map(d => (
                    <div key={d} style={{
                      width: 7, height: 7, borderRadius: 4,
                      background: '#9ca3af',
                      animation: 'memora-dot 1.2s infinite',
                      animationDelay: `${d * 0.15}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Suggestions (first message) ── */}
      {!initializing && messages.length <= 1 && (
        <div style={{
          padding: '0 16px 6px',
          display: 'flex', gap: 8, overflowX: 'auto',
          flexShrink: 0, scrollbarWidth: 'none',
        }}>
          {SUGGESTIONS.map(s => (
            <button
              key={s.en}
              onClick={() => sendMessage(tr(s.en, s.bn))}
              style={{
                flexShrink: 0, cursor: 'pointer',
                background: '#fff', border: '1.5px solid #e5e7eb',
                borderRadius: 50, padding: '7px 14px',
                fontSize: 12, fontWeight: 600,
                color: '#374151', fontFamily: 'var(--font-body)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <Icon name="sparkle" size={11} color="#1a2f5e" />
              {tr(s.en, s.bn)}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      {InputBar}
    </div>
  )
}
