import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { starterRoomDefinition } from "@tiletown/content";
import { getServerConfig } from "./config.js";
import { isAuthorizedMutation } from "./http/auth.js";
import { parsePlacedItemsPayload, parsePositionPayload } from "./http/validation.js";
import { SqliteRoomRepository } from "./db/repository.js";

const config = getServerConfig(getDefaultWebDistDir());
const repository = new SqliteRoomRepository();
const roomStreams = new Map<string, Set<RoomStreamClient>>();

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    setCorsHeaders(response, config.allowOrigin);
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const path = url.pathname;
  const playerId = url.searchParams.get("playerId");
  const displayName = url.searchParams.get("displayName") ?? "Guest";

  if (request.method === "GET" && path === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && path === `/api/rooms/${starterRoomDefinition.id}/stream`) {
    if (!playerId) {
      setCorsHeaders(response, config.allowOrigin);
      sendJson(response, 400, { error: "Missing playerId" });
      return;
    }

    const snapshot = repository.ensurePlayer(
      starterRoomDefinition.id,
      playerId,
      displayName
    );
    if (!snapshot) {
      setCorsHeaders(response, config.allowOrigin);
      sendJson(response, 404, { error: "Room not found" });
      return;
    }

    response.writeHead(200, {
      "Access-Control-Allow-Origin": config.allowOrigin,
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream"
    });
    response.write(`event: snapshot\n`);
    response.write(`data: ${JSON.stringify({ snapshot })}\n\n`);

    const listeners = roomStreams.get(starterRoomDefinition.id) ?? new Set();
    const listener = { response, playerId };
    listeners.add(listener);
    roomStreams.set(starterRoomDefinition.id, listeners);

    request.on("close", () => {
      listeners.delete(listener);
      repository.touchPlayerPresence(starterRoomDefinition.id, playerId);
      if (listeners.size === 0) {
        roomStreams.delete(starterRoomDefinition.id);
      }
    });
    return;
  }

  setCorsHeaders(response, config.allowOrigin);

  if (request.method === "GET" && path === `/api/rooms/${starterRoomDefinition.id}`) {
    if (!playerId) {
      sendJson(response, 400, { error: "Missing playerId" });
      return;
    }

    const snapshot = repository.ensurePlayer(
      starterRoomDefinition.id,
      playerId,
      displayName
    );
    if (!snapshot) {
      sendJson(response, 404, { error: "Room not found" });
      return;
    }

    sendJson(response, 200, {
      roomId: starterRoomDefinition.id,
      snapshot
    });
    return;
  }

  if (request.method === "PUT" && path === `/api/rooms/${starterRoomDefinition.id}/items`) {
    if (!isAuthorizedMutation(request, config.adminToken)) {
      sendJson(response, 401, { error: "Unauthorized mutation" });
      return;
    }

    const body = await readJsonBody<unknown>(request);
    const placedItems = parsePlacedItemsPayload(body);
    if (!placedItems) {
      sendJson(response, 400, { error: "Invalid placedItems payload" });
      return;
    }

    const snapshot = repository.savePlacedItems(
      starterRoomDefinition.id,
      placedItems
    );
    if (!snapshot) {
      sendJson(response, 400, { error: "Invalid item placement payload" });
      return;
    }
    broadcastSnapshot(starterRoomDefinition.id);
    sendJson(response, 200, { ok: true, snapshot });
    return;
  }

  if (
    request.method === "PUT" &&
    path.startsWith(`/api/rooms/${starterRoomDefinition.id}/players/`) &&
    path.endsWith("/position")
  ) {
    const playerId = path.split("/")[5];
    if (!isAuthorizedMutation(request, config.adminToken)) {
      sendJson(response, 401, { error: "Unauthorized mutation" });
      return;
    }

    const body = await readJsonBody<unknown>(request);
    const position = parsePositionPayload(body);
    if (!position) {
      sendJson(response, 400, { error: "Invalid position payload" });
      return;
    }

    const snapshot = repository.updatePlayerPosition(starterRoomDefinition.id, playerId, {
      x: position.x,
      y: position.y,
      facing: position.facing
    });

    if (!snapshot) {
      sendJson(response, 400, { error: "Invalid movement or missing player" });
      return;
    }
    broadcastSnapshot(starterRoomDefinition.id);
    sendJson(response, 200, { ok: true, snapshot });
    return;
  }

  if (
    request.method === "POST" &&
    path.startsWith(`/api/rooms/${starterRoomDefinition.id}/players/`) &&
    path.endsWith("/heartbeat")
  ) {
    const heartbeatPlayerId = path.split("/")[5];
    const snapshot = repository.touchPlayerPresence(
      starterRoomDefinition.id,
      heartbeatPlayerId
    );

    if (!snapshot) {
      sendJson(response, 404, { error: "Player not found" });
      return;
    }

    broadcastSnapshot(starterRoomDefinition.id);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (
    request.method === "POST" &&
    path.startsWith(`/api/rooms/${starterRoomDefinition.id}/players/`) &&
    path.endsWith("/leave")
  ) {
    const leavingPlayerId = path.split("/")[5];
    const snapshot = repository.markPlayerOffline(
      starterRoomDefinition.id,
      leavingPlayerId
    );

    if (!snapshot) {
      sendJson(response, 404, { error: "Player not found" });
      return;
    }

    broadcastSnapshot(starterRoomDefinition.id);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET") {
    await serveStaticAsset(path, response);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(config.port, () => {
  console.log(`TileTown server listening on http://localhost:${config.port}`);
});

function broadcastSnapshot(roomId: string) {
  const listeners = roomStreams.get(roomId);
  if (!listeners) {
    return;
  }

  listeners.forEach((client) => {
    const snapshot = repository.getRoomSnapshot(roomId, client.playerId);
    if (!snapshot) {
      return;
    }

    const payload = `event: snapshot\ndata: ${JSON.stringify({ snapshot })}\n\n`;
    client.response.write(payload);
  });
}

type RoomStreamClient = {
  response: import("node:http").ServerResponse;
  playerId: string;
};

function setCorsHeaders(
  response: import("node:http").ServerResponse,
  allowOrigin: string
) {
  response.setHeader("Access-Control-Allow-Origin", allowOrigin);
  response.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Content-Type", "application/json");
}

async function serveStaticAsset(
  pathname: string,
  response: import("node:http").ServerResponse
) {
  const relativePath = pathname === "/" ? "/index.html" : pathname;
  const normalizedPath = normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const candidatePath = join(config.webDistDir, normalizedPath);

  try {
    const content = await readFile(candidatePath);
    response.writeHead(200, { "Content-Type": getContentType(candidatePath) });
    response.end(content);
    return;
  } catch {
    if (extname(candidatePath)) {
      sendJson(response, 404, { error: "Not found" });
      return;
    }
  }

  try {
    const indexContent = await readFile(join(config.webDistDir, "index.html"));
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(indexContent);
  } catch {
    sendJson(response, 404, { error: "Web build not found" });
  }
}

function sendJson(
  response: import("node:http").ServerResponse,
  statusCode: number,
  payload: unknown
) {
  response.writeHead(statusCode);
  response.end(JSON.stringify(payload));
}

function readJsonBody<T>(request: import("node:http").IncomingMessage) {
  return new Promise<T | null>((resolve) => {
    let rawBody = "";

    request.on("data", (chunk) => {
      rawBody += chunk.toString();
    });

    request.on("end", () => {
      if (!rawBody) {
        resolve(null);
        return;
      }

      try {
        resolve(JSON.parse(rawBody) as T);
      } catch {
        resolve(null);
      }
    });
  });
}

function getDefaultWebDistDir() {
  return join(dirnameFromImportMeta(), "../../web/dist");
}

function dirnameFromImportMeta() {
  return normalize(fileURLToPath(new URL(".", import.meta.url)));
}

function getContentType(filePath: string) {
  switch (extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}
