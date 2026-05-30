import { ReactNode } from 'react'
import clsx from 'clsx'
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
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all',
            active === tab.id
              ? 'text-accent'
              : 'text-ink-mute',
          )}
        >
          <Icon
            name={tab.icon}
            size={22}
            className={clsx(
              'transition-transform',
              active === tab.id && 'scale-110',
            )}
          />
          <span className={clsx(
            'text-[11px] font-700 leading-none',
            active === tab.id ? 'text-accent' : 'text-ink-mute',
          )}>
            {tab.label}
          </span>
        </button>
      ))}
      {extra}
    </div>
  )
}
