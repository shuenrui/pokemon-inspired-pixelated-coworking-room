import {
  createMockRoomSnapshot,
  starterPlacedItems,
  starterRoomDefinition,
  type FacingDirection,
  type PlacedItem,
  type RoomActor,
  type RoomSnapshot
} from "@tiletown/content";

const layoutStorageKey = "tiletown:starter-layout";

export type RoomSnapshotPayload = {
  roomId: string;
  localPlayerId: string;
  players: Array<{
    id: string;
    displayName: string;
    spriteId: string;
    color: number;
    position: { x: number; y: number };
    facing: FacingDirection;
    movement?: {
      mode: "idle" | "walking" | "sync";
      target: { x: number; y: number } | null;
      updatedAt: string;
    };
  }>;
  npcs: Array<{
    id: string;
    displayName: string;
    spriteId: string;
    color: number;
    position: { x: number; y: number };
    facing: FacingDirection;
    movement?: {
      mode: "idle" | "walking" | "sync";
      target: { x: number; y: number } | null;
      updatedAt: string;
    };
  }>;
  placedItems: PlacedItem[];
};

export function loadInitialRoomState() {
  return createMockRoomSnapshot(loadStoredLayout());
}

export function resetRoomState() {
  clearStoredLayout();
  return createMockRoomSnapshot();
}

export function savePlacedItems(placedItems: PlacedItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(layoutStorageKey, JSON.stringify(placedItems));
}

export function hydrateRoomSnapshot(payload: RoomSnapshotPayload): RoomSnapshot {
  return {
    roomId: payload.roomId,
    localPlayerId: payload.localPlayerId,
    players: payload.players.map((player) => toActor("player", player)),
    npcs: payload.npcs.map((npc) => toActor("npc", npc)),
    placedItems: payload.placedItems.map((item) => ({ ...item }))
  };
}

export function createRoomStateEnvelope(snapshot: RoomSnapshot) {
  return {
    roomId: snapshot.roomId,
    definitionId: starterRoomDefinition.id,
    generatedAt: new Date().toISOString(),
    snapshot
  };
}

function loadStoredLayout() {
  if (typeof window === "undefined") {
    return [...starterPlacedItems];
  }

  try {
    const rawValue = window.localStorage.getItem(layoutStorageKey);
    if (!rawValue) {
      return [...starterPlacedItems];
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [...starterPlacedItems];
    }

    return parsed as PlacedItem[];
  } catch {
    return [...starterPlacedItems];
  }
}

function clearStoredLayout() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(layoutStorageKey);
}

function toActor(
  kind: RoomActor["kind"],
  actor: RoomSnapshotPayload["players"][number]
): RoomActor {
  return {
    id: actor.id,
    kind,
    displayName: actor.displayName,
    spriteId: actor.spriteId,
    color: actor.color,
    position: { ...actor.position },
    facing: actor.facing,
    movement: actor.movement ?? {
      mode: "sync",
      target: null,
      updatedAt: new Date().toISOString()
    }
  };
}
