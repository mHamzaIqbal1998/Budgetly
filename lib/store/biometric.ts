import type { StateCreator } from "zustand";
import type { AppState } from "./types";

export const createBiometricSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "biometricEnabled"
    | "biometricUnlocked"
    | "setBiometricEnabled"
    | "setBiometricUnlocked"
  >
> = (set) => ({
  biometricEnabled: false,
  biometricUnlocked: false,

  setBiometricEnabled: (enabled: boolean) => {
    set({ biometricEnabled: enabled });
  },

  setBiometricUnlocked: (unlocked: boolean) => {
    set({ biometricUnlocked: unlocked });
  },
});
