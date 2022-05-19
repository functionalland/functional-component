import { maybeCall, randomUUID } from "./utilities.js";

export const TestsSymbol = Symbol.for("iy-tests");

export const constructComponent = (Component) => {
  if (globalThis.Deno) return new Component();
  else {
    const uuid = `iy-${randomUUID()}`;
    window.customElements.define(uuid, Component);
    return window.document.createElement(uuid);
  }
};

/**
 * Factorizes a testing Spy.
 *
 * ```js
 * const [f, assertF] = factorizeSpy(() => 66);
 * const compose = (f, g, x) => f(g(x));
 * const x = compose(f, (x) => x * 2, 42);
 * assert(x === 66);
 * assert(assertF.called);
 * assert(assertF.callCount === 1);
 * assertF((x) => assert(x === 84));
 * ```
 */
export const factorizeSpy = (f = () => undefined) => {
  const xs = [];
  let i = 0;
  let called = false;
  return [
    (...as) => {
      called = true;
      xs.push(as);
      i++;

      return f(...as);
    },
    Object.defineProperties(
      (g) => {
        xs.forEach((ys, i, zs) => g(ys, i, zs));
      },
      {
        callCount: {
          get: () => i,
        },
        called: {
          get: () => called,
        },
      },
    ),
  ];
};

export const test = (name, f) => {
  if (globalThis.Deno && f.length === 0) return globalThis.Deno.test(name, f);
  if (!window[TestsSymbol]) {
    window[TestsSymbol] = new Map();
  }
  let tests = window[TestsSymbol].get(window.location?.href);
  if (!tests) {
    tests = new Map();
    window[TestsSymbol].set(window.location?.href, tests);
  }
  tests.set(f, { name });
};

export const withDom = (f, template = "<div></div>") => {
  if (!globalThis.requestAnimationFrame) {
    globalThis.requestAnimationFrame = (f) => setTimeout(f);
  }

  if (globalThis.HTMLElement) return f;

  return () =>
    Promise.all(
      ["https://deno.land/x/deno_dom@v0.1.26-alpha/deno-dom-wasm.ts"].map((x) =>
        import(x)
      ),
    )
      .then(([{ DOMParser, Element }]) => {
        const document = new DOMParser().parseFromString(template, "text/html");

        globalThis.HTMLElement = class HTMLElement extends Element {};
        globalThis.document = document;

        return maybeCall(f, null, document)
          .finally(() => {
            window.HTMLElement = undefined;
            window.document = undefined;
          });
      });
};
