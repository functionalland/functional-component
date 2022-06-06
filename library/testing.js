import { maybeCall, randomUUID } from "./utilities.js";

export const TestsSymbol = Symbol.for("iy-tests");

export const constructComponent = (Component) => {
  if ("customElements" in globalThis) {
    const uuid = `iy-${randomUUID()}`;
    globalThis.customElements.define(uuid, Component);
    return globalThis.document.createElement(uuid);
  } else return new Component();
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

export const getTests = (h) => globalThis[TestsSymbol]?.get(h)?.entries();

export const test = (name, f, g) => {
  if (g && !g()) return;
  if (globalThis.Deno && f.length === 0) return globalThis.Deno.test(name, f);
  if (!globalThis[TestsSymbol]) {
    globalThis[TestsSymbol] = new Map();
  }
  let tests = globalThis[TestsSymbol].get(globalThis.location?.href);
  if (!tests) {
    tests = new Map();
    globalThis[TestsSymbol].set(globalThis.location?.href, tests);
  }
  tests.set(f, { name });
};

export const withDom = (f, template = "<div></div>") => {
  if (!globalThis.requestAnimationFrame) {
    globalThis.requestAnimationFrame = (f) => setTimeout(f);
  }

  if ("DocumentFragment" in globalThis) {
    const $t = globalThis.document.createElement("template");
    $t.innerHTML = template;

    return (e) => {
      e.appendChild($t.content.cloneNode(true));
      return () => f(e);
    };
  }

  return () =>
    Promise.all(
      ["https://deno.land/x/deno_dom@v0.1.30-alpha/deno-dom-wasm.ts"].map((x) =>
        import(x)
      ),
    )
      .then(([{ DOMParser, Element }]) => {
        const document = new DOMParser().parseFromString(template, "text/html");

        globalThis.HTMLElement = class HTMLElement extends Element {};
        globalThis.document = document;

        return maybeCall(f, document)
          .finally(() => {
            window.HTMLElement = undefined;
            window.document = undefined;
          });
      });
};
