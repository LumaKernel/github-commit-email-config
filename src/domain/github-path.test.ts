import { describe, expect, test } from "vitest";
import { parsePullRequestPath } from "./github-path";

describe("parsePullRequestPath", () => {
  test.each([
    [
      "/Optimind-llc/platform-sandbox-1/pull/29",
      { owner: "Optimind-llc", repo: "platform-sandbox-1" },
    ],
    ["/a/b/pull/1/files", { owner: "a", repo: "b" }],
    ["/a/b/pull/1", { owner: "a", repo: "b" }],
  ])("PR ページ %s から owner/repo を取り出す", (path, expected) => {
    expect(parsePullRequestPath(path)).toEqual(expected);
  });

  test.each(["/a/b", "/a/b/pulls", "/a/b/pull/new", "/a/b/pull/12abc", "/"])(
    "PR ページでない %s は undefined",
    (path) => {
      expect(parsePullRequestPath(path)).toBeUndefined();
    },
  );
});
