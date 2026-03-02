import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routes/__root'
import { initializeSocket } from './services/socket'
import { attachSocketListeners } from './services/socket-listeners'
import './styles/index.css'

const socket = initializeSocket(import.meta.env.VITE_API_URL as string)

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

attachSocketListeners(socket, router)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
