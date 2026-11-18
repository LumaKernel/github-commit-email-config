/**
 * GitHub のマージ確認ダイアログの DOM 構造に依存する部分をここに集約する。
 * GitHub 側の変更で壊れたらこのファイルと merge-dialog.test.ts の fixture を更新する。
 *
 * 2026-11 時点の構造:
 *   div[role=dialog] > ... > select[aria-label="Select commit author email"]
 *   button[data-dd-action-name="pull_requests.merge.confirm_merge"]
 */
const EMAIL_SELECT_SELECTOR = [
  'select[aria-label="Select commit author email"]',
  'select[name="commit_author_email"]',
].join(",");

const CONFIRM_BUTTON_SELECTOR =
  'button[data-dd-action-name="pull_requests.merge.confirm_merge"]';

export const findCommitEmailSelects = (
  root: ParentNode,
): readonly HTMLSelectElement[] => [
  ...root.querySelectorAll<HTMLSelectElement>(EMAIL_SELECT_SELECTOR),
];

export const optionValues = (select: HTMLSelectElement): readonly string[] =>
  [...select.options].map((o) => o.value);

/** select を含むマージフォームの範囲 (ダイアログ優先、なければ form) */
export const mergeScopeOf = (select: HTMLSelectElement): Element =>
  select.closest('[role="dialog"]') ??
  select.closest("form") ??
  select.ownerDocument.body;

/** クリックされた要素がマージ確定ボタンなら、その確定対象の email select を返す */
export const emailSelectForConfirmClick = (
  target: EventTarget | null,
): HTMLSelectElement | undefined => {
  if (!(target instanceof Element)) return undefined;
  const button = target.closest(CONFIRM_BUTTON_SELECTOR);
  if (button === null) return undefined;
  const scope = button.closest('[role="dialog"]') ?? button.closest("form");
  return scope === null ? undefined : findCommitEmailSelects(scope)[0];
};

/** 設定 UI の差し込み位置 (select を包む FormControl の直後) */
export const anchorOf = (select: HTMLSelectElement): Element =>
  select.closest('[data-component="FormControl"]') ?? select;
