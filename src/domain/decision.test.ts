import { describe, expect, test } from "vitest";
import { allowsMerge, decide, type Decision } from "./decision";

const mappings = [{ pattern: "org", email: "Work@Example.com" }];
const ref = { owner: "org", repo: "r" };

describe("decide", () => {
  test("PR ページでなければ not-a-pull-request", () => {
    expect(decide(undefined, mappings, [])).toEqual({
      kind: "not-a-pull-request",
    });
  });

  test("マッピングがなければ no-rule", () => {
    expect(decide({ owner: "x", repo: "r" }, mappings, ["a@b"])).toEqual({
      kind: "no-rule",
      ref: { owner: "x", repo: "r" },
    });
  });

  test("候補にあれば候補側の表記で enforce", () => {
    expect(decide(ref, mappings, ["a@b", "work@example.com"])).toEqual({
      kind: "enforce",
      rule: { pattern: "org", email: "work@example.com" },
    });
  });

  test("候補になければ unavailable", () => {
    expect(decide(ref, mappings, ["a@b"])).toEqual({
      kind: "unavailable",
      rule: { pattern: "org", email: "Work@Example.com" },
      available: ["a@b"],
    });
  });
});

describe("allowsMerge", () => {
  const rule = { pattern: "org", email: "w@e" };
  const cases: readonly (readonly [Decision, string, boolean])[] = [
    [{ kind: "not-a-pull-request" }, "any", true],
    [{ kind: "no-rule", ref }, "any", true],
    [{ kind: "enforce", rule }, "w@e", true],
    [{ kind: "enforce", rule }, "other@e", false],
    [{ kind: "unavailable", rule, available: [] }, "w@e", false],
  ];
  test.each(cases)(
    "%j で %s 選択時の許可は %s",
    (decision, selected, expected) => {
      expect(allowsMerge(decision, selected)).toBe(expected);
    },
  );
});
