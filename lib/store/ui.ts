import type { StateCreator } from "zustand";
import type { AppState } from "./types";

export const createUiSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    "balanceVisible" | "toggleBalanceVisibility" | "themeMode" | "setThemeMode"
  >
> = (set) => ({
  balanceVisible: true,
  themeMode: "system",

  toggleBalanceVisibility: () => {
    set((state) => ({ balanceVisible: !state.balanceVisible }));
  },

  setThemeMode: (mode) => {
    set({ themeMode: mode });
  },
});
