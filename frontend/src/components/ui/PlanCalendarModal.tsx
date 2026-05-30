import { fmtMonthYear, toBnDigits } from '@/lib/dateLocale'
import { format } from 'date-fns'
import Icon from './Icon'

const TYPE_COLORS: Record<string, string> = {
  medicine:    '#EF4444',
  call:        '#3B82F6',
  visit:       '#F59E0B',
  task:        '#22C55E',
  appointment: '#1E6E72',
}

const TYPE_LABELS: Record<string, [string, string]> = {
  medicine:    ['Medicine',    'ওষুধ'],
  call:        ['Call',        'ফোন'],
  visit:       ['Visit',       'দেখা'],
  task:        ['Task',        'কাজ'],
  appointment: ['Appointment', 'অ্যাপয়েন্টমেন্ট'],
}

const HEADERS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const HEADERS_BN = ['রবি', 'সোম', 'মঙ্গ', 'বুধ', 'বৃহ', 'শুক', 'শনি']

function calCells(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

interface Props {
  planDatesMap: Record<string, string[]>
  calViewDate: Date
  setCalViewDate: (d: Date) => void
  selectedDate: Date
  setSelectedDate: (d: Date) => void
  todayStr: string
  lang: 'en' | 'bn'
  tr: (en: string, bn: string) => string
  onClose: () => void
}

export default function PlanCalendarModal({
  planDatesMap, calViewDate, setCalViewDate,
  selectedDate, setSelectedDate,
  todayStr, lang, tr, onClose,
}: Props) {
  const year  = calViewDate.getFullYear()
  const month = calViewDate.getMonth()
  const cells = calCells(year, month)
  const selectedStr = format(selectedDate, 'yyyy-MM-dd')
  const headers = lang === 'bn' ? HEADERS_BN : HEADERS_EN

  const usedTypes = [...new Set(Object.values(planDatesMap).flat())]

  function handleDayClick(dayNum: number) {
    setSelectedDate(new Date(year, month, dayNum))
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 95, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', background: 'var(--color-bg)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          display: 'flex', flexDirection: 'column',
          maxHeight: '85dvh', overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Month navigation header ── */}
        <div style={{
          padding: '14px 16px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '1px solid var(--color-border)', flexShrink: 0,
        }}>
          <button
            onClick={() => setCalViewDate(new Date(year, month - 1, 1))}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="chevron-left" size={16} color="var(--color-ink-soft)" />
          </button>

          <div style={{
            flex: 1, textAlign: 'center',
            fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
            color: 'var(--color-ink)',
          }}>
            {fmtMonthYear(calViewDate, lang)}
          </div>

          <button
            onClick={() => setCalViewDate(new Date(year, month + 1, 1))}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="chevron-right" size={16} color="var(--color-ink-soft)" />
          </button>

          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="x" size={16} color="var(--color-ink-soft)" />
          </button>
        </div>

        {/* ── Day-of-week headers ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
          padding: '10px 12px 4px', flexShrink: 0,
        }}>
          {headers.map(h => (
            <div key={h} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-ink-mute)' }}>
              {h}
            </div>
          ))}
        </div>

        {/* ── Calendar grid ── */}
        <div style={{ overflowY: 'auto', padding: '4px 12px 12px', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />

              const pad = (n: number) => String(n).padStart(2, '0')
              const ds = `${year}-${pad(month + 1)}-${pad(day)}`
              const isToday    = ds === todayStr
              const isPast     = ds < todayStr
              const isSelected = ds === selectedStr
              const types      = [...new Set(planDatesMap[ds] || [])].slice(0, 3)
              const numStr     = lang === 'bn' ? toBnDigits(day) : String(day)

              return (
                <button
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 3,
                    padding: '7px 2px 6px', borderRadius: 12,
                    background: isSelected
                      ? 'var(--color-accent)'
                      : isToday
                      ? 'var(--color-accent-soft)'
                      : 'transparent',
                    border: isSelected
                      ? '2px solid var(--color-accent)'
                      : isToday
                      ? '1.5px solid var(--color-accent)'
                      : '1.5px solid transparent',
                    cursor: 'pointer',
                    opacity: isPast && !isSelected ? 0.4 : 1,
                    fontFamily: 'inherit',
                    minHeight: 52,
                  }}
                >
                  <span style={{
                    fontSize: 15, lineHeight: 1,
                    fontWeight: isToday || isSelected ? 800 : 500,
                    color: isSelected ? '#fff' : isToday ? 'var(--color-accent)' : 'var(--color-ink)',
                  }}>
                    {numStr}
                  </span>

                  {/* Event-type dots */}
                  {types.length > 0 && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {types.map(t => (
                        <div key={t} style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: isSelected ? 'rgba(255,255,255,0.8)' : (TYPE_COLORS[t] || 'var(--color-accent)'),
                          flexShrink: 0,
                        }} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Legend ── */}
        {usedTypes.length > 0 && (
          <div style={{
            padding: '10px 16px 18px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex', gap: 12, flexWrap: 'wrap', flexShrink: 0,
          }}>
            {usedTypes.filter(t => TYPE_COLORS[t]).map(t => {
              const [en, bn] = TYPE_LABELS[t] || [t, t]
              return (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[t], flexShrink: 0 }} />
                  {tr(en, bn)}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
