import { Room } from './room'

export class RoomManager {
  private rooms: Map<string, Room> = new Map()

  createRoom(code: string, maxPlayers: 2 | 3, isPrivate: boolean, hostId: string): Room {
    if (this.rooms.has(code)) {
      throw new Error('ROOM_EXISTS')
    }
    const room = new Room(code, maxPlayers, isPrivate, hostId)
    this.rooms.set(code, room)
    return room
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code)
  }

  deleteRoom(code: string): void {
    this.rooms.delete(code)
  }

  getRooms(): readonly Room[] {
    return Array.from(this.rooms.values()).filter((r) => !r.isEmpty())
  }
}
