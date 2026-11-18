import { beforeEach, describe, expect, test } from "vitest";
import { EMAILS, mergeDialogHtml } from "../test/merge-dialog-fixture";
import {
  anchorOf,
  emailSelectForConfirmClick,
  findCommitEmailSelects,
  mergeScopeOf,
  optionValues,
} from "./merge-dialog";

beforeEach(() => {
  document.body.innerHTML = mergeDialogHtml({
    emails: EMAILS,
    selected: EMAILS[0] ?? "",
  });
});

const theSelect = (): HTMLSelectElement => {
  const s = findCommitEmailSelects(document)[0];
  if (s === undefined) throw new Error("select not found");
  return s;
};

describe("merge dialog DOM", () => {
  test("commit email の select と候補を見つける", () => {
    expect(optionValues(theSelect())).toEqual(EMAILS);
  });

  test("旧 UI の name 属性の select も対象", () => {
    document.body.innerHTML = `<form><select name="commit_author_email"><option>a@b</option></select></form>`;
    expect(findCommitEmailSelects(document)).toHaveLength(1);
    expect(mergeScopeOf(theSelect()).tagName).toBe("FORM");
    expect(anchorOf(theSelect())).toBe(theSelect());
  });

  test("ダイアログも form もなければ body がスコープ", () => {
    document.body.innerHTML = `<select name="commit_author_email"></select>`;
    expect(mergeScopeOf(theSelect())).toBe(document.body);
  });

  test("差し込み位置は select を包む FormControl", () => {
    expect(anchorOf(theSelect()).textContent).toContain("Commit email");
  });

  test("確定ボタン (内側の要素を含む) のクリックから select を引ける", () => {
    const button = document.querySelector(
      "[data-dd-action-name$=confirm_merge]",
    );
    const inner = document.createElement("span");
    button?.append(inner);
    expect(emailSelectForConfirmClick(inner)).toBe(theSelect());
  });

  test.each([
    [
      "Cancel ボタン",
      () => document.querySelector("[data-dd-action-name$=cancel]"),
    ],
    ["非 Element", () => null],
    [
      "スコープ外の確定ボタン",
      () => {
        const b = document.createElement("button");
        b.dataset["ddActionName"] = "pull_requests.merge.confirm_merge";
        document.body.append(b);
        return b;
      },
    ],
  ])("%s は対象外", (_, target) => {
    expect(emailSelectForConfirmClick(target())).toBeUndefined();
  });
});
