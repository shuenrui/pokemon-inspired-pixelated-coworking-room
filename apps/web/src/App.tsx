import { useEffect, useRef } from "react";
import { createGame } from "./game/createGame";
import { useUiStore } from "./state/uiStore";

export function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneTitle = useUiStore((state) => state.sceneTitle);
  const mode = useUiStore((state) => state.mode);
  const selectedItem = useUiStore((state) => state.selectedItem);
  const placedCount = useUiStore((state) => state.placedCount);
  const onlinePlayers = useUiStore((state) => state.onlinePlayers);
  const requestReset = useUiStore((state) => state.requestReset);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const game = createGame(containerRef.current);
    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="hud">
        <div>
          <p className="eyebrow">TileTown Coworking</p>
          <h1>{sceneTitle}</h1>
        </div>
        <div className="hud-card">
          <p>Mode</p>
          <strong>{mode}</strong>
        </div>
        <div className="hud-card">
          <p>Selected item</p>
          <strong>{selectedItem}</strong>
        </div>
        <div className="hud-card">
          <p>Placed items</p>
          <strong>{placedCount}</strong>
        </div>
        <div className="hud-card">
          <p>Online</p>
          <strong>{onlinePlayers.length}</strong>
        </div>
        <div className="hud-card">
          <p>Controls</p>
          <strong>Move, `D`, `[` `]`, `Enter`, `Backspace`</strong>
        </div>
      </section>
      <section className="stage-frame">
        <aside className="panel">
          <div className="panel-card">
            <p className="panel-label">Room loop</p>
            <h2>Decorate a walkable pixel coworking room.</h2>
            <p className="panel-copy">
              Explore mode is for navigation. Decorate mode lets you place desks,
              plants, shelves, and shared tables on valid tiles only.
            </p>
          </div>
          <div className="panel-card">
            <p className="panel-label">Catalog</p>
            <ul className="catalog">
              <li className={selectedItem === "Desk" ? "selected" : undefined}>Desk</li>
              <li className={selectedItem === "Plant" ? "selected" : undefined}>Plant</li>
              <li className={selectedItem === "Bookshelf" ? "selected" : undefined}>Bookshelf</li>
              <li className={selectedItem === "Meeting Table" ? "selected" : undefined}>Meeting Table</li>
            </ul>
          </div>
          <div className="panel-card">
            <p className="panel-label">Online now</p>
            <ul className="roster">
              {onlinePlayers.length === 0 ? (
                <li className="muted">No one connected.</li>
              ) : (
                onlinePlayers.map((player) => (
                  <li key={player.id} className={player.isLocal ? "self" : undefined}>
                    <span>{player.displayName}</span>
                    <span>{player.isLocal ? "You" : "Online"}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="panel-card">
            <button className="panel-button" onClick={requestReset} type="button">
              Reset Room Layout
            </button>
          </div>
        </aside>
        <div className="stage" ref={containerRef} />
      </section>
    </main>
  );
}
