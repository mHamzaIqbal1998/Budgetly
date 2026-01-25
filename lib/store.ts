// Global State Management with Zustand
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { FireflyCredentials } from '@/types/firefly';

interface AppState {
  credentials: FireflyCredentials | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setCredentials: (credentials: FireflyCredentials) => Promise<void>;
  loadCredentials: () => Promise<void>;
  clearCredentials: () => Promise<void>;
}

const CREDENTIALS_KEY = 'firefly_credentials';

export const useStore = create<AppState>((set) => ({
  credentials: null,
  isAuthenticated: false,
  isLoading: true,
  
  setCredentials: async (credentials: FireflyCredentials) => {
    try {
      await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials));
      set({ credentials, isAuthenticated: true });
    } catch (error) {
      console.error('Failed to save credentials:', error);
      throw error;
    }
  },
  
  loadCredentials: async () => {
    try {
      set({ isLoading: true });
      const stored = await SecureStore.getItemAsync(CREDENTIALS_KEY);
      if (stored) {
        const credentials = JSON.parse(stored) as FireflyCredentials;
        set({ credentials, isAuthenticated: true, isLoading: false });
      } else {
        set({ credentials: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
      set({ credentials: null, isAuthenticated: false, isLoading: false });
    }
  },
  
  clearCredentials: async () => {
    try {
      await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
      set({ credentials: null, isAuthenticated: false });
    } catch (error) {
      console.error('Failed to clear credentials:', error);
      throw error;
    }
  },
}));

