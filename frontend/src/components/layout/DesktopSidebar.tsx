import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'

export interface SidebarItem {
  id: string
  label: string
  icon: string
}

interface DesktopSidebarProps {
  items: SidebarItem[]
  active: string
  onChange: (id: string) => void
  role: 'patient' | 'caregiver'
  onEmergency?: () => void
  onRecentChats?: () => void
}

export default function DesktopSidebar({ items, active, onChange, role, onEmergency, onRecentChats }: DesktopSidebarProps) {
  const { profile, signOut } = useAuth()
  const { tr } = useLang()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/welcome')
  }

  return (
    <aside className="desktop-sidebar">
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '20px 20px 18px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div>
          <img src="/logo.png" alt="Memory Mate" style={{ height: 32, display: 'block' }} />
          <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', fontWeight: 600, marginTop: 2 }}>
            {role === 'caregiver' ? tr('Caregiver Portal', 'কেয়ারগিভার') : tr('Patient Portal', 'রোগী পোর্টাল')}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map(item => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '11px 14px', borderRadius: 14,
                background: isActive ? 'var(--color-accent-soft)' : 'transparent',
                color: isActive ? 'var(--color-accent-dark)' : 'var(--color-ink-soft)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: isActive ? 700 : 600,
                textAlign: 'left', transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-warm)' }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: isActive ? 'var(--color-accent)' : 'var(--color-bg-warm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={item.icon} size={17} color={isActive ? '#fff' : 'var(--color-ink-soft)'} />
              </div>
              {item.label}
            </button>
          )
        })}

        {/* Emergency button — patient only */}
        {role === 'patient' && onEmergency && (
          <button
            onClick={onEmergency}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '11px 14px', borderRadius: 14,
              background: 'transparent',
              color: 'var(--color-danger)',
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
              textAlign: 'left', marginTop: 8,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-danger-soft)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="alert-triangle" size={17} color="var(--color-danger)" />
            </div>
            {tr('Emergency', 'জরুরি সাহায্য')}
          </button>
        )}

        {/* Recent Chats — patient only */}
        {role === 'patient' && onRecentChats && (
          <button
            onClick={onRecentChats}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '11px 14px', borderRadius: 14,
              background: 'transparent',
              color: 'var(--color-ink-soft)',
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
              textAlign: 'left', marginTop: 4,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-warm)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-bg-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="clock" size={17} color="var(--color-ink-soft)" />
            </div>
            {tr('Recent Chats', 'সাম্প্রতিক চ্যাট')}
          </button>
        )}
      </nav>

      {/* User footer */}
      <div style={{
        borderTop: '1px solid var(--color-border)',
        padding: '14px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Avatar name={profile?.name || 'U'} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.name || 'User'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-ink-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.email || ''}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          title={tr('Sign out', 'সাইন আউট')}
          style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'var(--color-bg-warm)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-ink-mute)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-danger-soft)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--color-danger)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-warm)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--color-ink-mute)'
          }}
        >
          <Icon name="log-out" size={15} color="currentColor" />
        </button>
      </div>
    </aside>
  )
}
