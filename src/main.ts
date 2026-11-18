import { GM_getValue, GM_registerMenuCommand, GM_setValue } from "$";
import { startApp } from "./app";
import { createSettingsStorage } from "./storage";

const app = startApp({
  doc: document,
  storage: createSettingsStorage({
    get: (key) => GM_getValue<unknown>(key),
    set: (key, value) => {
      GM_setValue(key, value);
    },
  }),
  getPathname: () => location.pathname,
});

GM_registerMenuCommand("Commit email mapping を編集", app.openSettings);
