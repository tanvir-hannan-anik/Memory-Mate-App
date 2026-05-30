/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        'bg-warm': 'var(--color-bg-warm)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        ink: 'var(--color-ink)',
        'ink-soft': 'var(--color-ink-soft)',
        'ink-mute': 'var(--color-ink-mute)',
        accent: 'var(--color-accent)',
        'accent-soft': 'var(--color-accent-soft)',
        'accent-ink': 'var(--color-accent-ink)',
        good: 'var(--color-good)',
        'good-soft': 'var(--color-good-soft)',
        warn: 'var(--color-warn)',
        'warn-soft': 'var(--color-warn-soft)',
        danger: 'var(--color-danger)',
        'danger-soft': 'var(--color-danger-soft)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
      },
      borderRadius: {
        app: 'var(--radius)',
        'app-lg': 'var(--radius-lg)',
      },
      spacing: {
        touch: 'var(--touch)',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.08)', opacity: '0.7' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
        dot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulse: 'pulse 2.4s ease-in-out infinite',
        ripple: 'ripple 0.6s ease-out forwards',
        wave: 'wave 1.2s ease-in-out infinite',
        dot: 'dot 1.4s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
      },
    },
  },
  plugins: [],
}
