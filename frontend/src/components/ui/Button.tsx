import { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'ghost' | 'soft' | 'danger' | 'plain'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  full?: boolean
  icon?: ReactNode
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  full = false,
  icon,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'btn',
        `btn-${variant}`,
        full && 'btn-full',
        className,
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
