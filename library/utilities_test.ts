import { assert } from "./asserts.js";
import { test } from "./testing.js";
// @deno-types="./utilities.d.ts"
import {
  appendElement,
  deferUntil,
  deferUntilNextFrame,
  prependElement,
  randomUUID,
  renderFor,
} from "./utilities.js";

globalThis.requestAnimationFrame = (f: FrameRequestCallback) => setTimeout(f);

test(
  "deferUntil",
  () => {
    const e = { i: 0 };

    const t = setInterval(
      () => ++e.i,
      100,
    );

    return deferUntil(e, (x: { i: number }) => x.i > 20)
      .then((e) => {
        assert(e.i > 20);
        clearInterval(t);
      });
  },
);

test(
  "deferUntilNextFrame",
  () => deferUntilNextFrame(),
);

test("randomUUID", () => {
  const s = randomUUID();
  assert(s);
});

// test(
//   "renderFor: with appendElement",
//   (te: Element) => {
//     const es = renderFor(
//       te,
//       Array(10).fill(0).map(() => ({ key: randomUUID() })),
//       (_: Element, __: { key: string }, i: number) => {
//         const e = globalThis.document.createElement("div");
//         e.dataset.index = String(i);
//         return e;
//       },
//       appendElement,
//     );
//     assert(es.length === 10);
//     Array.from(te.children).forEach((e: Element, i: number) => {
//       assert((e as HTMLElement).dataset.index === String(i));
//     });
//   },
// );
//
// test(
//   "renderFor: with prependElement",
//   (te: Element) => {
//     renderFor(
//       te,
//       Array(10).fill(0).map(() => ({ key: randomUUID() })),
//       (_: Element, __: { key: string }, i: number) => {
//         const e = globalThis.document.createElement("div");
//         e.dataset.index = String(i);
//         return e;
//       },
//       prependElement,
//     );
//     Array.from(te.children).forEach((e: Element, i: number) => {
//       assert(
//         (e as HTMLElement).dataset.index ===
//           String((te.children.length - 1) - i),
//       );
//     });
//   },
// );
