const playerIdStorageKey = "tiletown:player-id";
const playerNameStorageKey = "tiletown:player-name";

export function getPlayerSession() {
  if (typeof window === "undefined") {
    return {
      playerId: "player-local",
      displayName: "Guest Local"
    };
  }

  let playerId = window.localStorage.getItem(playerIdStorageKey);
  if (!playerId) {
    playerId = `player-${crypto.randomUUID()}`;
    window.localStorage.setItem(playerIdStorageKey, playerId);
  }

  let displayName = window.localStorage.getItem(playerNameStorageKey);
  if (!displayName) {
    displayName = `Guest ${playerId.slice(-4).toUpperCase()}`;
    window.localStorage.setItem(playerNameStorageKey, displayName);
  }

  return {
    playerId,
    displayName
  };
}
