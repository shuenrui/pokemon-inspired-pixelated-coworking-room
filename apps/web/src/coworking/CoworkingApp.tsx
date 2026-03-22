import { useEffect, useMemo, useRef, useState } from "react";
import type { RoomSnapshot } from "@tiletown/content";
import { createRoomService } from "../data/roomService";
import { getPlayerSession } from "../data/session";
import { createCoworkingGame } from "./createCoworkingGame";
import { coworkingRoomConfig } from "./roomConfig";

declare global {
  interface Window {
    setAgentZone?: (id: string, zoneName: string) => void;
  }
}

export function CoworkingApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Awaited<ReturnType<typeof createCoworkingGame>> | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [status, setStatus] = useState({
    connectedPlayers: [] as Array<{
      id: string;
      displayName: string;
      isLocal: boolean;
    }>,
    activeZones: [] as Array<{
      actorId: string;
      displayName: string;
      zoneName: string | null;
    }>
  });
  const [error, setError] = useState<string | null>(null);

  const service = useMemo(() => createRoomService(), []);
  const session = useMemo(() => getPlayerSession(), []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    async function boot() {
      try {
        const initialState = await service.getInitialState();
        if (cancelled) {
          return;
        }

        setSnapshot(initialState.snapshot);
        unsubscribe = service.subscribeRoom(initialState.roomId, (nextSnapshot) => {
          setSnapshot(nextSnapshot);
        });
      } catch (caughtError) {
        if (cancelled) {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : "Failed to load room.");
      }
    }

    void boot();

    return () => {
      cancelled = true;
      unsubscribe();
      if (snapshot) {
        service.leaveRoom(snapshot.roomId, session.playerId);
      }
    };
  }, [service, session.playerId]);

  useEffect(() => {
    if (!canvasRef.current || !snapshot) {
      return;
    }

    let disposed = false;
    void createCoworkingGame({
      canvas: canvasRef.current,
      service,
      snapshot,
      onStatus: setStatus
    }).then((game) => {
      if (disposed) {
        game.destroy();
        return;
      }

      gameRef.current = game;
      window.setAgentZone = (id: string, zoneName: string) => {
        game.setAgentZone(id, zoneName);
      };
    });

    return () => {
      disposed = true;
      if (window.setAgentZone) {
        delete window.setAgentZone;
      }
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, [service, snapshot?.roomId]);

  useEffect(() => {
    if (!snapshot || !gameRef.current) {
      return;
    }

    gameRef.current.applySnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    const interval = window.setInterval(() => {
      void service.sendHeartbeat(snapshot.roomId, snapshot.localPlayerId);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [service, snapshot]);

  return (
    <main className="coworking-shell">
      <section className="coworking-layout">
        <div className="game-panel">
          <div className="game-header">
            <div>
              <h1>TileTown Coworking Room</h1>
            </div>
            <div className="screen-tag">Chris Courses Style Architecture</div>
          </div>

          <div className="canvas-frame">
            {error ? (
              <div className="empty-note">{error}</div>
            ) : (
              <canvas
                ref={canvasRef}
                className="game-canvas"
                aria-label="Pokemon-style coworking room canvas"
              />
            )}
          </div>

          <div className="helper-row">
            <article className="helper-card">
              <h3>Movement</h3>
              <p>Arrow keys or WASD. Player stays centered while the room shifts around you.</p>
            </article>
            <article className="helper-card">
              <h3>Render Order</h3>
              <p>Background map, collision layer, agents, player, then foreground overlay.</p>
            </article>
            <article className="helper-card">
              <h3>Agent Zones</h3>
              <p>Use the zone buttons or call <code>setAgentZone(id, zoneName)</code> in the console.</p>
            </article>
          </div>
        </div>

        <aside className="info-panel">
          <h2>Room State</h2>

          <section className="status-card">
            <strong>Session</strong>
            <ul className="meta-list">
              <li>Player: {session.displayName}</li>
              <li>Room: {coworkingRoomConfig.name}</li>
              <li>Grid: {coworkingRoomConfig.width} × {coworkingRoomConfig.height}</li>
            </ul>
          </section>

          <section className="status-card">
            <strong>Online Roster</strong>
            {status.connectedPlayers.length > 0 ? (
              <ul className="roster-list">
                {status.connectedPlayers.map((player) => (
                  <li key={player.id}>
                    <span>{player.displayName}</span>
                    <span className="badge">{player.isLocal ? "You" : "Live"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">Waiting for room presence.</p>
            )}
          </section>

          {snapshot?.npcs.map((npc) => (
            <section className="zone-card" key={npc.id}>
              <h3>{npc.displayName}</h3>
              <p>
                Current zone:{" "}
                <strong>
                  {status.activeZones.find((entry) => entry.actorId === npc.id)?.zoneName ?? "unassigned"}
                </strong>
              </p>
              <div className="zone-buttons">
                {coworkingRoomConfig.zones.map((zone) => (
                  <button
                    className="zone-button"
                    key={zone.name}
                    type="button"
                    onClick={() => gameRef.current?.setAgentZone(npc.id, zone.name)}
                  >
                    {zone.label}
                  </button>
                ))}
              </div>
            </section>
          ))}

          <section className="status-card">
            <strong>Zones</strong>
            <ul className="zone-list">
              {coworkingRoomConfig.zones.map((zone) => (
                <li key={zone.name}>
                  <span>{zone.label}</span>
                  <span className="badge">{zone.tiles.length} tiles</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </main>
  );
}
