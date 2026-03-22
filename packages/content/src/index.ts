import {
  generatedRoomCollision,
  generatedRoomTiles,
  generatedRoomZones
} from "./generatedRoomLayout";

export const tileSize = 16;

export type TileKind = "wall" | "floor" | "entry" | "rug";
export type FacingDirection = "up" | "down" | "left" | "right";

export type TilePosition = {
  x: number;
  y: number;
};

export type PlacedItem = {
  id: string;
  itemId: string;
  x: number;
  y: number;
};

export type FurnitureDefinition = {
  id: string;
  label: string;
  width: number;
  height: number;
  color: number;
};

export type MovementState = {
  mode: "idle" | "walking" | "sync";
  target: TilePosition | null;
  updatedAt: string;
};

export type RoomActor = {
  id: string;
  kind: "player" | "npc";
  displayName: string;
  spriteId: string;
  color: number;
  position: TilePosition;
  facing: FacingDirection;
  movement: MovementState;
};

export type InteractionPoint = {
  id: string;
  label: string;
  x: number;
  y: number;
};

export type RoomDefinition = {
  id: string;
  name: string;
  tiles: TileKind[][];
  collision: number[][];
  entry: TilePosition;
  interactionPoints: InteractionPoint[];
};

export type RoomSnapshot = {
  roomId: string;
  localPlayerId: string;
  players: RoomActor[];
  npcs: RoomActor[];
  placedItems: PlacedItem[];
};

export const furnitureCatalog: FurnitureDefinition[] = [
  { id: "desk", label: "Desk", width: 2, height: 1, color: 0xb9895c },
  { id: "bed", label: "Bed", width: 2, height: 2, color: 0xe6e2d6 },
  { id: "plant", label: "Plant", width: 1, height: 1, color: 0x58a04a },
  { id: "dresser", label: "Dresser", width: 2, height: 1, color: 0x9c7448 },
  { id: "bookshelf", label: "Bookshelf", width: 2, height: 1, color: 0x85683e },
  { id: "meeting-table", label: "Meeting Table", width: 2, height: 2, color: 0xd69258 }
];

export const starterPlacedItems: PlacedItem[] = [
  { id: "north-bed", itemId: "bed", x: 2, y: 2 },
  { id: "north-dresser", itemId: "dresser", x: 5, y: 2 },
  { id: "north-desk", itemId: "desk", x: 10, y: 2 },
  { id: "north-bookshelf", itemId: "bookshelf", x: 15, y: 2 },
  { id: "center-table", itemId: "meeting-table", x: 9, y: 4 },
  { id: "south-left-plant", itemId: "plant", x: 3, y: 9 },
  { id: "south-right-shelf", itemId: "bookshelf", x: 14, y: 9 }
];

export const starterRoomDefinition: RoomDefinition = {
  id: "starter-coworking-room",
  name: "Modern Office Coworking Room",
  tiles: generatedRoomTiles.map((row) => [...row]) as TileKind[][],
  collision: generatedRoomCollision.map((row) => [...row]) as number[][],
  entry: { x: 14, y: 20 },
  interactionPoints: generatedRoomZones.map((zone) => ({
    id: zone.name,
    label: zone.label,
    x: zone.tiles[0]?.x ?? 1,
    y: zone.tiles[0]?.y ?? 1
  }))
};

export const starterRoomSnapshot: RoomSnapshot = {
  roomId: starterRoomDefinition.id,
  localPlayerId: "player-you",
  players: [
    {
      id: "player-you",
      kind: "player",
      displayName: "You",
      spriteId: "avatar-player",
      color: 0xd26451,
      position: { ...starterRoomDefinition.entry },
      facing: "down",
      movement: {
        mode: "idle",
        target: null,
        updatedAt: "2026-03-16T00:00:00.000Z"
      }
    }
  ],
  npcs: [
    {
      id: "npc-1",
      kind: "npc",
      displayName: "Mira",
      spriteId: "npc-npc-1",
      color: 0x77c7d9,
      position: { x: 2, y: 8 },
      facing: "down",
      movement: {
        mode: "sync",
        target: { x: 2, y: 8 },
        updatedAt: "2026-03-16T00:00:00.000Z"
      }
    },
    {
      id: "npc-2",
      kind: "npc",
      displayName: "Pip",
      spriteId: "npc-npc-2",
      color: 0xf2a65a,
      position: { x: 14, y: 13 },
      facing: "left",
      movement: {
        mode: "sync",
        target: { x: 14, y: 13 },
        updatedAt: "2026-03-16T00:00:00.000Z"
      }
    },
    {
      id: "npc-3",
      kind: "npc",
      displayName: "Nori",
      spriteId: "npc-npc-3",
      color: 0x9a6dd7,
      position: { x: 15, y: 20 },
      facing: "up",
      movement: {
        mode: "sync",
        target: { x: 15, y: 20 },
        updatedAt: "2026-03-16T00:00:00.000Z"
      }
    }
  ],
  placedItems: starterPlacedItems
};

export function createMockRoomSnapshot(placedItems: PlacedItem[] = starterPlacedItems) {
  return {
    ...starterRoomSnapshot,
    players: starterRoomSnapshot.players.map((player) => ({
      ...player,
      position: { ...player.position },
      movement: {
        ...player.movement,
        target: player.movement.target ? { ...player.movement.target } : null
      }
    })),
    npcs: starterRoomSnapshot.npcs.map((npc) => ({
      ...npc,
      position: { ...npc.position },
      movement: {
        ...npc.movement,
        target: npc.movement.target ? { ...npc.movement.target } : null
      }
    })),
    placedItems: placedItems.map((item) => ({ ...item }))
  };
}
