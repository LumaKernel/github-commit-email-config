import { expect, test } from "vitest";
import type { Settings } from "./domain/settings";
import {
  createMemoryStore,
  createSettingsStorage,
  SETTINGS_KEY,
} from "./storage";

test("保存した設定を読み戻せる", () => {
  const storage = createSettingsStorage(createMemoryStore());
  const settings: Settings = {
    version: 1,
    mappings: [{ pattern: "o", email: "a@b" }],
  };
  storage.save(settings);
  expect(storage.load()).toEqual({ ok: true, value: settings });
});

test("壊れた値はエラーとして返る", () => {
  const storage = createSettingsStorage(
    createMemoryStore({ [SETTINGS_KEY]: "broken" }),
  );
  expect(storage.load()).toEqual({
    ok: false,
    error: "settings is not an object",
  });
});
