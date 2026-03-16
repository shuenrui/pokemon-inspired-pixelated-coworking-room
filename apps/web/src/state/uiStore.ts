import { create } from "zustand";

type UiState = {
  mode: "explore" | "decorate";
  sceneTitle: string;
  selectedItem: string;
  placedCount: number;
  resetVersion: number;
  onlinePlayers: Array<{
    id: string;
    displayName: string;
    isLocal: boolean;
  }>;
  setMode: (mode: UiState["mode"]) => void;
  setSceneTitle: (sceneTitle: string) => void;
  setSelectedItem: (selectedItem: string) => void;
  setPlacedCount: (placedCount: number) => void;
  setOnlinePlayers: (onlinePlayers: UiState["onlinePlayers"]) => void;
  requestReset: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  mode: "explore",
  sceneTitle: "Loading room",
  selectedItem: "Desk",
  placedCount: 0,
  resetVersion: 0,
  onlinePlayers: [],
  setMode: (mode) => set({ mode }),
  setSceneTitle: (sceneTitle) => set({ sceneTitle }),
  setSelectedItem: (selectedItem) => set({ selectedItem }),
  setPlacedCount: (placedCount) => set({ placedCount }),
  setOnlinePlayers: (onlinePlayers) => set({ onlinePlayers }),
  requestReset: () => set((state) => ({ resetVersion: state.resetVersion + 1 }))
}));
