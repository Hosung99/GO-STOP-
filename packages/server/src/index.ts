import { startServer } from './server'

startServer().catch((error: unknown) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
