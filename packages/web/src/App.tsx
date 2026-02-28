import { Outlet } from '@tanstack/react-router'

export function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Outlet />
    </div>
  )
}
