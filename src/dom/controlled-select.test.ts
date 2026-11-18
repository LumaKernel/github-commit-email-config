import { expect, test } from "vitest";
import { setControlledSelectValue } from "./controlled-select";

test("値を変更し、bubbling する change を発火する", () => {
  document.body.innerHTML = `<div><select><option value="a">a</option><option value="b">b</option></select></div>`;
  const select = document.querySelector("select");
  if (select === null) throw new Error("fixture");
  const seen: string[] = [];
  document.body.addEventListener("change", () => {
    seen.push(select.value);
  });

  setControlledSelectValue(select, "b");

  expect({ value: select.value, seen }).toEqual({ value: "b", seen: ["b"] });
});

test("インスタンス側で value を上書きされていてもプロトタイプの setter を使う (React の値トラッカー対策)", () => {
  document.body.innerHTML = `<select><option value="a">a</option><option value="b">b</option></select>`;
  const select = document.querySelector("select");
  if (select === null) throw new Error("fixture");
  const instanceWrites: string[] = [];
  Object.defineProperty(select, "value", {
    configurable: true,
    get: () => "tracked",
    set: (v: string) => {
      instanceWrites.push(v);
    },
  });

  setControlledSelectValue(select, "b");

  expect({ instanceWrites, selectedIndex: select.selectedIndex }).toEqual({
    instanceWrites: [],
    selectedIndex: 1,
  });
});
