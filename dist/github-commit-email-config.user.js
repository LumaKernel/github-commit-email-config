// ==UserScript==
// @name         GitHub Merge Commit Email Enforcer
// @namespace    https://github.com/LumaKernel/github-commit-email-config
// @version      0.1.0
// @description  Force the commit email selected in GitHub's merge dialog based on an owner/repo → email mapping
// @downloadURL  https://github.com/LumaKernel/github-commit-email-config/raw/main/dist/github-commit-email-config.user.js
// @updateURL    https://github.com/LumaKernel/github-commit-email-config/raw/main/dist/github-commit-email-config.user.js
// @match        https://github.com/*
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function() {
	"use strict";
	var _GM_getValue = (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
	var _GM_registerMenuCommand = (() => typeof GM_registerMenuCommand != "undefined" ? GM_registerMenuCommand : void 0)();
	var _GM_setValue = (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
	var ok = (value) => ({
		ok: true,
		value
	});
	var err = (error) => ({
		ok: false,
		error
	});
	var emptySettings = {
		version: 1,
		mappings: []
	};
	var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
	var isEmailMapping = (value) => isRecord(value) && typeof value["pattern"] === "string" && typeof value["email"] === "string";
	var parseSettings = (raw) => {
		if (raw === void 0) return ok(emptySettings);
		if (!isRecord(raw)) return err("settings is not an object");
		if (raw["version"] !== 1) return err(`unsupported settings version: ${String(raw["version"])}`);
		const mappings = raw["mappings"];
		if (!Array.isArray(mappings)) return err("mappings is not an array");
		const valid = mappings.filter(isEmailMapping);
		if (valid.length !== mappings.length) return err("mappings contains an invalid entry");
		return ok({
			version: 1,
			mappings: valid.map(({ pattern, email }) => ({
				pattern,
				email
			}))
		});
	};
	var PATTERN_RE = /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?$/;
	var EMAIL_RE = /^[^\s@]+@[^\s@]+$/;
	var normalizePattern = (pattern) => pattern.trim().toLowerCase();
	var validateMappings = (mappings) => mappings.flatMap((m, index) => {
		const pattern = normalizePattern(m.pattern);
		const email = m.email.trim();
		const isDuplicate = mappings.slice(0, index).some((prev) => normalizePattern(prev.pattern) === pattern);
		return [
			...PATTERN_RE.test(pattern) ? [] : [{
				kind: "invalid-pattern",
				index,
				pattern: m.pattern
			}],
			...EMAIL_RE.test(email) ? [] : [{
				kind: "invalid-email",
				index,
				email: m.email
			}],
			...isDuplicate ? [{
				kind: "duplicate-pattern",
				index,
				pattern: m.pattern
			}] : []
		];
	});
	var formatMappingError = (e) => {
		switch (e.kind) {
			case "invalid-pattern": return `#${String(e.index + 1)}: "${e.pattern}" は owner か owner/repo の形式で指定してください`;
			case "invalid-email": return `#${String(e.index + 1)}: "${e.email}" はメールアドレスではありません`;
			case "duplicate-pattern": return `#${String(e.index + 1)}: "${e.pattern}" が重複しています`;
		}
	};
	var buildSettings = (mappings) => {
		const nonEmpty = mappings.filter((m) => m.pattern.trim() !== "" || m.email.trim() !== "");
		const errors = validateMappings(nonEmpty);
		return errors.length > 0 ? err(errors) : ok({
			version: 1,
			mappings: nonEmpty.map((m) => ({
				pattern: normalizePattern(m.pattern),
				email: m.email.trim()
			}))
		});
	};
	var resolveRule = (mappings, ref) => {
		const repoKey = `${ref.owner}/${ref.repo}`.toLowerCase();
		const ownerKey = ref.owner.toLowerCase();
		const find = (key) => mappings.find((m) => normalizePattern(m.pattern) === key);
		const hit = find(repoKey) ?? find(ownerKey);
		return hit === void 0 ? void 0 : {
			pattern: hit.pattern,
			email: hit.email
		};
	};
	var decide = (ref, mappings, available) => {
		if (ref === void 0) return { kind: "not-a-pull-request" };
		const rule = resolveRule(mappings, ref);
		if (rule === void 0) return {
			kind: "no-rule",
			ref
		};
		const wanted = rule.email.toLowerCase();
		const exact = available.find((a) => a.toLowerCase() === wanted);
		return exact === void 0 ? {
			kind: "unavailable",
			rule,
			available
		} : {
			kind: "enforce",
			rule: {
				...rule,
				email: exact
			}
		};
	};
	var allowsMerge = (decision, selected) => {
		switch (decision.kind) {
			case "not-a-pull-request":
			case "no-rule": return true;
			case "enforce": return selected === decision.rule.email;
			case "unavailable": return false;
		}
	};
	var parsePullRequestPath = (pathname) => {
		const match = /^\/([^/]+)\/([^/]+)\/pull\/\d+(?:\/|$)/.exec(pathname);
		const owner = match?.[1];
		const repo = match?.[2];
		return owner !== void 0 && repo !== void 0 ? {
			owner,
			repo
		} : void 0;
	};
	var setControlledSelectValue = (select, value) => {
		if (!Reflect.set(HTMLSelectElement.prototype, "value", value, select)) throw new Error("failed to set HTMLSelectElement value");
		select.dispatchEvent(new Event("change", { bubbles: true }));
	};
	var EMAIL_SELECT_SELECTOR = ["select[aria-label=\"Select commit author email\"]", "select[name=\"commit_author_email\"]"].join(",");
	var CONFIRM_BUTTON_SELECTOR = "button[data-dd-action-name=\"pull_requests.merge.confirm_merge\"]";
	var findCommitEmailSelects = (root) => [...root.querySelectorAll(EMAIL_SELECT_SELECTOR)];
	var optionValues = (select) => [...select.options].map((o) => o.value);
	var mergeScopeOf = (select) => select.closest("[role=\"dialog\"]") ?? select.closest("form") ?? select.ownerDocument.body;
	var emailSelectForConfirmClick = (target) => {
		if (!(target instanceof Element)) return void 0;
		const button = target.closest(CONFIRM_BUTTON_SELECTOR);
		if (button === null) return void 0;
		const scope = button.closest("[role=\"dialog\"]") ?? button.closest("form");
		return scope === null ? void 0 : findCommitEmailSelects(scope)[0];
	};
	var anchorOf = (select) => select.closest("[data-component=\"FormControl\"]") ?? select;
	var button = (doc, label, onClick) => {
		const el = doc.createElement("button");
		el.type = "button";
		el.className = "btn btn-sm";
		el.textContent = label;
		el.addEventListener("click", onClick);
		return el;
	};
	var input = (doc, className, value, placeholder) => {
		const el = doc.createElement("input");
		el.type = "text";
		el.className = `form-control ${className}`;
		el.value = value;
		el.placeholder = placeholder;
		el.setAttribute("aria-label", placeholder);
		el.addEventListener("keydown", (e) => {
			if (e.key === "Enter") e.preventDefault();
		});
		return el;
	};
	var createRow = (doc, mapping) => {
		const row = doc.createElement("div");
		row.className = "gce-row";
		row.append(input(doc, "gce-pattern", mapping.pattern, "owner または owner/repo"), input(doc, "gce-email", mapping.email, "commit email"), button(doc, "削除", () => {
			row.remove();
		}));
		return row;
	};
	var readRows = (rows) => [...rows.querySelectorAll(".gce-row")].map((row) => ({
		pattern: row.querySelector(".gce-pattern")?.value ?? "",
		email: row.querySelector(".gce-email")?.value ?? ""
	}));
	var createSettingsPanel = (props) => {
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
		actions.append(button(doc, "追加", () => {
			rows.append(createRow(doc, props.suggestion()));
		}), button(doc, "保存", () => {
			const result = buildSettings(readRows(rows));
			if (!result.ok) {
				errors.replaceChildren(...result.error.map((e) => {
					const li = doc.createElement("li");
					li.textContent = formatMappingError(e);
					return li;
				}));
				return;
			}
			errors.replaceChildren();
			rows.replaceChildren(...result.value.mappings.map((m) => createRow(doc, m)));
			props.onSave(result.value);
		}));
		panel.append(rows, errors, actions);
		return panel;
	};
	var openSettingsDialog = (props) => {
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
			}
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
	var describeDecision = (decision) => {
		switch (decision.kind) {
			case "not-a-pull-request": return {
				tone: "info",
				text: "Pull Request ページではないため何もしません"
			};
			case "no-rule": return {
				tone: "info",
				text: `${decision.ref.owner}/${decision.ref.repo} に対応する commit email の強制設定はありません`
			};
			case "enforce": return {
				tone: "ok",
				text: `🔒 ${decision.rule.pattern} → ${decision.rule.email} を強制しています`
			};
			case "unavailable": return {
				tone: "danger",
				text: `⛔ ${decision.rule.pattern} → ${decision.rule.email} はこのアカウントで選択できません (候補: ${decision.available.join(", ")})。マージをブロックしています`
			};
		}
	};
	var blockedMessage = (decision, selected) => decision.kind === "enforce" ? `⛔ commit email が ${selected} になっています。${decision.rule.email} 以外ではマージできません` : describeDecision(decision).text;
	var STYLE_ID = "gce-style";
	var CSS = `
.gce-root { margin-block-start: 8px; font-size: 12px; display: grid; gap: 6px; }
.gce-bar { display: flex; align-items: center; gap: 8px; }
.gce-status { flex: 1; }
.gce-status[data-tone="ok"] { color: var(--fgColor-success, #1a7f37); }
.gce-status[data-tone="danger"] { color: var(--fgColor-danger, #d1242f); font-weight: 600; }
.gce-status[data-tone="info"] { color: var(--fgColor-muted, #59636e); }
.gce-panel { display: grid; gap: 6px; padding: 8px; border: 1px solid var(--borderColor-default, #d1d9e0); border-radius: 6px; }
.gce-panel[hidden] { display: none; }
.gce-row { display: grid; grid-template-columns: 1fr 1.4fr auto; gap: 6px; }
.gce-row input { min-width: 0; padding: 2px 6px; font: inherit; }
.gce-actions { display: flex; gap: 6px; justify-content: flex-end; }
.gce-errors { color: var(--fgColor-danger, #d1242f); margin: 0; padding-inline-start: 1.2em; }
.gce-errors:empty { display: none; }
.gce-dialog { max-inline-size: min(640px, 100vw - 32px); }
`;
	var ensureStyles = (doc) => {
		if (doc.getElementById("gce-style") !== null) return;
		const style = doc.createElement("style");
		style.id = STYLE_ID;
		style.textContent = CSS;
		doc.head.append(style);
	};
	var ROOT_CLASS = "gce-root";
	var setText = (el, text) => {
		if (el.textContent !== text) el.textContent = text;
	};
	var setAttr = (el, name, value) => {
		if (el.getAttribute(name) !== value) el.setAttribute(name, value);
	};
	var startApp = (deps) => {
		const { doc, storage } = deps;
		const win = doc.defaultView;
		if (win === null) throw new Error("document has no window");
		const loadSettings = () => {
			const loaded = storage.load();
			return loaded.ok ? { settings: loaded.value } : {
				settings: emptySettings,
				loadError: loaded.error
			};
		};
		const decisionFor = (select) => decide(parsePullRequestPath(deps.getPathname()), loadSettings().settings.mappings, optionValues(select));
		const suggestionFor = (select) => () => ({
			pattern: parsePullRequestPath(deps.getPathname())?.owner ?? "",
			email: select?.value ?? ""
		});
		const renderStatus = (select, view) => {
			const status = mergeScopeOf(select).querySelector(`.${ROOT_CLASS} .gce-status`);
			if (status === null) return;
			setAttr(status, "data-tone", view.tone);
			setText(status, view.text);
		};
		const enforced = new WeakSet();
		const enforce = (select) => {
			const decision = decisionFor(select);
			if (decision.kind === "enforce" && select.value !== decision.rule.email) setControlledSelectValue(select, decision.rule.email);
			const { loadError } = loadSettings();
			renderStatus(select, loadError === void 0 ? describeDecision(decision) : {
				tone: "danger",
				text: `設定の読み込みに失敗しました: ${loadError}`
			});
		};
		const mountWidget = (select) => {
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
				const existing = root.querySelector(".gce-panel");
				if (existing !== null) {
					existing.remove();
					return;
				}
				root.append(createSettingsPanel({
					doc,
					initial: loadSettings().settings,
					suggestion: suggestionFor(select),
					onSave: (settings) => {
						storage.save(settings);
						scan();
					}
				}));
			});
			anchorOf(select).after(root);
		};
		const scan = () => {
			findCommitEmailSelects(doc).forEach((select) => {
				mountWidget(select);
				if (!enforced.has(select)) {
					enforced.add(select);
					select.addEventListener("change", () => {
						enforce(select);
					});
				}
				enforce(select);
			});
		};
		const onClickCapture = (event) => {
			const select = emailSelectForConfirmClick(event.target);
			if (select === void 0) return;
			const decision = decisionFor(select);
			if (allowsMerge(decision, select.value)) return;
			event.preventDefault();
			event.stopImmediatePropagation();
			renderStatus(select, {
				tone: "danger",
				text: blockedMessage(decision, select.value)
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
		observer.observe(doc.body, {
			childList: true,
			subtree: true
		});
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
					}
				});
			},
			dispose: () => {
				observer.disconnect();
				win.removeEventListener("click", onClickCapture, true);
			}
		};
	};
	var SETTINGS_KEY = "settings";
	var createSettingsStorage = (kv) => ({
		load: () => parseSettings(kv.get(SETTINGS_KEY)),
		save: (settings) => {
			kv.set(SETTINGS_KEY, settings);
		}
	});
	_GM_registerMenuCommand("Commit email mapping を編集", startApp({
		doc: document,
		storage: createSettingsStorage({
			get: (key) => _GM_getValue(key),
			set: (key, value) => {
				_GM_setValue(key, value);
			}
		}),
		getPathname: () => location.pathname
	}).openSettings);
})();
