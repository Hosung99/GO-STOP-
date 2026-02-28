import { RootRoute, Route } from '@tanstack/react-router'
import { App } from '../App'
import { LobbyPage } from './index.lazy'
import { RoomPage } from './room.lazy'

const Root = new RootRoute({
  component: App,
})

const indexRoute = new Route({
  getParentRoute: () => Root,
  path: '/',
  component: LobbyPage,
})

const roomRoute = new Route({
  getParentRoute: () => Root,
  path: '/room/$roomCode',
  component: RoomPage,
})

export const routeTree = Root.addChildren([indexRoute, roomRoute])
