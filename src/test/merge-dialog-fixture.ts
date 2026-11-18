/**
 * 2026-11-17 に github.com の PR マージ確認ダイアログから採取した DOM を簡略化したもの。
 * GitHub 側の構造が変わったら dom/merge-dialog.ts とあわせて更新する。
 */
export const mergeDialogHtml = ({
  emails,
  selected,
}: {
  readonly emails: readonly string[];
  readonly selected: string;
}): string => `
<div role="dialog" aria-modal="true" data-component="Dialog">
  <h1>Confirm merge</h1>
  <div data-component="Dialog.Body">
    <div data-component="FormControl">
      <label>Commit message</label>
      <input type="text" value="chore: something (#29)">
    </div>
    <div class="ConfirmMergeContainer">
      <div data-component="FormControl">
        <label>Commit email</label>
        <span data-component="TextInput">
          <select aria-label="Select commit author email" data-component="Select">
            ${emails.map((e) => `<option value="${e}"${e === selected ? " selected" : ""}>${e}</option>`).join("")}
          </select>
        </span>
      </div>
    </div>
    <div>
      <button type="button" data-dd-action-name="pull_requests.merge.confirm_merge">Confirm squash and merge</button>
      <button type="button" data-dd-action-name="pull_requests.merge.cancel">Cancel</button>
    </div>
  </div>
</div>`;

export const EMAILS = [
  "markermails@gmail.com",
  "world@luma.email",
  "kawaguchi.teppei@optimind.tech",
];
