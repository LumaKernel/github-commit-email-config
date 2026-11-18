import {
  buildSettings,
  formatMappingError,
  type EmailMapping,
  type Settings,
} from "../domain/settings";

export type SettingsPanelProps = {
  readonly doc: Document;
  readonly initial: Settings;
  /** 「追加」時の初期値 (現在の owner と選択中 email など) */
  readonly suggestion: () => EmailMapping;
  readonly onSave: (settings: Settings) => void;
};

const button = (
  doc: Document,
  label: string,
  onClick: () => void,
): HTMLButtonElement => {
  const el = doc.createElement("button");
  el.type = "button";
  el.className = "btn btn-sm";
  el.textContent = label;
  el.addEventListener("click", onClick);
  return el;
};

const input = (
  doc: Document,
  className: string,
  value: string,
  placeholder: string,
) => {
  const el = doc.createElement("input");
  el.type = "text";
  el.className = `form-control ${className}`;
  el.value = value;
  el.placeholder = placeholder;
  el.setAttribute("aria-label", placeholder);
  // 旧 UI の <form> 内で Enter するとマージが送信されるのを防ぐ
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.preventDefault();
  });
  return el;
};

const createRow = (doc: Document, mapping: EmailMapping): HTMLElement => {
  const row = doc.createElement("div");
  row.className = "gce-row";
  row.append(
    input(doc, "gce-pattern", mapping.pattern, "owner または owner/repo"),
    input(doc, "gce-email", mapping.email, "commit email"),
    button(doc, "削除", () => {
      row.remove();
    }),
  );
  return row;
};

const readRows = (rows: HTMLElement): readonly EmailMapping[] =>
  [...rows.querySelectorAll(".gce-row")].map((row) => ({
    pattern: row.querySelector<HTMLInputElement>(".gce-pattern")?.value ?? "",
    email: row.querySelector<HTMLInputElement>(".gce-email")?.value ?? "",
  }));

export const createSettingsPanel = (props: SettingsPanelProps): HTMLElement => {
  const { doc } = props;
  const panel = doc.createElement("div");
  panel.className = "gce-panel";

  const rows = doc.createElement("div");
  rows.className = "gce-rows";
  rows.append(...props.initial.mappings.map((m) => createRow(doc, m)));

  const errors = doc.createElement("ul");
  errors.className = "gce-errors";
  errors.setAttribute("role", "alert");

  const actions = doc.createElement("div");
  actions.className = "gce-actions";
  actions.append(
    button(doc, "追加", () => {
      rows.append(createRow(doc, props.suggestion()));
    }),
    button(doc, "保存", () => {
      const result = buildSettings(readRows(rows));
      if (!result.ok) {
        errors.replaceChildren(
          ...result.error.map((e) => {
            const li = doc.createElement("li");
            li.textContent = formatMappingError(e);
            return li;
          }),
        );
        return;
      }
      errors.replaceChildren();
      rows.replaceChildren(
        ...result.value.mappings.map((m) => createRow(doc, m)),
      );
      props.onSave(result.value);
    }),
  );

  panel.append(rows, errors, actions);
  return panel;
};

/** マージダイアログ外 (メニューコマンド) から開くための <dialog> 版 */
export const openSettingsDialog = (
  props: SettingsPanelProps,
): HTMLDialogElement => {
  const { doc } = props;
  const dialog = doc.createElement("dialog");
  dialog.className = "gce-dialog";
  const title = doc.createElement("h2");
  title.textContent = "Commit email mapping";
  const panel = createSettingsPanel({
    ...props,
    onSave: (settings) => {
      props.onSave(settings);
      dialog.close();
    },
  });
  const close = button(doc, "閉じる", () => {
    dialog.close();
  });
  dialog.addEventListener("close", () => {
    dialog.remove();
  });
  dialog.append(title, panel, close);
  doc.body.append(dialog);
  dialog.showModal();
  return dialog;
};
