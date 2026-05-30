import clsx from 'clsx'

const COLORS = [
  ['#E89B4A', '#9C5A12'],
  ['#1E6E72', '#0E4145'],
  ['#7A5AE0', '#4C2E76'],
  ['#3771C8', '#1E4A87'],
  ['#2D8C4E', '#1A5530'],
  ['#C06B1C', '#7A3F0A'],
]

function getColor(name: string) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffff
  return COLORS[hash % COLORS.length]
}

interface AvatarProps {
  name: string
  size?: number
  className?: string
  src?: string
}

export default function Avatar({ name, size = 40, className, src }: AvatarProps) {
  const [bg, fg] = getColor(name)
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (src) {
    return (
      <div
        className={clsx('avatar no-select', className)}
        style={{ width: size, height: size, flexShrink: 0, overflow: 'hidden' }}
      >
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }
  return (
    <div
      className={clsx('avatar no-select', className)}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: size * 0.38,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}
