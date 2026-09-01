import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** Keychain / Keystore sur mobile, AsyncStorage sur web. */
const nativeSecure = Platform.OS !== 'web';

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    try {
      if (nativeSecure) return await SecureStore.getItemAsync(key);
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      if (nativeSecure) await SecureStore.setItemAsync(key, value);
      else await AsyncStorage.setItem(key, value);
    } catch {
      /* stockage indisponible : session en mémoire uniquement */
    }
  },
  async remove(key: string): Promise<void> {
    try {
      if (nativeSecure) await SecureStore.deleteItemAsync(key);
      else await AsyncStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },
};

export const appStorage = {
  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  async setJSON(key: string, value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* noop */
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },
};
