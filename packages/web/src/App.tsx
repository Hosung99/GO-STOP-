import { Outlet } from '@tanstack/react-router'
import { AuthGate } from './components/AuthGate'
import { ToastContainer } from './components/ToastContainer'

export function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <AuthGate>
        <Outlet />
      </AuthGate>
      <ToastContainer />
    </div>
  )
}
