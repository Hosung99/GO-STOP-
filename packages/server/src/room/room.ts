import type { RoomState } from '@go-stop/shared'

export interface RoomPlayer {
  readonly id: string
  readonly name: string
  readonly isReady: boolean
  readonly isConnected: boolean
  readonly isHost: boolean
  readonly socketId: string
}

export class Room {
  private players: Map<string, RoomPlayer> = new Map()

  constructor(
    readonly code: string,
    readonly maxPlayers: 2 | 3,
    readonly isPrivate: boolean,
    readonly hostId: string,
  ) {}

  addPlayer(player: RoomPlayer): void {
    if (this.players.size >= this.maxPlayers) {
      throw new Error('ROOM_FULL')
    }
    this.players.set(player.id, player)
  }

  removePlayer(playerId: string): void {
    this.players.delete(playerId)
  }

  setReady(playerId: string, ready: boolean): void {
    const player = this.players.get(playerId)
    if (player) {
      const updated = { ...player, isReady: ready }
      this.players.set(playerId, updated)
    }
  }

  setConnected(playerId: string, connected: boolean): void {
    const player = this.players.get(playerId)
    if (player) {
      const updated = { ...player, isConnected: connected }
      this.players.set(playerId, updated)
    }
  }

  getPlayers(): readonly RoomPlayer[] {
    return Array.from(this.players.values())
  }

  getPlayer(playerId: string): RoomPlayer | undefined {
    return this.players.get(playerId)
  }

  isFull(): boolean {
    return this.players.size >= this.maxPlayers
  }

  isEmpty(): boolean {
    return this.players.size === 0
  }

  canStart(): boolean {
    const all = Array.from(this.players.values())
    return all.length === this.maxPlayers && all.every((p) => p.isReady && p.isConnected)
  }

  toState(): RoomState {
    const players = Array.from(this.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      isReady: p.isReady,
      isConnected: p.isConnected,
      isHost: p.isHost,
    }))

    return {
      code: this.code,
      hostId: this.hostId,
      maxPlayers: this.maxPlayers,
      isPrivate: this.isPrivate,
      status: 'waiting',
      players,
    }
  }
}
