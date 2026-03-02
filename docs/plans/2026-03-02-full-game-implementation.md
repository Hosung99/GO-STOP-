# Go-Stop Full Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a fully playable real-time Go-Stop card game — from entering a name through lobby, room, and game — across both the Node.js backend and React frontend.

**Architecture:** Server-authoritative model. Backend holds all game state in `GameEngine`; frontend receives sanitized `ClientGameState` via Socket.io events. Zustand stores on the frontend mirror the server's state. All game logic lives on the server; the client only sends actions and renders results.

**Tech Stack:** Node.js + Express + Socket.io (backend) · React 18 + TanStack Router + Zustand (frontend) · `@go-stop/shared` for all shared types, events, scoring, FSM

---

## Overview of phases

| Phase | Scope | Files |
|---|---|---|
| A | Backend: socket auth + room handlers | `server/src/socket/` |
| B | Backend: GameEngine methods + Sanitizer | `server/src/game/` |
| C | Frontend: room store + socket listeners | `web/src/stores/` `web/src/services/` |
| D | Frontend: Auth + Lobby + Room pages | `web/src/routes/` `web/src/components/` |
| E | Frontend: Game page + Card components | `web/src/routes/` `web/src/components/game/` |

Phases A+B and C+D+E are independent — backend and frontend agents can work in parallel after agreeing on the event contract (already defined in `@go-stop/shared`).

---

## Phase A — Backend: Socket Auth + Room Handlers

### Task A1: Attach playerId to every socket

**Files:**
- Modify: `packages/server/src/socket/index.ts`

Socket.io doesn't have built-in auth. We assign `socket.id` as the player's `playerId` for MVP (no JWT yet). Attach it as a property on the socket for easy access in all handlers.

**Step 1: Replace the skeleton socket handler**

```typescript
// packages/server/src/socket/index.ts
import type { Server as SocketIOServer, Socket } from 'socket.io'
import type { ClientEvent, ServerEvent } from '@go-stop/shared'
import { RoomManager } from '../room/room-manager.js'
import { handleRoomEvents } from './room-handlers.js'

const roomManager = new RoomManager()

export function setupSocketNamespace(
  io: SocketIOServer<ClientEvent, ServerEvent>,
): void {
  io.on('connection', (socket) => {
    const playerId = socket.id

    handleRoomEvents(socket, io, roomManager, playerId)

    socket.on('disconnect', () => {
      // future: mark player disconnected in room
    })
  })
}
```

**Step 2: Typecheck**
```bash
pnpm typecheck
```
Expected: no errors

**Step 3: Commit**
```bash
git add packages/server/src/socket/index.ts
git commit -m "[Backend] refactor: wire RoomManager into socket namespace"
```

---

### Task A2: Room event handlers (create, join, leave, ready)

**Files:**
- Create: `packages/server/src/socket/room-handlers.ts`

**Step 1: Create room-handlers.ts**

```typescript
// packages/server/src/socket/room-handlers.ts
import type { Server as SocketIOServer, Socket } from 'socket.io'
import type { ClientEvent, ServerEvent } from '@go-stop/shared'
import type { RoomManager } from '../room/room-manager.js'

function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

export function handleRoomEvents(
  socket: Socket<ClientEvent, ServerEvent>,
  io: SocketIOServer<ClientEvent, ServerEvent>,
  roomManager: RoomManager,
  playerId: string,
): void {

  // room:create
  socket.on('room:create', ({ payload }) => {
    try {
      const code = generateRoomCode()
      const room = roomManager.createRoom(code, payload.maxPlayers, payload.isPrivate, playerId)
      room.addPlayer({
        id: playerId,
        name: payload.playerName,
        isReady: false,
        isConnected: true,
        isHost: true,
        socketId: socket.id,
      })
      socket.join(code)
      socket.emit('room:created', { payload: { roomCode: code, room: room.toState() } })
    } catch {
      socket.emit('error:room', { payload: { message: 'Failed to create room', code: 'CREATE_FAILED' } })
    }
  })

  // room:join
  socket.on('room:join', ({ payload }) => {
    try {
      const room = roomManager.getRoom(payload.roomCode)
      if (!room) {
        socket.emit('error:room', { payload: { message: 'Room not found', code: 'ROOM_NOT_FOUND' } })
        return
      }
      room.addPlayer({
        id: playerId,
        name: payload.playerName,
        isReady: false,
        isConnected: true,
        isHost: false,
        socketId: socket.id,
      })
      socket.join(payload.roomCode)
      socket.emit('room:joined', { payload: { room: room.toState(), playerId } })
      socket.to(payload.roomCode).emit('room:player_joined', {
        payload: { player: room.getPlayer(playerId) },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Join failed'
      socket.emit('error:room', { payload: { message, code: 'JOIN_FAILED' } })
    }
  })

  // room:leave
  socket.on('room:leave', ({ payload }) => {
    const room = roomManager.getRoom(payload.roomCode)
    if (!room) return
    room.removePlayer(playerId)
    socket.leave(payload.roomCode)
    io.to(payload.roomCode).emit('room:player_left', { payload: { playerId } })
    if (room.isEmpty()) roomManager.deleteRoom(payload.roomCode)
  })

  // room:ready
  socket.on('room:ready', ({ payload }) => {
    const room = roomManager.getRoom(payload.roomCode)
    if (!room) return
    room.setReady(playerId, payload.ready)
    io.to(payload.roomCode).emit('room:player_ready', {
      payload: { playerId, ready: payload.ready },
    })
  })
}
```

**Step 2: Typecheck**
```bash
pnpm typecheck
```

**Step 3: Commit**
```bash
git add packages/server/src/socket/room-handlers.ts
git commit -m "[Backend] feat: implement room create/join/leave/ready socket handlers"
```

---

### Task A3: room:start handler + GameEngine integration

**Files:**
- Modify: `packages/server/src/socket/room-handlers.ts`
- Modify: `packages/server/src/socket/index.ts` (add game engine map)

The `roomManager` singleton needs a companion `Map<string, GameEngine>` to track active games. Add this to `index.ts` and pass it to handlers.

**Step 1: Add game engine map to index.ts**

```typescript
// packages/server/src/socket/index.ts — add after roomManager
import { GameEngine } from '../game/engine.js'

const games = new Map<string, GameEngine>()

export function setupSocketNamespace(...): void {
  io.on('connection', (socket) => {
    const playerId = socket.id
    handleRoomEvents(socket, io, roomManager, games, playerId)
    // ...
  })
}
```

**Step 2: Add room:start to room-handlers.ts**

```typescript
// Add games: Map<string, GameEngine> parameter to handleRoomEvents signature
// Add this handler inside the function:

socket.on('room:start', ({ payload }) => {
  const room = roomManager.getRoom(payload.roomCode)
  if (!room) return
  if (room.hostId !== playerId) {
    socket.emit('error:room', { payload: { message: 'Only host can start', code: 'NOT_HOST' } })
    return
  }
  if (!room.canStart()) {
    socket.emit('error:room', { payload: { message: 'Not all players ready', code: 'NOT_READY' } })
    return
  }

  const players = room.getPlayers()
  const playerCount = players.length as 2 | 3
  const playerIds = players.map((p) => p.id)

  const engine = new GameEngine(payload.roomCode, playerIds, playerCount)
  games.set(payload.roomCode, engine)

  // Send each player their own hand
  const state = engine.getState()
  players.forEach((player) => {
    const playerSocket = io.sockets.sockets.get(player.socketId ?? '')
    if (!playerSocket) return
    const myPlayer = state.players.find((p) => p.id === player.id)
    if (!myPlayer) return
    playerSocket.emit('game:dealt', {
      payload: {
        hand: myPlayer.hand as HwaTuCard[],
        fieldCards: state.fieldCards as HwaTuCard[],
        deckCount: state.deck.length,
      },
    })
  })

  io.to(payload.roomCode).emit('game:started', { payload: { gameState: null } })
  io.to(payload.roomCode).emit('game:turn_start', {
    payload: {
      currentPlayerId: state.players[0]?.id ?? '',
      timeLimit: 30000,
    },
  })
})
```

**Step 3: Typecheck + commit**
```bash
pnpm typecheck
git add packages/server/src/socket/
git commit -m "[Backend] feat: implement room:start, deal cards, emit game:started"
```

---

## Phase B — Backend: GameEngine Methods + Sanitizer

### Task B1: Add game action methods to GameEngine

**Files:**
- Modify: `packages/server/src/game/engine.ts`

The engine needs methods for each game action. Start with the core turn flow.

**Step 1: Add playCard method**

```typescript
// Inside GameEngine class, add:

playCard(playerId: string, cardId: string): {
  matchOptions: readonly HwaTuCard[]
  isBomb: boolean
} {
  const player = this.state.players.find((p) => p.id === playerId)
  if (!player) throw new Error('PLAYER_NOT_FOUND')

  const card = player.hand.find((c) => c.id === cardId)
  if (!card) throw new Error('CARD_NOT_IN_HAND')

  const matches = findFieldMatches(card, this.state.fieldCards)
  const matchCount = getMatchCount(card, this.state.fieldCards)
  const bomb = isBomb(matchCount)

  // Remove card from hand
  const newHand = player.hand.filter((c) => c.id !== cardId)
  const updatedPlayer = { ...player, hand: newHand }
  const updatedPlayers = this.state.players.map((p) =>
    p.id === playerId ? updatedPlayer : p,
  )

  const newPhase: GamePhase = matches.length > 1
    ? { phase: 'TURN_CHOOSE_FIELD_CARD', currentPlayerId: playerId, matchOptions: matches.map((c) => c.id), timeoutAt: Date.now() + 30000 }
    : { phase: 'TURN_FLIP_DECK', currentPlayerId: playerId, timeoutAt: Date.now() + 30000 }

  // If 1 match: auto-capture, go to TURN_FLIP_DECK
  // If 0 matches: place on field, go to TURN_FLIP_DECK
  let newFieldCards = this.state.fieldCards
  const newCaptured = { ...player.captured }

  if (matches.length === 0) {
    newFieldCards = [...this.state.fieldCards, card]
  } else if (matches.length === 1) {
    const match = matches[0]!
    newFieldCards = this.state.fieldCards.filter((c) => c.id !== match.id)
    const captureKey = getCaptureKey(card)
    newCaptured[captureKey] = [...(player.captured[captureKey] as HwaTuCard[]), card, match]
  }

  this.state = {
    ...this.state,
    players: updatedPlayers.map((p) =>
      p.id === playerId ? { ...p, captured: newCaptured } : p,
    ),
    fieldCards: newFieldCards,
    phase: newPhase,
    turnContext: matches.length > 1 ? { type: 'CARD_CHOICE', playedCard: card, matchingFieldCards: matches } : null,
  }

  return { matchOptions: matches, isBomb: bomb }
}
```

> Note: Import `findFieldMatches`, `getMatchCount`, `isBomb` from `@go-stop/shared`. Add `getCaptureKey` helper that maps `CardType` to `keyof CapturedCards`.

**Step 2: Add flipDeck method**

```typescript
flipDeck(playerId: string): {
  flippedCard: HwaTuCard
  matchOptions: readonly HwaTuCard[]
} {
  const [flippedCard, ...remainingDeck] = this.state.deck
  if (!flippedCard) throw new Error('DECK_EMPTY')

  const matches = findFieldMatches(flippedCard, this.state.fieldCards)

  const newPhase: GamePhase = matches.length > 1
    ? { phase: 'TURN_CHOOSE_FLIP_MATCH', currentPlayerId: playerId, matchOptions: matches.map((c) => c.id), timeoutAt: Date.now() + 30000 }
    : { phase: 'TURN_RESOLVE_CAPTURE', currentPlayerId: playerId }

  this.state = {
    ...this.state,
    deck: remainingDeck,
    phase: newPhase,
    turnContext: matches.length > 1 ? { type: 'CARD_CHOICE', playedCard: flippedCard, matchingFieldCards: matches } : null,
  }

  return { flippedCard, matchOptions: matches }
}
```

**Step 3: Add advanceTurn + checkScore methods**

```typescript
advanceTurn(): void {
  const nextIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length
  this.state = {
    ...this.state,
    currentPlayerIndex: nextIndex,
    phase: {
      phase: 'TURN_PLAY_CARD',
      currentPlayerId: this.state.players[nextIndex]?.id ?? '',
      timeoutAt: Date.now() + 30000,
    },
    turnContext: null,
  }
}

checkScore(playerId: string): { score: ScoreBreakdown; canGoStop: boolean } {
  const player = this.state.players.find((p) => p.id === playerId)
  if (!player) throw new Error('PLAYER_NOT_FOUND')
  const score = calculateScore(player.captured)
  const playerCount = this.state.players.length as 2 | 3
  const canGoStop = canDeclareGoStop(score.finalPoints, playerCount)
  return { score, canGoStop }
}
```

**Step 4: Typecheck**
```bash
pnpm typecheck
```

**Step 5: Commit**
```bash
git add packages/server/src/game/engine.ts
git commit -m "[Backend] feat: add playCard, flipDeck, advanceTurn, checkScore to GameEngine"
```

---

### Task B2: Game socket handlers

**Files:**
- Create: `packages/server/src/socket/game-handlers.ts`

**Step 1: Create game-handlers.ts**

```typescript
// packages/server/src/socket/game-handlers.ts
import type { Server as SocketIOServer, Socket } from 'socket.io'
import type { ClientEvent, ServerEvent } from '@go-stop/shared'
import type { GameEngine } from '../game/engine.js'

export function handleGameEvents(
  socket: Socket<ClientEvent, ServerEvent>,
  io: SocketIOServer<ClientEvent, ServerEvent>,
  games: Map<string, GameEngine>,
  playerId: string,
): void {

  // Helper: find which room this socket is in
  function getPlayerRoom(): string | undefined {
    return [...socket.rooms].find((r) => r !== socket.id)
  }

  socket.on('game:play_card', ({ payload }) => {
    const roomCode = getPlayerRoom()
    if (!roomCode) return
    const engine = games.get(roomCode)
    if (!engine) return

    try {
      const { matchOptions } = engine.playCard(playerId, payload.cardId)
      const state = engine.getState()
      const playedCard = state.players
        .flatMap((p) => p.captured.gwang.concat(p.captured.animal, p.captured.ribbon, p.captured.pi))
        .find(() => true) // simplified — emit the event

      io.to(roomCode).emit('game:card_played', {
        payload: {
          playerId,
          card: state.players.find(p => p.id === playerId)?.hand[0] ?? { id: payload.cardId, month: 1, index: 0, type: 'junk', name: '' },
          matchOptions: matchOptions as any,
        },
      })

      if (matchOptions.length <= 1) {
        // auto-resolved, flip deck
        const { flippedCard, matchOptions: flipMatches } = engine.flipDeck(playerId)
        io.to(roomCode).emit('game:deck_flipped', {
          payload: { card: flippedCard, matchOptions: flipMatches },
        })
        if (flipMatches.length <= 1) {
          resolveCapture(engine, roomCode, playerId, io, games)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid action'
      socket.emit('error:game', { payload: { message: msg, code: 'INVALID_ACTION' } })
    }
  })

  socket.on('game:declare_go', () => {
    const roomCode = getPlayerRoom()
    if (!roomCode) return
    const engine = games.get(roomCode)
    if (!engine) return
    engine.declareGo(playerId)
    io.to(roomCode).emit('game:go_declared', {
      payload: { playerId, goCount: engine.getState().players.find(p => p.id === playerId)?.goCount ?? 0 },
    })
    engine.advanceTurn()
    const state = engine.getState()
    io.to(roomCode).emit('game:turn_start', {
      payload: { currentPlayerId: state.players[state.currentPlayerIndex]?.id ?? '', timeLimit: 30000 },
    })
  })

  socket.on('game:declare_stop', () => {
    const roomCode = getPlayerRoom()
    if (!roomCode) return
    const engine = games.get(roomCode)
    if (!engine) return
    const { score } = engine.checkScore(playerId)
    io.to(roomCode).emit('game:round_end', {
      payload: {
        winner: playerId,
        scoreBreakdown: score,
        finalScore: score.finalPoints,
        multipliers: score.multipliers,
      },
    })
    games.delete(roomCode)
  })
}

function resolveCapture(
  engine: GameEngine,
  roomCode: string,
  playerId: string,
  io: SocketIOServer<ClientEvent, ServerEvent>,
  games: Map<string, GameEngine>,
): void {
  const { score, canGoStop } = engine.checkScore(playerId)
  if (canGoStop) {
    io.to(roomCode).emit('game:score_check', {
      payload: { playerId, score: score.finalPoints, breakdown: score, canGoStop: true },
    })
  } else {
    engine.advanceTurn()
    const state = engine.getState()
    io.to(roomCode).emit('game:turn_start', {
      payload: { currentPlayerId: state.players[state.currentPlayerIndex]?.id ?? '', timeLimit: 30000 },
    })
  }
}
```

**Step 2: Wire into index.ts**

```typescript
// Add to setupSocketNamespace connection handler:
import { handleGameEvents } from './game-handlers.js'

handleGameEvents(socket, io, games, playerId)
```

**Step 3: Typecheck + commit**
```bash
pnpm typecheck
git add packages/server/src/socket/
git commit -m "[Backend] feat: add game socket handlers (play_card, go, stop)"
```

---

## Phase C — Frontend: Room Store + Socket Listeners

### Task C1: Add room store

**Files:**
- Create: `packages/web/src/stores/room-store.ts`

```typescript
// packages/web/src/stores/room-store.ts
import { create } from 'zustand'
import type { RoomState } from '@go-stop/shared'

interface RoomStoreState {
  readonly room: RoomState | null
  readonly myPlayerId: string | null
  setRoom: (room: RoomState) => void
  setMyPlayerId: (id: string) => void
  updatePlayerReady: (playerId: string, ready: boolean) => void
  playerLeft: (playerId: string) => void
  clearRoom: () => void
}

export const useRoomStore = create<RoomStoreState>((set) => ({
  room: null,
  myPlayerId: null,
  setRoom: (room) => set({ room }),
  setMyPlayerId: (myPlayerId) => set({ myPlayerId }),
  updatePlayerReady: (playerId, ready) =>
    set((state) => ({
      room: state.room
        ? {
            ...state.room,
            players: state.room.players.map((p) =>
              p.id === playerId ? { ...p, isReady: ready } : p,
            ),
          }
        : null,
    })),
  playerLeft: (playerId) =>
    set((state) => ({
      room: state.room
        ? {
            ...state.room,
            players: state.room.players.filter((p) => p.id !== playerId),
          }
        : null,
    })),
  clearRoom: () => set({ room: null, myPlayerId: null }),
}))

export const selectIsHost = (state: RoomStoreState) =>
  state.room?.hostId === state.myPlayerId
```

**Step 2: Typecheck + commit**
```bash
pnpm typecheck
git add packages/web/src/stores/room-store.ts
git commit -m "[Frontend] feat: add room Zustand store"
```

---

### Task C2: Socket event listener service

**Files:**
- Create: `packages/web/src/services/socket-listeners.ts`

This module subscribes to all server events and updates Zustand stores. Call it once after socket is initialized.

```typescript
// packages/web/src/services/socket-listeners.ts
import type { Socket } from 'socket.io-client'
import type { ClientEvent, ServerEvent, ClientGameState, RoomState } from '@go-stop/shared'
import { useRoomStore } from '../stores/room-store'
import { useGameStore } from '../stores/game-store'
import { useUIStore } from '../stores/ui-store'

export function attachSocketListeners(
  socket: Socket<ServerEvent, ClientEvent>,
): void {
  // Room events
  socket.on('room:created', ({ payload }) => {
    useRoomStore.getState().setRoom(payload.room as RoomState)
  })

  socket.on('room:joined', ({ payload }) => {
    useRoomStore.getState().setRoom(payload.room as RoomState)
    useRoomStore.getState().setMyPlayerId(payload.playerId)
  })

  socket.on('room:player_joined', ({ payload }) => {
    const { room } = useRoomStore.getState()
    if (!room) return
    useRoomStore.getState().setRoom({
      ...room,
      players: [...room.players, payload.player as any],
    })
  })

  socket.on('room:player_left', ({ payload }) => {
    useRoomStore.getState().playerLeft(payload.playerId)
  })

  socket.on('room:player_ready', ({ payload }) => {
    useRoomStore.getState().updatePlayerReady(payload.playerId, payload.ready)
  })

  // Game events
  socket.on('game:dealt', ({ payload }) => {
    useGameStore.getState().setGameState({
      phase: { phase: 'DEALING', roundNumber: 1 },
      roomCode: useRoomStore.getState().room?.code ?? '',
      players: [],
      myHand: payload.hand,
      fieldCards: payload.fieldCards,
      deckCount: payload.deckCount,
      currentPlayerIndex: 0,
      turnTimeRemaining: 0,
      nagariCount: 0,
      roundNumber: 1,
    } as ClientGameState)
  })

  socket.on('game:turn_start', ({ payload }) => {
    useGameStore.getState().setGameState({
      ...useGameStore.getState().gameState!,
      phase: {
        phase: 'TURN_PLAY_CARD',
        currentPlayerId: payload.currentPlayerId,
        timeoutAt: Date.now() + payload.timeLimit,
      },
    })
  })

  socket.on('game:score_check', ({ payload }) => {
    if (payload.canGoStop) {
      useUIStore.getState().openModal('goStop')
    }
  })

  socket.on('game:round_end', ({ payload }) => {
    useUIStore.getState().addToast(
      `라운드 종료! 승자: ${payload.winner ?? '없음'} (${payload.finalScore}점)`,
      'success',
    )
    useGameStore.getState().clearGameState()
  })

  // Errors
  socket.on('error:room', ({ payload }) => {
    useUIStore.getState().addToast(payload.message, 'error')
  })

  socket.on('error:game', ({ payload }) => {
    useUIStore.getState().addToast(payload.message, 'error')
  })
}
```

**Step 2: Wire into main.tsx**

```typescript
// packages/web/src/main.tsx — add after initializeSocket:
import { attachSocketListeners } from './services/socket-listeners'

const socket = initializeSocket(import.meta.env.VITE_API_URL as string)
attachSocketListeners(socket)
```

**Step 3: Typecheck + commit**
```bash
pnpm typecheck
git add packages/web/src/services/socket-listeners.ts packages/web/src/main.tsx
git commit -m "[Frontend] feat: attach socket event listeners to Zustand stores"
```

---

## Phase D — Frontend: Auth + Lobby + Room Pages

### Task D1: Auth page (enter player name)

**Files:**
- Create: `packages/web/src/components/AuthGate.tsx`
- Modify: `packages/web/src/routes/__root.tsx`

```typescript
// packages/web/src/components/AuthGate.tsx
import { useState } from 'react'
import { useAuthStore } from '../stores/auth-store'

export function AuthGate({ children }: { children: React.ReactNode }): JSX.Element {
  const { isAuthenticated, setGuestUser } = useAuthStore()
  const [name, setName] = useState('')

  if (isAuthenticated) return <>{children}</>

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-slate-800 p-8 rounded-xl w-80">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">🎴 고스톱</h1>
        <input
          className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-green-500"
          placeholder="닉네임 입력"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && setGuestUser(name.trim())}
          maxLength={12}
        />
        <button
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg disabled:opacity-40"
          disabled={!name.trim()}
          onClick={() => setGuestUser(name.trim())}
        >
          게임 시작
        </button>
      </div>
    </div>
  )
}
```

**Modify `__root.tsx`** to wrap `<Outlet />` with `<AuthGate>`.

**Step 2: Commit**
```bash
git add packages/web/src/components/AuthGate.tsx packages/web/src/routes/__root.tsx
git commit -m "[Frontend] feat: add AuthGate component for player name entry"
```

---

### Task D2: Lobby page (create/join room)

**Files:**
- Modify: `packages/web/src/routes/index.lazy.tsx`

```typescript
// packages/web/src/routes/index.lazy.tsx
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../stores/auth-store'
import { useRoomStore } from '../stores/room-store'
import { getSocket } from '../services/socket'

export function LobbyPage(): JSX.Element {
  const [roomCode, setRoomCode] = useState('')
  const [maxPlayers, setMaxPlayers] = useState<2 | 3>(2)
  const { playerName } = useAuthStore()
  const { setMyPlayerId } = useRoomStore()
  const navigate = useNavigate()

  function createRoom(): void {
    const socket = getSocket()
    if (!socket || !playerName) return
    setMyPlayerId(socket.id)
    socket.emit('room:create', {
      payload: { playerName, maxPlayers, isPrivate: false },
    })
    // navigation handled by socket listener (room:created → navigate to /room/:code)
  }

  function joinRoom(): void {
    const socket = getSocket()
    if (!socket || !playerName || !roomCode.trim()) return
    setMyPlayerId(socket.id)
    socket.emit('room:join', {
      payload: { roomCode: roomCode.trim().toUpperCase(), playerName },
    })
  }

  return (
    <div className="flex items-center justify-center min-h-screen gap-8 flex-col">
      <h1 className="text-4xl font-bold text-white">🎴 고스톱 로비</h1>
      <p className="text-gray-400">안녕하세요, {playerName}님</p>

      <div className="bg-slate-800 rounded-xl p-8 w-96 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white">방 만들기</h2>
        <div className="flex gap-2">
          {([2, 3] as const).map((n) => (
            <button
              key={n}
              onClick={() => setMaxPlayers(n)}
              className={`flex-1 py-2 rounded-lg font-bold ${maxPlayers === n ? 'bg-green-600 text-white' : 'bg-slate-700 text-gray-300'}`}
            >
              {n}인
            </button>
          ))}
        </div>
        <button
          onClick={createRoom}
          className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg"
        >
          방 만들기
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl p-8 w-96 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white">방 참가</h2>
        <input
          className="bg-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
          placeholder="방 코드 입력"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          maxLength={5}
        />
        <button
          onClick={joinRoom}
          disabled={!roomCode.trim()}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg disabled:opacity-40"
        >
          참가하기
        </button>
      </div>
    </div>
  )
}
```

**Add navigation in socket-listeners.ts:** After `room:created` and `room:joined`, navigate to `/room/$roomCode`. Pass a `navigate` callback or use the router directly.

**Step 2: Commit**
```bash
git add packages/web/src/routes/index.lazy.tsx
git commit -m "[Frontend] feat: implement lobby page with create/join room"
```

---

### Task D3: Room page (players, ready, start)

**Files:**
- Modify: `packages/web/src/routes/room.lazy.tsx`
- Modify: `packages/web/src/routes/__root.tsx` (fix route params)

```typescript
// packages/web/src/routes/room.lazy.tsx
import { useRoomStore, selectIsHost } from '../stores/room-store'
import { useAuthStore } from '../stores/auth-store'
import { getSocket } from '../services/socket'

export function RoomPage(): JSX.Element {
  const { room, myPlayerId } = useRoomStore()
  const isHost = useRoomStore(selectIsHost)
  const { playerName } = useAuthStore()

  function toggleReady(): void {
    const socket = getSocket()
    if (!socket || !room) return
    const me = room.players.find((p) => p.id === myPlayerId)
    socket.emit('room:ready', { payload: { roomCode: room.code, ready: !me?.isReady } })
  }

  function startGame(): void {
    const socket = getSocket()
    if (!socket || !room) return
    socket.emit('room:start', { payload: { roomCode: room.code } })
  }

  if (!room) return <div className="text-white text-center mt-20">방 정보 로딩 중...</div>

  const allReady = room.players.length >= 2 && room.players.every((p) => p.isReady)

  return (
    <div className="flex flex-col items-center min-h-screen p-8 gap-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white">방 코드: {room.code}</h2>
        <p className="text-gray-400">{room.players.length} / {room.maxPlayers}명</p>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md flex flex-col gap-3">
        {room.players.map((player) => (
          <div key={player.id} className="flex items-center justify-between bg-slate-700 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{player.name}</span>
              {player.isHost && <span className="text-yellow-400 text-sm">👑</span>}
              {player.id === myPlayerId && <span className="text-blue-400 text-sm">(나)</span>}
            </div>
            <span className={`text-sm font-bold ${player.isReady ? 'text-green-400' : 'text-gray-400'}`}>
              {player.isReady ? '준비 완료' : '대기 중'}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button
          onClick={toggleReady}
          className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3 rounded-lg"
        >
          준비 {room.players.find((p) => p.id === myPlayerId)?.isReady ? '취소' : '완료'}
        </button>
        {isHost && (
          <button
            onClick={startGame}
            disabled={!allReady}
            className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-8 py-3 rounded-lg disabled:opacity-40"
          >
            게임 시작
          </button>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**
```bash
git add packages/web/src/routes/room.lazy.tsx
git commit -m "[Frontend] feat: implement room page with player list, ready, start"
```

---

## Phase E — Frontend: Game Page + Card Components

### Task E1: Card component

**Files:**
- Create: `packages/web/src/components/game/Card.tsx`

```typescript
// packages/web/src/components/game/Card.tsx
import type { HwaTuCard } from '@go-stop/shared'

const TYPE_COLORS: Record<string, string> = {
  gwang: 'from-yellow-700 to-yellow-500 border-yellow-400',
  animal: 'from-green-800 to-green-600 border-green-400',
  ribbon: 'from-red-800 to-red-600 border-red-400',
  junk: 'from-slate-700 to-slate-600 border-slate-400',
  double_junk: 'from-slate-700 to-slate-500 border-blue-400',
}

interface CardProps {
  card: HwaTuCard
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
  small?: boolean
}

export function Card({ card, selected, onClick, disabled, small }: CardProps): JSX.Element {
  const colors = TYPE_COLORS[card.type] ?? TYPE_COLORS.junk
  const size = small ? 'w-10 h-14 text-xs' : 'w-16 h-24 text-sm'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${size} rounded-lg border-2 bg-gradient-to-b ${colors}
        flex flex-col items-center justify-between p-1
        transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
        ${selected ? 'ring-2 ring-white scale-110 -translate-y-2' : ''}
      `}
    >
      <span className="text-white font-bold">{card.month}월</span>
      <span className="text-gray-200 text-center leading-tight">{card.name}</span>
      <span className="text-gray-300 text-xs">{card.type[0]?.toUpperCase()}</span>
    </button>
  )
}
```

**Step 2: Commit**
```bash
git add packages/web/src/components/game/Card.tsx
git commit -m "[Frontend] feat: add Card component with type-based styling"
```

---

### Task E2: Game page

**Files:**
- Create: `packages/web/src/routes/game.lazy.tsx`
- Modify: `packages/web/src/routes/__root.tsx` (add /game route)

```typescript
// packages/web/src/routes/game.lazy.tsx
import { useState } from 'react'
import { useGameStore } from '../stores/game-store'
import { useRoomStore } from '../stores/room-store'
import { useUIStore } from '../stores/ui-store'
import { getSocket } from '../services/socket'
import { Card } from '../components/game/Card'
import type { HwaTuCard } from '@go-stop/shared'

export function GamePage(): JSX.Element {
  const { gameState } = useGameStore()
  const { myPlayerId } = useRoomStore()
  const { modals, closeModal } = useUIStore()
  const [selectedCard, setSelectedCard] = useState<HwaTuCard | null>(null)

  if (!gameState) {
    return <div className="text-white text-center mt-20 text-xl">게임 로딩 중...</div>
  }

  const isMyTurn =
    gameState.phase.phase === 'TURN_PLAY_CARD' &&
    gameState.phase.currentPlayerId === myPlayerId

  function playCard(): void {
    if (!selectedCard) return
    getSocket()?.emit('game:play_card', { payload: { cardId: selectedCard.id } })
    setSelectedCard(null)
  }

  function declareGo(): void {
    getSocket()?.emit('game:declare_go', { payload: {} })
    closeModal('goStop')
  }

  function declareStop(): void {
    getSocket()?.emit('game:declare_stop', { payload: {} })
    closeModal('goStop')
  }

  return (
    <div className="min-h-screen flex flex-col gap-4 p-4">
      {/* Other players' info */}
      <div className="flex gap-4 justify-center">
        {gameState.players
          .filter((p) => p.id !== myPlayerId)
          .map((p) => (
            <div key={p.id} className="bg-slate-800 rounded-lg p-3 text-center min-w-24">
              <div className="text-white font-bold text-sm">{p.name}</div>
              <div className="text-gray-400 text-xs">{p.handCount}장</div>
              <div className="text-yellow-400 text-xs">{p.score}점</div>
            </div>
          ))}
      </div>

      {/* Field cards */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-slate-900 rounded-xl p-6 min-h-36">
          <p className="text-gray-400 text-sm mb-3 text-center">바닥패 · 덱: {gameState.deckCount}장</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {gameState.fieldCards.map((card) => (
              <Card key={card.id} card={card} small />
            ))}
            {gameState.fieldCards.length === 0 && (
              <p className="text-gray-600">바닥패 없음</p>
            )}
          </div>
        </div>
      </div>

      {/* My hand */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-400 text-sm">내 패 ({gameState.myHand.length}장)</p>
          {isMyTurn && selectedCard && (
            <button
              onClick={playCard}
              className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-1 rounded-lg text-sm"
            >
              내기
            </button>
          )}
          {isMyTurn && !selectedCard && (
            <span className="text-green-400 text-sm font-bold animate-pulse">내 차례!</span>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {gameState.myHand.map((card) => (
            <Card
              key={card.id}
              card={card}
              selected={selectedCard?.id === card.id}
              onClick={() => setSelectedCard(selectedCard?.id === card.id ? null : card)}
              disabled={!isMyTurn}
            />
          ))}
        </div>
      </div>

      {/* Go/Stop modal */}
      {modals.goStop && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-8 text-center max-w-sm w-full mx-4">
            <h3 className="text-2xl font-bold text-white mb-2">점수 달성!</h3>
            <p className="text-gray-400 mb-6">고 또는 스톱을 선택하세요</p>
            <div className="flex gap-4">
              <button
                onClick={declareGo}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-xl"
              >
                고!
              </button>
              <button
                onClick={declareStop}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-xl"
              >
                스톱
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Register /game route in __root.tsx + add navigation from socket-listeners**

After `game:started` event, navigate to `/game`.

**Step 3: Commit**
```bash
git add packages/web/src/routes/game.lazy.tsx packages/web/src/routes/__root.tsx
git commit -m "[Frontend] feat: add game page with hand, field, go/stop modal"
```

---

### Task E3: Toast notification component

**Files:**
- Create: `packages/web/src/components/ToastContainer.tsx`
- Modify: `packages/web/src/routes/__root.tsx`

```typescript
// packages/web/src/components/ToastContainer.tsx
import { useUIStore } from '../stores/ui-store'
import { useEffect } from 'react'

export function ToastContainer(): JSX.Element {
  const { toasts, removeToast } = useUIStore()

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

function Toast({
  id,
  message,
  type,
  onRemove,
}: {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  onRemove: (id: string) => void
}): JSX.Element {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(id), 3000)
    return () => clearTimeout(timer)
  }, [id, onRemove])

  const bg = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'

  return (
    <div className={`${bg} text-white px-4 py-3 rounded-lg shadow-lg max-w-xs`}>
      {message}
    </div>
  )
}
```

**Add `<ToastContainer />` to `__root.tsx`.**

**Step 4: Final typecheck + commit**
```bash
pnpm typecheck
git add packages/web/src/components/
git commit -m "[Frontend] feat: add toast notification component"
```

---

## Final Integration Checklist

After all tasks are complete:

- [ ] `pnpm typecheck` passes across all packages
- [ ] Start local dev: `pnpm dev:server` + `pnpm dev:web`
- [ ] Open two browser tabs → enter different names → create + join room → ready + start → play a card
- [ ] Deploy: `git push && flyctl deploy && vercel --prod`

---

## Routing Setup (Required for D+E)

The TanStack Router routes need to be defined. Current `__root.tsx` uses `routeTree` from `./routes/__root`. Add routes for `/`, `/room`, `/game`:

```typescript
// packages/web/src/routes/__root.tsx
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { App } from '../App'
import { LobbyPage } from './index.lazy'
import { RoomPage } from './room.lazy'
import { GamePage } from './game.lazy'
import { AuthGate } from '../components/AuthGate'
import { ToastContainer } from '../components/ToastContainer'

const rootRoute = createRootRoute({
  component: () => (
    <AuthGate>
      <Outlet />
      <ToastContainer />
    </AuthGate>
  ),
})

export const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: LobbyPage })
export const roomRoute = createRoute({ getParentRoute: () => rootRoute, path: '/room', component: RoomPage })
export const gameRoute = createRoute({ getParentRoute: () => rootRoute, path: '/game', component: GamePage })

export const routeTree = rootRoute.addChildren([indexRoute, roomRoute, gameRoute])
```

After `room:created` / `room:joined` → `router.navigate({ to: '/room' })`
After `game:started` → `router.navigate({ to: '/game' })`
