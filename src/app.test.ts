import { afterEach, describe, expect, test } from "vitest";
import { startApp, type App } from "./app";
import type { Settings } from "./domain/settings";
import { setControlledSelectValue } from "./dom/controlled-select";
import {
  createMemoryStore,
  createSettingsStorage,
  SETTINGS_KEY,
} from "./storage";
import { EMAILS, mergeDialogHtml } from "./test/merge-dialog-fixture";

const PR_PATH = "/Optimind-llc/platform-sandbox-1/pull/29";

const settingsOf = (...mappings: Settings["mappings"]): Settings => ({
  version: 1,
  mappings,
});

let app: App | undefined;
afterEach(() => {
  app?.dispose();
  app = undefined;
  document.body.innerHTML = "";
});

const setup = ({
  stored,
  pathname = PR_PATH,
  selected = "markermails@gmail.com",
}: {
  readonly stored: unknown;
  readonly pathname?: string;
  readonly selected?: string;
}) => {
  document.body.innerHTML = mergeDialogHtml({ emails: EMAILS, selected });
  const kv = createMemoryStore({ [SETTINGS_KEY]: stored });
  app = startApp({
    doc: document,
    storage: createSettingsStorage(kv),
    getPathname: () => pathname,
  });
  const select = document.querySelector("select");
  const confirm = document.querySelector<HTMLButtonElement>(
    "[data-dd-action-name$=confirm_merge]",
  );
  if (select === null || confirm === null) throw new Error("fixture");
  return { app, kv, select, confirm };
};

const status = () => {
  const el = document.querySelector(".gce-status");
  return { tone: el?.getAttribute("data-tone"), text: el?.textContent };
};

/** React の onClick 相当: body まで届いたクリックを数える */
const countMergeClicks = (confirm: HTMLButtonElement) => {
  let count = 0;
  document.body.addEventListener("click", (e) => {
    if (e.target === confirm) count += 1;
  });
  return () => count;
};

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("マッピングがある org の PR", () => {
  const stored = settingsOf({
    pattern: "optimind-llc",
    email: "kawaguchi.teppei@optimind.tech",
  });

  test("ダイアログ表示時に email を強制し、状態を表示する", () => {
    const { select } = setup({ stored });
    expect({ value: select.value, status: status() }).toEqual({
      value: "kawaguchi.teppei@optimind.tech",
      status: {
        tone: "ok",
        text: "🔒 optimind-llc → kawaguchi.teppei@optimind.tech を強制しています",
      },
    });
  });

  test("ユーザーが別の email を選んでも戻す", () => {
    const { select } = setup({ stored });
    setControlledSelectValue(select, "world@luma.email");
    expect(select.value).toBe("kawaguchi.teppei@optimind.tech");
  });

  test("強制済みならマージ確定クリックは通す", () => {
    const { confirm } = setup({ stored });
    const merged = countMergeClicks(confirm);
    confirm.click();
    expect(merged()).toBe(1);
  });

  test("何らかの理由で別 email のままならマージ確定クリックを止める", () => {
    const { confirm, select } = setup({ stored });
    const merged = countMergeClicks(confirm);
    // change を発火させずに書き換える (強制をすり抜けたケース)
    select.value = "world@luma.email";
    confirm.click();
    expect({ merged: merged(), status: status() }).toEqual({
      merged: 0,
      status: {
        tone: "danger",
        text: "⛔ commit email が world@luma.email になっています。kawaguchi.teppei@optimind.tech 以外ではマージできません",
      },
    });
  });
});

describe("マッピングの email がアカウントの候補にない", () => {
  test("選択は変えずマージをブロックする", () => {
    const { confirm, select } = setup({
      stored: settingsOf({
        pattern: "optimind-llc",
        email: "nobody@example.com",
      }),
    });
    const merged = countMergeClicks(confirm);
    confirm.click();
    expect({
      value: select.value,
      merged: merged(),
      tone: status().tone,
    }).toEqual({
      value: "markermails@gmail.com",
      merged: 0,
      tone: "danger",
    });
  });
});

describe("マッピングがない / 対象外", () => {
  test("マッピングがなければ何も変えずマージも通す", () => {
    const { confirm, select } = setup({ stored: undefined });
    const merged = countMergeClicks(confirm);
    confirm.click();
    expect({ value: select.value, merged: merged(), status: status() }).toEqual(
      {
        value: "markermails@gmail.com",
        merged: 1,
        status: {
          tone: "info",
          text: "Optimind-llc/platform-sandbox-1 に対応する commit email の強制設定はありません",
        },
      },
    );
  });

  test("PR 以外のパスでは強制しない", () => {
    const { select } = setup({
      stored: settingsOf({
        pattern: "optimind-llc",
        email: "world@luma.email",
      }),
      pathname: "/Optimind-llc/platform-sandbox-1",
    });
    expect(select.value).toBe("markermails@gmail.com");
  });

  test("設定が壊れていたらエラーを表示し、強制しない", () => {
    const { select } = setup({ stored: { version: 99 } });
    expect({ value: select.value, status: status() }).toEqual({
      value: "markermails@gmail.com",
      status: {
        tone: "danger",
        text: "設定の読み込みに失敗しました: unsupported settings version: 99",
      },
    });
  });
});

describe("設定 UI", () => {
  const clickByText = (root: ParentNode, text: string) => {
    const b = [...root.querySelectorAll("button")].find(
      (x) => x.textContent === text,
    );
    if (b === undefined) throw new Error(`button ${text}`);
    b.click();
  };

  test("ダイアログ内から現在の owner と選択中 email を初期値にマッピングを追加すると即座に強制される", () => {
    const { kv, select } = setup({
      stored: undefined,
      selected: "world@luma.email",
    });
    clickByText(document, "Email mapping 設定");
    clickByText(document, "追加");
    expect(
      [...document.querySelectorAll<HTMLInputElement>(".gce-row input")].map(
        (i) => i.value,
      ),
    ).toEqual(["Optimind-llc", "world@luma.email"]);
    clickByText(document, "保存");
    setControlledSelectValue(select, "markermails@gmail.com");
    expect({ stored: kv.get(SETTINGS_KEY), value: select.value }).toEqual({
      stored: settingsOf({
        pattern: "optimind-llc",
        email: "world@luma.email",
      }),
      value: "world@luma.email",
    });
  });

  test("トグルで設定パネルを開閉する", () => {
    setup({ stored: undefined });
    clickByText(document, "Email mapping 設定");
    const opened = document.querySelectorAll(".gce-panel").length;
    clickByText(document, "Email mapping 設定");
    expect([opened, document.querySelectorAll(".gce-panel").length]).toEqual([
      1, 0,
    ]);
  });

  test("メニューコマンドからダイアログで設定できる", () => {
    const { kv, app } = setup({ stored: undefined });
    app.openSettings();
    const dialog = document.querySelector("dialog");
    if (dialog === null) throw new Error("dialog");
    clickByText(dialog, "追加");
    clickByText(dialog, "保存");
    expect(kv.get(SETTINGS_KEY)).toEqual(
      settingsOf({ pattern: "optimind-llc", email: "markermails@gmail.com" }),
    );
  });
});

describe("DOM 監視", () => {
  test("後から開いたマージダイアログにも適用され、UI は一度だけ差し込まれる", async () => {
    document.body.innerHTML = "";
    app = startApp({
      doc: document,
      storage: createSettingsStorage(
        createMemoryStore({
          [SETTINGS_KEY]: settingsOf({
            pattern: "optimind-llc",
            email: "world@luma.email",
          }),
        }),
      ),
      getPathname: () => PR_PATH,
    });
    document.body.insertAdjacentHTML(
      "beforeend",
      mergeDialogHtml({ emails: EMAILS, selected: "markermails@gmail.com" }),
    );
    await flush();
    await flush();
    expect({
      value: document.querySelector("select")?.value,
      widgets: document.querySelectorAll(".gce-root").length,
      styles: document.querySelectorAll("#gce-style").length,
    }).toEqual({ value: "world@luma.email", widgets: 1, styles: 1 });
  });

  test("dispose 後はクリックを止めない", () => {
    const { confirm, select, app } = setup({
      stored: settingsOf({
        pattern: "optimind-llc",
        email: "nobody@example.com",
      }),
    });
    app.dispose();
    const merged = countMergeClicks(confirm);
    confirm.click();
    expect([merged(), select.value]).toEqual([1, "markermails@gmail.com"]);
  });
});
