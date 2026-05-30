// Transcript / Document view + Recordings list
// Speaker diarization + emotion recognition shown per utterance

// Voice signature colors — each speaker gets a stable color
const SPEAKER_COLORS = {
  'Rahim':  { bg: '#FCE9D5', fg: '#9C5A12', ring: '#E89B4A' },
  'Sara':   { bg: '#D9E8E7', fg: '#0E4145', ring: '#1E6E72' },
  'Mira':   { bg: '#E5DCEF', fg: '#4C2E76', ring: '#7A5AE0' },
  'Dr. Hasan': { bg: '#D6E3F4', fg: '#1E4A87', ring: '#3771C8' },
};

const EMOTIONS = {
  warm:    { l: 'Warm',    icon: '◐', bg: '#FCE9D5', fg: '#9C5A12' },
  calm:    { l: 'Calm',    icon: '○', bg: '#D9E8E7', fg: '#0E4145' },
  worried: { l: 'Worried', icon: '◑', bg: '#F4E2BF', fg: '#7A4A0F' },
  joyful:  { l: 'Joyful',  icon: '◉', bg: '#DCEAD3', fg: '#2E5D2C' },
  tired:   { l: 'Tired',   icon: '◍', bg: '#E5E1DA', fg: '#534F66' },
};

const SAMPLE_RECORDINGS = [
  {
    id: 'r1',
    title: "Sara's evening call",
    date: 'Yesterday, 6:30 PM',
    duration: '4:12',
    size: '2.1 MB',
    speakers: ['Rahim', 'Sara'],
    summary: 'Sara called to check in. She will visit Friday afternoon and bring groceries. She reminded about the blue pill schedule and asked Rahim to drink more water.',
    plans: [
      { when: 'Friday 1:00 PM', what: 'Sara visits with groceries' },
    ],
    mood: 'warm',
    turns: [
      { who: 'Sara',  t: '00:00', mood: 'warm',    text: 'হ্যালো আব্বু, কেমন আছো? দুপুরে কী খেলে?' },
      { who: 'Rahim', t: '00:06', mood: 'calm',    text: 'আমি ভালো আছি মা। ভাত আর মাছ খেয়েছি। তুমি কেমন আছো?' },
      { who: 'Sara',  t: '00:14', mood: 'warm',    text: 'আমি ভালো আছি। শোনো — শুক্রবার আমি বাসায় আসব। গ্রোসারি নিয়ে আসব।' },
      { who: 'Rahim', t: '00:23', mood: 'joyful',  text: 'সত্যি? কী দারুণ! কখন আসবে মা?' },
      { who: 'Sara',  t: '00:28', mood: 'calm',    text: 'দুপুর ১টার দিকে। তুমি প্রস্তুত থেকো। আর আব্বু, নীল ওষুধ ঠিকমতো খাচ্ছো তো?' },
      { who: 'Rahim', t: '00:39', mood: 'worried', text: 'আজ সকালে... মনে নেই, খেয়েছি কিনা।' },
      { who: 'Sara',  t: '00:44', mood: 'warm',    text: 'চিন্তা কোরো না। Memora তে check করো — সব লেখা আছে। আর পানি বেশি করে খেও।' },
    ],
  },
  {
    id: 'r2',
    title: 'Tea with Mira',
    date: 'Tuesday, 4:15 PM',
    duration: '12:38',
    size: '6.4 MB',
    speakers: ['Rahim', 'Mira'],
    summary: 'Long chat about gardening and old memories. Rahim mentioned knee pain twice. Mira suggested a morning walk in the park on Monday.',
    plans: [
      { when: 'Monday 7:30 AM', what: 'Walk in park with Mira' },
    ],
    mood: 'warm',
    flags: ['Mentioned knee pain'],
    turns: [],
  },
  {
    id: 'r3',
    title: "Dr. Hasan — checkup",
    date: 'Tuesday, 3:15 PM',
    duration: '8:22',
    size: '4.1 MB',
    speakers: ['Rahim', 'Dr. Hasan'],
    summary: 'Routine checkup. Doctor said medicine is working well. Next appointment scheduled for June 10 at 10:00 AM. Blood pressure normal.',
    plans: [
      { when: 'Tue, Jun 10, 10:00 AM', what: 'Dr. Hasan — next checkup' },
    ],
    mood: 'calm',
    turns: [],
  },
];

// ─── Recordings list ───
function RecordingsList({ t, f, s, i, onOpen }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: t.bg, color: t.ink,
      fontFamily: f.body, paddingTop: 54, paddingBottom: 100,
      overflowY: 'auto',
    }}>
      <div style={{ padding: '8px 20px 12px' }}>
        <div style={{ fontSize: 13, color: t.inkMute, fontWeight: 700, letterSpacing: 1.5 }}>RECORDINGS</div>
        <h1 style={{ fontFamily: f.display, fontSize: 30, fontWeight: 800, margin: '4px 0 0', color: t.ink, letterSpacing: -0.5 }}>
          কথাবার্তা
        </h1>
        <p style={{ fontSize: 14, color: t.inkSoft, marginTop: 4 }}>
          {SAMPLE_RECORDINGS.length} conversations · AI processed
        </p>
      </div>

      {/* Big record CTA */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${t.accent}, ${t.accentInk})`,
          borderRadius: 20, padding: 18, color: '#fff',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 26,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid rgba(255,255,255,0.4)',
          }}>
            <Icon name="mic" size={28} stroke="#fff" filled={i === 'filled'}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: f.display, fontSize: 18, fontWeight: 700 }}>Start a new recording</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>AI will transcribe & summarize</div>
          </div>
          <div style={{ fontSize: 26 }}>›</div>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {SAMPLE_RECORDINGS.map(rec => {
          const speakerColors = rec.speakers.map(sp => SPEAKER_COLORS[sp] || SPEAKER_COLORS.Rahim);
          return (
            <div key={rec.id} onClick={() => onOpen && onOpen(rec.id)} style={{
              background: t.surface, border: `1.5px solid ${t.border}`,
              borderRadius: 18, padding: 16, marginBottom: 12, cursor: 'pointer',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Document corner */}
              <div style={{
                position: 'absolute', top: 0, right: 0,
                width: 0, height: 0,
                borderTop: `28px solid ${t.bgWarm}`,
                borderLeft: `28px solid transparent`,
              }}/>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                {/* Doc icon */}
                <div style={{
                  width: 48, height: 56, flexShrink: 0,
                  background: t.bgWarm, border: `1.5px solid ${t.border}`,
                  borderRadius: 6, position: 'relative',
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                  padding: 5, gap: 3,
                }}>
                  <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, color: t.accent, fontWeight: 800, letterSpacing: 0.5 }}>TXT</div>
                  <div style={{ height: 2, background: t.border, width: '100%', borderRadius: 1 }}/>
                  <div style={{ height: 2, background: t.border, width: '80%', borderRadius: 1 }}/>
                  <div style={{ height: 2, background: t.border, width: '90%', borderRadius: 1 }}/>
                  <div style={{ height: 2, background: t.accent, width: '60%', borderRadius: 1 }}/>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: f.display, fontSize: 18, fontWeight: 700, color: t.ink, lineHeight: 1.25 }}>
                    {rec.title}
                  </div>
                  <div style={{ fontSize: 13, color: t.inkSoft, marginTop: 4 }}>
                    {rec.date} · {rec.duration} · {rec.size}
                  </div>

                  {/* Speaker chips */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {rec.speakers.map((sp, idx) => {
                      const c = speakerColors[idx];
                      return (
                        <div key={sp} style={{
                          background: c.bg, color: c.fg,
                          padding: '3px 10px 3px 4px', borderRadius: 12,
                          fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          <div style={{ width: 18, height: 18, borderRadius: 9, background: c.ring, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                            {sp[0]}
                          </div>
                          {sp}
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary */}
                  <p style={{ fontSize: 14, color: t.ink, lineHeight: 1.5, marginTop: 10, marginBottom: 0,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {rec.summary}
                  </p>

                  {/* Bottom row: mood + flag */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
                    {(() => {
                      const e = EMOTIONS[rec.mood];
                      return (
                        <div style={{
                          fontSize: 11, fontWeight: 700,
                          background: e.bg, color: e.fg,
                          padding: '3px 9px', borderRadius: 10,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>{e.icon} {e.l}</div>
                      );
                    })()}
                    {rec.plans?.length > 0 && (
                      <div style={{
                        fontSize: 11, fontWeight: 700,
                        background: t.accentSoft, color: t.accentInk,
                        padding: '3px 9px', borderRadius: 10,
                      }}>📅 {rec.plans.length} plan</div>
                    )}
                    {rec.flags?.length > 0 && (
                      <div style={{
                        fontSize: 11, fontWeight: 700,
                        background: t.dangerSoft, color: t.danger,
                        padding: '3px 9px', borderRadius: 10,
                      }}>⚠ {rec.flags[0]}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Transcript document view ───
function TranscriptScreen({ t, f, s, i, recordingId, onBack }) {
  const rec = SAMPLE_RECORDINGS.find(r => r.id === recordingId) || SAMPLE_RECORDINGS[0];
  // Provide default turns if specific recording has empty turns array
  const turns = rec.turns.length > 0 ? rec.turns : SAMPLE_RECORDINGS[0].turns;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: t.bg, color: t.ink, fontFamily: f.body,
      paddingTop: 54, paddingBottom: 80,
      overflowY: 'auto',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
        position: 'sticky', top: 0, background: t.bg, zIndex: 5,
      }}>
        <button onClick={onBack} style={{
          width: 40, height: 40, borderRadius: 20,
          background: t.surface, border: `1px solid ${t.border}`,
          cursor: 'pointer', fontSize: 20, color: t.inkSoft,
        }}>‹</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: t.inkSoft, fontWeight: 600 }}>Transcript</div>
        <button style={{
          width: 40, height: 40, borderRadius: 20,
          background: t.surface, border: `1px solid ${t.border}`,
          cursor: 'pointer', color: t.inkSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>⋯</span>
        </button>
      </div>

      {/* DOCUMENT HEADER */}
      <div style={{ padding: '12px 20px 0' }}>
        <div style={{
          background: t.surface, border: `1.5px solid ${t.border}`,
          borderRadius: 18, padding: 18, position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative document corner */}
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: 0, height: 0,
            borderTop: `36px solid ${t.bgWarm}`,
            borderLeft: `36px solid transparent`,
          }}/>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 56, height: 70, flexShrink: 0,
              background: t.accent, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: f.display, fontSize: 12, fontWeight: 800, letterSpacing: 1,
            }}>.TXT</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: t.inkMute, fontWeight: 700, letterSpacing: 1 }}>CONVERSATION</div>
              <div style={{ fontFamily: f.display, fontSize: 22, fontWeight: 700, lineHeight: 1.25, color: t.ink, marginTop: 2 }}>
                {rec.title}
              </div>
              <div style={{ fontSize: 13, color: t.inkSoft, marginTop: 4 }}>
                {rec.date}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
            {[
              { l: 'Duration', v: rec.duration },
              { l: 'Speakers', v: rec.speakers.length },
              { l: 'File',     v: rec.size },
            ].map(stat => (
              <div key={stat.l} style={{
                background: t.bgWarm, borderRadius: 10, padding: '8px 10px',
              }}>
                <div style={{ fontSize: 10, color: t.inkMute, fontWeight: 700, letterSpacing: 0.5 }}>{stat.l.toUpperCase()}</div>
                <div style={{ fontFamily: f.display, fontSize: 16, fontWeight: 700, color: t.ink, marginTop: 1 }}>{stat.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SPEAKER LEGEND */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>VOICES DETECTED</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {rec.speakers.map(sp => {
            const c = SPEAKER_COLORS[sp] || SPEAKER_COLORS.Rahim;
            const count = turns.filter(tn => tn.who === sp).length;
            return (
              <div key={sp} style={{
                background: c.bg, color: c.fg,
                padding: '6px 10px 6px 6px', borderRadius: 14,
                fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ width: 26, height: 26, borderRadius: 13, background: c.ring, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
                  {sp[0]}
                </div>
                <div>
                  <div style={{ lineHeight: 1.1 }}>{sp}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 600 }}>{count} turn{count !== 1 ? 's' : ''}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TRANSCRIPT BODY */}
      <div style={{ padding: '20px 20px 12px' }}>
        <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>FULL TRANSCRIPT</div>
        <div style={{
          background: t.surface, border: `1.5px solid ${t.border}`,
          borderRadius: 18, padding: 4, overflow: 'hidden',
        }}>
          {turns.map((turn, idx) => {
            const c = SPEAKER_COLORS[turn.who] || SPEAKER_COLORS.Rahim;
            const e = EMOTIONS[turn.mood];
            return (
              <div key={idx} style={{
                display: 'flex', gap: 10, padding: 14,
                borderBottom: idx < turns.length - 1 ? `1px solid ${t.border}` : 'none',
              }}>
                {/* Speaker avatar */}
                <div style={{ flexShrink: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 18,
                    background: c.ring, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800,
                  }}>{turn.who[0]}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Speaker + emotion row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: c.fg }}>{turn.who}</span>
                    <span style={{ fontSize: 11, color: t.inkMute, fontVariantNumeric: 'tabular-nums' }}>{turn.t}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: e.bg, color: e.fg,
                      padding: '2px 7px', borderRadius: 8,
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                    }}>{e.icon} {e.l}</span>
                  </div>
                  {/* Text */}
                  <div style={{
                    fontSize: 16, lineHeight: 1.55, color: t.ink, marginTop: 4,
                    fontWeight: 500,
                  }}>{turn.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI INSIGHTS */}
      <div style={{ padding: '4px 20px 12px' }}>
        <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>AI INSIGHTS</div>

        {/* Summary */}
        <div style={{
          background: t.accentSoft, border: `1.5px solid ${t.accent}33`,
          borderRadius: 14, padding: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: t.accentInk, fontWeight: 700, letterSpacing: 0.5 }}>
            <Icon name="sparkle" size={14} stroke={t.accentInk} filled/> SUMMARY
          </div>
          <div style={{ fontSize: 15, color: t.ink, lineHeight: 1.55, marginTop: 6 }}>
            {rec.summary}
          </div>
        </div>

        {/* Detected plans */}
        {rec.plans?.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {rec.plans.map((p, idx) => (
              <div key={idx} style={{
                background: t.surface, border: `1.5px solid ${t.border}`,
                borderRadius: 14, padding: 12, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6,
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="calendar" size={20} stroke={t.accentInk} filled={i === 'filled'}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: t.accent, fontWeight: 700, letterSpacing: 0.5 }}>PLAN DETECTED</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.ink }}>{p.what}</div>
                  <div style={{ fontSize: 13, color: t.inkSoft, marginTop: 1 }}>{p.when}</div>
                </div>
                <div style={{ fontSize: 12, color: t.accent, fontWeight: 700 }}>+ Add</div>
              </div>
            ))}
          </div>
        )}

        {/* Mood timeline */}
        <div style={{
          marginTop: 12,
          background: t.surface, border: `1.5px solid ${t.border}`,
          borderRadius: 14, padding: 14,
        }}>
          <div style={{ fontSize: 11, color: t.inkMute, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>EMOTION OVER TIME</div>
          <div style={{ display: 'flex', height: 36, gap: 2, borderRadius: 6, overflow: 'hidden' }}>
            {turns.map((turn, idx) => {
              const e = EMOTIONS[turn.mood];
              return (
                <div key={idx} title={`${turn.who}: ${e.l}`} style={{
                  flex: 1, background: e.fg, opacity: 0.85,
                }}/>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {[...new Set(turns.map(tn => tn.mood))].map(mood => {
              const e = EMOTIONS[mood];
              return (
                <div key={mood} style={{
                  fontSize: 10, fontWeight: 700,
                  background: e.bg, color: e.fg,
                  padding: '2px 7px', borderRadius: 8,
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                }}>{e.icon} {e.l}</div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          <button style={{
            background: t.surface, color: t.ink, border: `1.5px solid ${t.border}`,
            padding: '12px 0', borderRadius: 14, cursor: 'pointer',
            fontFamily: f.body, fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Icon name="book" size={18} stroke={t.ink} filled={i === 'filled'}/> Export PDF
          </button>
          <button style={{
            background: t.accent, color: '#fff', border: 'none',
            padding: '12px 0', borderRadius: 14, cursor: 'pointer',
            fontFamily: f.body, fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Icon name="chat" size={18} stroke="#fff" filled={i === 'filled'}/> Ask Memora
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  RecordingsList, TranscriptScreen, SAMPLE_RECORDINGS, SPEAKER_COLORS, EMOTIONS,
});
