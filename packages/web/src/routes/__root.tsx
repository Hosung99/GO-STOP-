import { createRootRoute, createRoute, RootRoute } from '@tanstack/react-router'
import { App } from '../App'

const Root = new RootRoute({
  component: App,
})

const indexRoute = new Route({
  getParentRoute: () => Root,
  path: '/',
  lazy: async () => {
    const { LobbyPage } = await import('./index.lazy')
    return { component: LobbyPage }
  },
})

const roomRoute = new Route({
  getParentRoute: () => Root,
  path: '/room/$roomCode',
  lazy: async () => {
    const { RoomPage } = await import('./room.lazy')
    return { component: RoomPage }
  },
})

export const routeTree = Root.addChildren([indexRoute, roomRoute])
