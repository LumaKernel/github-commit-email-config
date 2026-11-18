import { describe, expect, test } from "vitest";
import { blockedMessage, describeDecision } from "./status";

const rule = { pattern: "org", email: "w@e" };

describe("describeDecision", () => {
  test("各 Decision の表示", () => {
    expect([
      describeDecision({ kind: "not-a-pull-request" }),
      describeDecision({ kind: "no-rule", ref: { owner: "o", repo: "r" } }),
      describeDecision({ kind: "enforce", rule }),
      describeDecision({
        kind: "unavailable",
        rule,
        available: ["a@b", "c@d"],
      }),
    ]).toMatchInlineSnapshot(`
      [
        {
          "text": "Pull Request ページではないため何もしません",
          "tone": "info",
        },
        {
          "text": "o/r に対応する commit email の強制設定はありません",
          "tone": "info",
        },
        {
          "text": "🔒 org → w@e を強制しています",
          "tone": "ok",
        },
        {
          "text": "⛔ org → w@e はこのアカウントで選択できません (候補: a@b, c@d)。マージをブロックしています",
          "tone": "danger",
        },
      ]
    `);
  });
});

describe("blockedMessage", () => {
  test("enforce 中に別の email が選ばれていた場合", () => {
    expect(blockedMessage({ kind: "enforce", rule }, "x@y")).toBe(
      "⛔ commit email が x@y になっています。w@e 以外ではマージできません",
    );
  });

  test("それ以外は状態説明をそのまま使う", () => {
    expect(
      blockedMessage({ kind: "unavailable", rule, available: [] }, "x@y"),
    ).toContain("マージをブロック");
  });
});
