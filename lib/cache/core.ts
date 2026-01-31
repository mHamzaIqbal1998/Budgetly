import AsyncStorage from "@react-native-async-storage/async-storage";

export async function get<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

export async function set<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
    throw error;
  }
}

export async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Cache remove error for key ${key}:`, error);
    throw error;
  }
}

export async function clear(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith("cache_"));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error("Cache clear error:", error);
    throw error;
  }
}

export function isCacheStale(
  lastSynced: number,
  maxAgeHours: number = 24
): boolean {
  const now = Date.now();
  const ageInHours = (now - lastSynced) / (1000 * 60 * 60);
  return ageInHours > maxAgeHours;
}
