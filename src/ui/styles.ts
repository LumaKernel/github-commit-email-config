export const STYLE_ID = "gce-style";

const CSS = `
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

export const ensureStyles = (doc: Document): void => {
  if (doc.getElementById(STYLE_ID) !== null) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.append(style);
};
