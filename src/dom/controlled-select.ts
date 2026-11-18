/**
 * React の controlled <select> の値を変更する。
 * value を直接代入すると React の内部トラッカーに無視されるため、
 * プロトタイプの setter を receiver 指定で呼んでから change を発火する。
 */
export const setControlledSelectValue = (
  select: HTMLSelectElement,
  value: string,
): void => {
  if (!Reflect.set(HTMLSelectElement.prototype, "value", value, select)) {
    throw new Error("failed to set HTMLSelectElement value");
  }
  select.dispatchEvent(new Event("change", { bubbles: true }));
};
