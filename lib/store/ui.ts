import type { StateCreator } from "zustand";
import type { AppState } from "./types";

export const createUiSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<AppState, "balanceVisible" | "toggleBalanceVisibility">
> = (set) => ({
  balanceVisible: true,

  toggleBalanceVisibility: () => {
    set((state) => ({ balanceVisible: !state.balanceVisible }));
  },
});
