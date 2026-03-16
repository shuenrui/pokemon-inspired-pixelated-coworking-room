# API Contract

## Shape

The frontend now expects a static room definition and a live room snapshot. For live room loading, the adapter layer is prepared for this response:

```json
{
  "roomId": "starter-coworking-room",
  "snapshot": {
    "roomId": "starter-coworking-room",
    "localPlayerId": "player-you",
    "players": [
      {
        "id": "player-you",
        "displayName": "You",
        "spriteId": "avatar-player",
        "color": 13722705,
        "position": { "x": 9, "y": 8 },
        "facing": "down",
        "movement": {
          "mode": "idle",
          "target": null,
          "updatedAt": "2026-03-16T00:00:00.000Z"
        }
      }
    ],
    "npcs": [],
    "placedItems": [
      { "id": "north-left-desk", "itemId": "desk", "x": 2, "y": 2 }
    ]
  }
}
```

## Endpoints

### `GET /api/rooms/:roomId`

Returns the current live room snapshot for the requested room.

### `PUT /api/rooms/:roomId/items`

Request body:

```json
{
  "placedItems": [
    { "id": "desk-1", "itemId": "desk", "x": 4, "y": 4 }
  ]
}
```

### `PUT /api/rooms/:roomId/players/:playerId/position`

Request body:

```json
{
  "x": 10,
  "y": 8,
  "facing": "right"
}
```

## Realtime direction

Later, this same `snapshot` shape should be sent over websockets or another realtime transport. The frontend is now structured so the scene can consume the same shape whether it comes from:

- local mock state
- HTTP API
- realtime subscription
