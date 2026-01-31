import { DEFAULT_DASHBOARD_VISIBLE_ORDER } from "@/constants/dashboard-sections";
import type { StateCreator } from "zustand";
import type { AppState } from "./types";

export const createDashboardSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "dashboardVisibleSectionIds"
    | "dashboardHiddenSectionIds"
    | "setDashboardSections"
    | "moveDashboardSectionToHidden"
    | "moveDashboardSectionToVisible"
    | "reorderDashboardVisible"
  >
> = (set) => ({
  dashboardVisibleSectionIds: [...DEFAULT_DASHBOARD_VISIBLE_ORDER],
  dashboardHiddenSectionIds: [],

  setDashboardSections: (visible, hidden) => {
    set({
      dashboardVisibleSectionIds: visible,
      dashboardHiddenSectionIds: hidden,
    });
  },

  moveDashboardSectionToHidden: (id) => {
    set((state) => {
      const visible = state.dashboardVisibleSectionIds.filter((s) => s !== id);
      const hidden = state.dashboardHiddenSectionIds.includes(id)
        ? state.dashboardHiddenSectionIds
        : [...state.dashboardHiddenSectionIds, id];
      return {
        dashboardVisibleSectionIds: visible,
        dashboardHiddenSectionIds: hidden,
      };
    });
  },

  moveDashboardSectionToVisible: (id) => {
    set((state) => {
      const hidden = state.dashboardHiddenSectionIds.filter((s) => s !== id);
      const visible = state.dashboardVisibleSectionIds.includes(id)
        ? state.dashboardVisibleSectionIds
        : [...state.dashboardVisibleSectionIds, id];
      return {
        dashboardVisibleSectionIds: visible,
        dashboardHiddenSectionIds: hidden,
      };
    });
  },

  reorderDashboardVisible: (fromIndex, toIndex) => {
    set((state) => {
      const visible = [...state.dashboardVisibleSectionIds];
      const [removed] = visible.splice(fromIndex, 1);
      if (removed === undefined) return state;
      visible.splice(toIndex, 0, removed);
      return { dashboardVisibleSectionIds: visible };
    });
  },
});
