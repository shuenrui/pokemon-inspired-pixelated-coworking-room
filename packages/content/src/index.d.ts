export declare const tileSize = 16;
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
export declare const furnitureCatalog: FurnitureDefinition[];
export declare const starterPlacedItems: PlacedItem[];
export declare const starterRoomDefinition: RoomDefinition;
export declare const starterRoomSnapshot: RoomSnapshot;
export declare function createMockRoomSnapshot(placedItems?: PlacedItem[]): {
    players: {
        position: {
            x: number;
            y: number;
        };
        movement: {
            target: {
                x: number;
                y: number;
            } | null;
            mode: "idle" | "walking" | "sync";
            updatedAt: string;
        };
        id: string;
        kind: "player" | "npc";
        displayName: string;
        spriteId: string;
        color: number;
        facing: FacingDirection;
    }[];
    npcs: {
        position: {
            x: number;
            y: number;
        };
        movement: {
            target: {
                x: number;
                y: number;
            } | null;
            mode: "idle" | "walking" | "sync";
            updatedAt: string;
        };
        id: string;
        kind: "player" | "npc";
        displayName: string;
        spriteId: string;
        color: number;
        facing: FacingDirection;
    }[];
    placedItems: {
        id: string;
        itemId: string;
        x: number;
        y: number;
    }[];
    roomId: string;
    localPlayerId: string;
};
