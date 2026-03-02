import { RootRoute, Route } from '@tanstack/react-router'
import { App } from '../App'
import { LobbyPage } from './index.lazy'
import { RoomPage } from './room.lazy'
import { GamePage } from './game.lazy'

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

const gameRoute = new Route({
  getParentRoute: () => Root,
  path: '/game',
  component: GamePage,
})

export const routeTree = Root.addChildren([indexRoute, roomRoute, gameRoute])
