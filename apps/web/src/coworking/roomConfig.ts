import { starterRoomDefinition, starterRoomSnapshot, tileSize } from "@tiletown/content";
import generatedRoomData from "./generated-room-data.json";

export type RoomZone = {
  name: string;
  label: string;
  tiles: Array<{ x: number; y: number }>;
};

export type CoworkingRoomConfig = {
  id: string;
  name: string;
  tileSize: number;
  width: number;
  height: number;
  backgroundSrc: string;
  foregroundSrc: string;
  playerSpriteSrc: string;
  npcSpriteSources: Record<string, string>;
  collisionFlat: number[];
  zones: RoomZone[];
};

export const coworkingRoomConfig: CoworkingRoomConfig = {
  id: starterRoomDefinition.id,
  name: "Modern Office Coworking Room",
  tileSize,
  width: generatedRoomData.width,
  height: generatedRoomData.height,
  backgroundSrc: "/coworking/modern-office-room-background.png",
  foregroundSrc: "/coworking/modern-office-room-foreground.png",
  playerSpriteSrc: "/coworking/player-sheet.png",
  npcSpriteSources: {
    "npc-1": "/coworking/agent-mira-sheet.png",
    "npc-2": "/coworking/agent-pip-sheet.png",
    "npc-3": "/coworking/agent-nori-sheet.png"
  },
  collisionFlat: generatedRoomData.collisionFlat,
  zones: generatedRoomData.zones
};

export const defaultRoomSnapshot = starterRoomSnapshot;
