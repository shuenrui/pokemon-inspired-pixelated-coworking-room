export const tileSize = 16;
export const furnitureCatalog = [
    { id: "desk", label: "Desk", width: 2, height: 1, color: 0xb9895c },
    { id: "plant", label: "Plant", width: 1, height: 1, color: 0x58a04a },
    { id: "bookshelf", label: "Bookshelf", width: 2, height: 1, color: 0x85683e },
    { id: "meeting-table", label: "Meeting Table", width: 2, height: 2, color: 0xd69258 }
];
export const starterPlacedItems = [
    { id: "north-left-desk", itemId: "desk", x: 2, y: 2 },
    { id: "north-right-desk", itemId: "desk", x: 13, y: 2 },
    { id: "center-table", itemId: "meeting-table", x: 9, y: 3 },
    { id: "south-left-plant", itemId: "plant", x: 2, y: 8 },
    { id: "south-right-shelf", itemId: "bookshelf", x: 15, y: 8 }
];
export const starterRoomDefinition = {
    id: "starter-coworking-room",
    name: "Starter Coworking Room",
    tiles: [
        ["wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall"],
        ["wall", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "wall"],
        ["wall", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "wall"],
        ["wall", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "rug", "rug", "rug", "rug", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "wall"],
        ["wall", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "rug", "rug", "rug", "rug", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "wall"],
        ["wall", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "rug", "rug", "rug", "rug", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "wall"],
        ["wall", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "wall"],
        ["wall", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "wall"],
        ["wall", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "wall"],
        ["wall", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "wall"],
        ["wall", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "wall"],
        ["wall", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "wall"],
        ["wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "entry", "entry", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall"]
    ],
    collision: [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
        [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ],
    entry: { x: 9, y: 8 },
    interactionPoints: [
        { id: "coffee-station", label: "Coffee Station", x: 2, y: 2 },
        { id: "meeting-zone", label: "Meeting Zone", x: 9, y: 3 },
        { id: "shelf", label: "Shelf", x: 15, y: 8 }
    ]
};
export const starterRoomSnapshot = {
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
            position: { x: 5, y: 5 },
            facing: "down",
            movement: {
                mode: "sync",
                target: { x: 5, y: 5 },
                updatedAt: "2026-03-16T00:00:00.000Z"
            }
        },
        {
            id: "npc-2",
            kind: "npc",
            displayName: "Pip",
            spriteId: "npc-npc-2",
            color: 0xf2a65a,
            position: { x: 13, y: 6 },
            facing: "left",
            movement: {
                mode: "sync",
                target: { x: 13, y: 6 },
                updatedAt: "2026-03-16T00:00:00.000Z"
            }
        },
        {
            id: "npc-3",
            kind: "npc",
            displayName: "Nori",
            spriteId: "npc-npc-3",
            color: 0x9a6dd7,
            position: { x: 9, y: 10 },
            facing: "up",
            movement: {
                mode: "sync",
                target: { x: 9, y: 10 },
                updatedAt: "2026-03-16T00:00:00.000Z"
            }
        }
    ],
    placedItems: starterPlacedItems
};
export function createMockRoomSnapshot(placedItems = starterPlacedItems) {
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
