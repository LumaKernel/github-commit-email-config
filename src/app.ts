import { allowsMerge, decide, type Decision } from "./domain/decision";
import { parsePullRequestPath } from "./domain/github-path";
import {
  emptySettings,
  type EmailMapping,
  type Settings,
} from "./domain/settings";
import { setControlledSelectValue } from "./dom/controlled-select";
import {
  anchorOf,
  emailSelectForConfirmClick,
  findCommitEmailSelects,
  mergeScopeOf,
  optionValues,
} from "./dom/merge-dialog";
import type { SettingsStorage } from "./storage";
import { createSettingsPanel, openSettingsDialog } from "./ui/settings-panel";
import { blockedMessage, describeDecision, type StatusView } from "./ui/status";
import { ensureStyles } from "./ui/styles";

export type AppDeps = {
  readonly doc: Document;
  readonly storage: SettingsStorage;
  readonly getPathname: () => string;
};

export type App = {
  /** DOM を走査して強制・UI 更新を行う (MutationObserver からも呼ばれる) */
  readonly scan: () => void;
  readonly openSettings: () => void;
  readonly dispose: () => void;
};

const ROOT_CLASS = "gce-root";

const setText = (el: Element, text: string): void => {
  // MutationObserver の無限ループを避けるため、差分があるときだけ書き換える
  if (el.textContent !== text) el.textContent = text;
};

const setAttr = (el: Element, name: string, value: string): void => {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

export const startApp = (deps: AppDeps): App => {
  const { doc, storage } = deps;
  const win = doc.defaultView;
  if (win === null) throw new Error("document has no window");

  const loadSettings = (): {
    readonly settings: Settings;
    readonly loadError?: string;
  } => {
    const loaded = storage.load();
    return loaded.ok
      ? { settings: loaded.value }
      : { settings: emptySettings, loadError: loaded.error };
  };

  const decisionFor = (select: HTMLSelectElement): Decision =>
    decide(
      parsePullRequestPath(deps.getPathname()),
      loadSettings().settings.mappings,
      optionValues(select),
    );

  const suggestionFor =
    (select: HTMLSelectElement | undefined) => (): EmailMapping => ({
      pattern: parsePullRequestPath(deps.getPathname())?.owner ?? "",
      email: select?.value ?? "",
    });

  const renderStatus = (select: HTMLSelectElement, view: StatusView): void => {
    const status = mergeScopeOf(select).querySelector(
      `.${ROOT_CLASS} .gce-status`,
    );
    if (status === null) return;
    setAttr(status, "data-tone", view.tone);
    setText(status, view.text);
  };

  const enforced = new WeakSet<HTMLSelectElement>();

  const enforce = (select: HTMLSelectElement): void => {
    const decision = decisionFor(select);
    if (decision.kind === "enforce" && select.value !== decision.rule.email) {
      setControlledSelectValue(select, decision.rule.email);
    }
    const { loadError } = loadSettings();
    renderStatus(
      select,
      loadError === undefined
        ? describeDecision(decision)
        : {
            tone: "danger",
            text: `設定の読み込みに失敗しました: ${loadError}`,
          },
    );
  };

  const mountWidget = (select: HTMLSelectElement): void => {
    if (mergeScopeOf(select).querySelector(`.${ROOT_CLASS}`) !== null) return;
    const root = doc.createElement("div");
    root.className = ROOT_CLASS;
    const bar = doc.createElement("div");
    bar.className = "gce-bar";
    const status = doc.createElement("span");
    status.className = "gce-status";
    status.setAttribute("role", "status");
    const toggle = doc.createElement("button");
    toggle.type = "button";
    toggle.className = "btn btn-sm gce-toggle";
    toggle.textContent = "Email mapping 設定";
    bar.append(status, toggle);
    root.append(bar);

    toggle.addEventListener("click", () => {
      const existing = root.querySelector<HTMLElement>(".gce-panel");
      if (existing !== null) {
        existing.remove();
        return;
      }
      root.append(
        createSettingsPanel({
          doc,
          initial: loadSettings().settings,
          suggestion: suggestionFor(select),
          onSave: (settings) => {
            storage.save(settings);
            scan();
          },
        }),
      );
    });

    anchorOf(select).after(root);
  };

  const scan = (): void => {
    findCommitEmailSelects(doc).forEach((select) => {
      mountWidget(select);
      if (!enforced.has(select)) {
        enforced.add(select);
        // ユーザーが手動で変えても強制し直す
        select.addEventListener("change", () => {
          enforce(select);
        });
      }
      enforce(select);
    });
  };

  // React のハンドラより先に走らせるため window の capture で止める
  const onClickCapture = (event: MouseEvent): void => {
    const select = emailSelectForConfirmClick(event.target);
    if (select === undefined) return;
    const decision = decisionFor(select);
    if (allowsMerge(decision, select.value)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    renderStatus(select, {
      tone: "danger",
      text: blockedMessage(decision, select.value),
    });
  };
  win.addEventListener("click", onClickCapture, true);

  let scheduled = false;
  const observer = new win.MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      scan();
    });
  });
  observer.observe(doc.body, { childList: true, subtree: true });

  ensureStyles(doc);
  scan();

  return {
    scan,
    openSettings: () => {
      openSettingsDialog({
        doc,
        initial: loadSettings().settings,
        suggestion: suggestionFor(findCommitEmailSelects(doc)[0]),
        onSave: (settings) => {
          storage.save(settings);
          scan();
        },
      });
    },
    dispose: () => {
      observer.disconnect();
      win.removeEventListener("click", onClickCapture, true);
    },
  };
};
