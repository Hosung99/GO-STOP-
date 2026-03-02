import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import type { ClientEventMap, ServerEventMap } from './socket/room-handlers.js'
import { setupSocketNamespace } from './socket/index.js'

export async function startServer(): Promise<void> {
  const app = express()
  const httpServer = createServer(app)
  const io = new SocketIOServer<ClientEventMap, ServerEventMap>(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  })

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  setupSocketNamespace(io)

  const PORT = Number(process.env.PORT ?? 3000)
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.info(`Server running on 0.0.0.0:${PORT}`)
  })
}
