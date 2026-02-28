import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import type { ClientEvent, ServerEvent } from '@go-stop/shared'
import { setupSocketNamespace } from './socket/index'

export async function startServer(): Promise<void> {
  const app = express()
  const httpServer = createServer(app)
  const io = new SocketIOServer<ClientEvent, ServerEvent>(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  })

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  setupSocketNamespace(io)

  const PORT = process.env.PORT ?? 3000
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}
