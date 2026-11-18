import { describe, expect, test } from "vitest";
import {
  buildSettings,
  emptySettings,
  formatMappingError,
  parseSettings,
  resolveRule,
} from "./settings";

describe("parseSettings", () => {
  test("未保存 (undefined) なら空の設定", () => {
    expect(parseSettings(undefined)).toEqual({
      ok: true,
      value: emptySettings,
    });
  });

  test("正しい形式なら余分なプロパティを落として読み込む", () => {
    expect(
      parseSettings({
        version: 1,
        mappings: [{ pattern: "a", email: "x@y", extra: 1 }],
      }),
    ).toMatchInlineSnapshot(`
      {
        "ok": true,
        "value": {
          "mappings": [
            {
              "email": "x@y",
              "pattern": "a",
            },
          ],
          "version": 1,
        },
      }
    `);
  });

  test.each([
    [null, "settings is not an object"],
    [[], "settings is not an object"],
    [{ version: 2, mappings: [] }, "unsupported settings version: 2"],
    [{ version: 1, mappings: {} }, "mappings is not an array"],
    [
      { version: 1, mappings: [{ pattern: "a" }] },
      "mappings contains an invalid entry",
    ],
  ])("壊れた値 %j はエラー", (raw, error) => {
    expect(parseSettings(raw)).toEqual({ ok: false, error });
  });
});

describe("buildSettings", () => {
  test("前後空白と大文字を正規化し、空行は捨てる", () => {
    expect(
      buildSettings([
        { pattern: " Optimind-LLC ", email: " me@optimind.tech " },
        { pattern: "", email: "  " },
        { pattern: "LumaKernel/foo", email: "world@luma.email" },
      ]),
    ).toMatchInlineSnapshot(`
      {
        "ok": true,
        "value": {
          "mappings": [
            {
              "email": "me@optimind.tech",
              "pattern": "optimind-llc",
            },
            {
              "email": "world@luma.email",
              "pattern": "lumakernel/foo",
            },
          ],
          "version": 1,
        },
      }
    `);
  });

  test("不正なパターン・メール・重複をすべて報告する", () => {
    const result = buildSettings([
      { pattern: "a/b/c", email: "x@y" },
      { pattern: "ok", email: "not-an-email" },
      { pattern: "OK", email: "x@y" },
    ]);
    expect(result.ok ? [] : result.error.map(formatMappingError))
      .toMatchInlineSnapshot(`
      [
        "#1: "a/b/c" は owner か owner/repo の形式で指定してください",
        "#2: "not-an-email" はメールアドレスではありません",
        "#3: "OK" が重複しています",
      ]
    `);
  });
});

describe("resolveRule", () => {
  const mappings = [
    { pattern: "optimind-llc", email: "work@optimind.tech" },
    { pattern: "optimind-llc/oss", email: "me@luma.email" },
  ];

  test("owner/repo 指定が owner 指定より優先される (大文字小文字は無視)", () => {
    expect(
      resolveRule(mappings, { owner: "Optimind-llc", repo: "OSS" }),
    ).toEqual({
      pattern: "optimind-llc/oss",
      email: "me@luma.email",
    });
  });

  test("repo 指定がなければ owner 指定にフォールバック", () => {
    expect(
      resolveRule(mappings, { owner: "Optimind-llc", repo: "app" })?.email,
    ).toBe("work@optimind.tech");
  });

  test("該当なしなら undefined", () => {
    expect(
      resolveRule(mappings, { owner: "other", repo: "app" }),
    ).toBeUndefined();
  });
});
