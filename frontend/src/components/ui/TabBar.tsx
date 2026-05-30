import { ReactNode } from 'react'
import Icon from './Icon'

export interface TabItem {
  id: string
  label: string
  icon: string
}

interface TabBarProps {
  tabs: TabItem[]
  active: string
  onChange: (id: string) => void
  extra?: ReactNode
}

export default function TabBar({ tabs, active, onChange, extra }: TabBarProps) {
  return (
    <div className="tab-bar no-select">
      {tabs.map(tab => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '6px 16px 4px',
              background: 'none', border: 'none', cursor: 'pointer',
              position: 'relative', flex: 1, fontFamily: 'inherit',
            }}
          >
            {/* Active pill indicator */}
            {isActive && (
              <span style={{
                position: 'absolute', top: 4, left: '50%',
                transform: 'translateX(-50%)',
                width: 44, height: 34, borderRadius: 12,
                background: 'var(--color-accent-soft)',
                pointerEvents: 'none',
              }} />
            )}

            <span style={{
              position: 'relative', zIndex: 1, display: 'flex',
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.15s ease',
            }}>
              <Icon
                name={tab.icon}
                size={23}
                color={isActive ? 'var(--color-accent)' : 'var(--color-ink-mute)'}
              />
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, lineHeight: 1,
              position: 'relative', zIndex: 1,
              color: isActive ? 'var(--color-accent)' : 'var(--color-ink-mute)',
              transition: 'color 0.15s ease',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
      {extra}
    </div>
  )
}
