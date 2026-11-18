import { parseSettings, type Settings } from "./domain/settings";
import type { Result } from "./domain/result";

export type SettingsStorage = {
  readonly load: () => Result<Settings, string>;
  readonly save: (settings: Settings) => void;
};

export type KeyValueStore = {
  readonly get: (key: string) => unknown;
  readonly set: (key: string, value: unknown) => void;
};

export const SETTINGS_KEY = "settings";

export const createSettingsStorage = (kv: KeyValueStore): SettingsStorage => ({
  load: () => parseSettings(kv.get(SETTINGS_KEY)),
  save: (settings) => {
    kv.set(SETTINGS_KEY, settings);
  },
});

export const createMemoryStore = (
  initial: Readonly<Record<string, unknown>> = {},
): KeyValueStore => {
  const map = new Map<string, unknown>(Object.entries(initial));
  return {
    get: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value);
    },
  };
};
