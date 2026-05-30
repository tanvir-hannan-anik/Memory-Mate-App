import { InputHTMLAttributes, ReactNode } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: ReactNode
  error?: string
}

// Matches prototype Field component:
// surface bg box with 1.5px border, 14px radius, icon + [label UPPERCASE / value] stacked
export default function Field({ label, icon, error, ...props }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: 'var(--radius-field)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onFocusCapture={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--color-accent)'
          el.style.boxShadow = '0 0 0 3px var(--color-accent-soft)'
        }}
        onBlurCapture={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--color-border)'
          el.style.boxShadow = 'none'
        }}
      >
        {icon && (
          <span style={{ color: 'var(--color-ink-mute)', flexShrink: 0, display: 'flex' }}>
            {icon}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {label && (
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--color-ink-mute)',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              marginBottom: '2px',
              lineHeight: 1,
            }}>
              {label}
            </div>
          )}
          <input
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontFamily: 'var(--font-body)',
              fontSize: '17px',
              fontWeight: 600,
              color: 'var(--color-ink)',
              width: '100%',
              padding: 0,
              margin: 0,
            }}
            {...props}
          />
        </div>
      </div>
      {error && (
        <p style={{ fontSize: '12px', color: 'var(--color-danger)', paddingLeft: '4px' }}>{error}</p>
      )}
    </div>
  )
}
