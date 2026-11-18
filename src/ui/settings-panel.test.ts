import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Settings } from "../domain/settings";
import { createSettingsPanel, openSettingsDialog } from "./settings-panel";

const initial: Settings = {
  version: 1,
  mappings: [{ pattern: "optimind-llc", email: "work@optimind.tech" }],
};

const rowsOf = (root: ParentNode) =>
  [...root.querySelectorAll(".gce-row")].map((row) => [
    row.querySelector<HTMLInputElement>(".gce-pattern")?.value,
    row.querySelector<HTMLInputElement>(".gce-email")?.value,
  ]);

const clickButton = (root: ParentNode, label: string, nth = 0): void => {
  const buttons = [...root.querySelectorAll("button")].filter(
    (b) => b.textContent === label,
  );
  const b = buttons[nth];
  if (b === undefined) throw new Error(`button ${label} not found`);
  b.click();
};

const fill = (
  root: ParentNode,
  selector: string,
  nth: number,
  value: string,
): void => {
  const el = root.querySelectorAll<HTMLInputElement>(selector)[nth];
  if (el === undefined)
    throw new Error(`${selector}[${String(nth)}] not found`);
  el.value = value;
};

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("createSettingsPanel", () => {
  const setup = () => {
    const onSave = vi.fn<(s: Settings) => void>();
    const panel = createSettingsPanel({
      doc: document,
      initial,
      suggestion: () => ({ pattern: "lumakernel", email: "world@luma.email" }),
      onSave,
    });
    document.body.append(panel);
    return { panel, onSave };
  };

  test("初期値を行として表示する", () => {
    expect(rowsOf(setup().panel)).toEqual([
      ["optimind-llc", "work@optimind.tech"],
    ]);
  });

  test("追加すると suggestion で行が増え、保存で正規化された設定が渡る", () => {
    const { panel, onSave } = setup();
    clickButton(panel, "追加");
    fill(panel, ".gce-pattern", 1, " LumaKernel/Foo ");
    clickButton(panel, "保存");
    expect(onSave.mock.calls).toMatchInlineSnapshot(`
      [
        [
          {
            "mappings": [
              {
                "email": "work@optimind.tech",
                "pattern": "optimind-llc",
              },
              {
                "email": "world@luma.email",
                "pattern": "lumakernel/foo",
              },
            ],
            "version": 1,
          },
        ],
      ]
    `);
    expect(rowsOf(panel)[1]).toEqual(["lumakernel/foo", "world@luma.email"]);
  });

  test("削除した行は保存されない", () => {
    const { panel, onSave } = setup();
    clickButton(panel, "削除");
    clickButton(panel, "保存");
    expect(onSave).toHaveBeenCalledWith({ version: 1, mappings: [] });
  });

  test("不正な入力ではエラーを表示して保存しない。直せばエラーは消える", () => {
    const { panel, onSave } = setup();
    fill(panel, ".gce-email", 0, "nope");
    clickButton(panel, "保存");
    expect({
      saved: onSave.mock.calls.length,
      errors: panel.querySelector(".gce-errors")?.textContent,
    }).toEqual({
      saved: 0,
      errors: '#1: "nope" はメールアドレスではありません',
    });

    fill(panel, ".gce-email", 0, "ok@optimind.tech");
    clickButton(panel, "保存");
    expect({
      saved: onSave.mock.calls.length,
      errors: panel.querySelector(".gce-errors")?.textContent,
    }).toEqual({ saved: 1, errors: "" });
  });

  test("入力欄の Enter はデフォルト動作 (旧 UI の form 送信) を抑止する", () => {
    const { panel } = setup();
    const input = panel.querySelector("input");
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      cancelable: true,
    });
    input?.dispatchEvent(event);
    const other = new KeyboardEvent("keydown", { key: "a", cancelable: true });
    input?.dispatchEvent(other);
    expect([event.defaultPrevented, other.defaultPrevented]).toEqual([
      true,
      false,
    ]);
  });
});

describe("openSettingsDialog", () => {
  test("モーダルで開き、保存すると閉じて DOM から消える", () => {
    const onSave = vi.fn<(s: Settings) => void>();
    const dialog = openSettingsDialog({
      doc: document,
      initial,
      suggestion: () => ({ pattern: "", email: "" }),
      onSave,
    });
    expect(dialog.open).toBe(true);
    clickButton(dialog, "保存");
    expect({
      saved: onSave.mock.calls.length,
      attached: dialog.isConnected,
    }).toEqual({
      saved: 1,
      attached: false,
    });
  });

  test("閉じるボタンで保存せず閉じる", () => {
    const onSave = vi.fn<(s: Settings) => void>();
    const dialog = openSettingsDialog({
      doc: document,
      initial,
      suggestion: () => ({ pattern: "", email: "" }),
      onSave,
    });
    clickButton(dialog, "閉じる");
    expect({
      saved: onSave.mock.calls.length,
      attached: dialog.isConnected,
    }).toEqual({
      saved: 0,
      attached: false,
    });
  });
});
