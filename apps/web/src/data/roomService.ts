import {
  starterRoomDefinition,
  type FacingDirection,
  type PlacedItem,
  type RoomSnapshot
} from "@tiletown/content";
import {
  createRoomStateEnvelope,
  hydrateRoomSnapshot,
  loadInitialRoomState,
  type RoomSnapshotPayload
} from "./roomState";
import { getPlayerSession } from "./session";

export type RoomStateEnvelope = ReturnType<typeof createRoomStateEnvelope>;

export type RoomService = {
  getInitialState: () => Promise<RoomStateEnvelope>;
  subscribeRoom: (
    roomId: string,
    onSnapshot: (snapshot: RoomSnapshot) => void
  ) => () => void;
  sendHeartbeat: (roomId: string, playerId: string) => Promise<void>;
  leaveRoom: (roomId: string, playerId: string) => void;
  savePlacedItems: (roomId: string, placedItems: PlacedItem[]) => Promise<void>;
  updateLocalPlayerPosition: (
    roomId: string,
    playerId: string,
    payload: {
      x: number;
      y: number;
      facing: FacingDirection;
    }
  ) => Promise<void>;
};

export function createRoomService(): RoomService {
  return getRoomServiceMode() === "live" ? createLiveRoomService() : createMockRoomService();
}

function createMockRoomService(): RoomService {
  return {
    async getInitialState() {
      const snapshot = loadInitialRoomState();
      return createRoomStateEnvelope(snapshot);
    },
    subscribeRoom() {
      return () => {};
    },
    async sendHeartbeat() {
      return;
    },
    leaveRoom() {
      return;
    },
    async savePlacedItems() {
      return;
    },
    async updateLocalPlayerPosition() {
      return;
    }
  };
}

function createLiveRoomService(): RoomService {
  const session = getPlayerSession();

  return {
    async getInitialState() {
      const query = new URLSearchParams({
        playerId: session.playerId,
        displayName: session.displayName
      });
      const response = await fetch(
        `/api/rooms/${starterRoomDefinition.id}?${query.toString()}`
      );
      if (!response.ok) {
        throw new Error(`Failed to load room snapshot: ${response.status}`);
      }

      const payload = (await response.json()) as {
        roomId: string;
        snapshot: RoomSnapshotPayload;
      };

      return createRoomStateEnvelope(hydrateRoomSnapshot(payload.snapshot));
    },
    subscribeRoom(roomId, onSnapshot) {
      const query = new URLSearchParams({
        playerId: session.playerId,
        displayName: session.displayName
      });
      const eventSource = new EventSource(
        `/api/rooms/${roomId}/stream?${query.toString()}`
      );

      eventSource.addEventListener("snapshot", (event) => {
        const message = JSON.parse((event as MessageEvent<string>).data) as {
          snapshot: RoomSnapshotPayload;
        };
        onSnapshot(hydrateRoomSnapshot(message.snapshot));
      });

      return () => {
        eventSource.close();
      };
    },
    async sendHeartbeat(roomId, playerId) {
      await fetch(`/api/rooms/${roomId}/players/${playerId}/heartbeat`, {
        method: "POST"
      });
    },
    leaveRoom(roomId, playerId) {
      navigator.sendBeacon(`/api/rooms/${roomId}/players/${playerId}/leave`);
    },
    async savePlacedItems(roomId, placedItems) {
      await fetch(`/api/rooms/${roomId}/items`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ placedItems })
      });
    },
    async updateLocalPlayerPosition(roomId, playerId, payload) {
      await fetch(`/api/rooms/${roomId}/players/${playerId}/position`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    }
  };
}

function getRoomServiceMode() {
  const mode = import.meta.env.VITE_ROOM_SOURCE;
  return mode === "live" ? "live" : "mock";
}

export function applyRoomEnvelope(snapshot: RoomSnapshot) {
  return createRoomStateEnvelope(snapshot);
}
