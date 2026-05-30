import { ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
}

// Mobile-only wrapper — hidden on desktop via CSS (.app-shell { display: none } at ≥768px)
export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      {children}
    </div>
  )
}
