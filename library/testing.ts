import { maybeCall, noop, randomUUID } from "./utilities.ts";
import { CustomElement, CustomElementConstructor, State } from "./component.ts";

export const TestsSymbol = Symbol.for("fc-tests");

export const constructComponent = <
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
>(Component: CustomElementConstructor<S, E>): E => {
  if ("customElements" in globalThis) {
    const uuid = `iy-${randomUUID()}`;
    globalThis.customElements.define(uuid, Component);
    return globalThis.document.createElement(uuid) as unknown as E;
  } else return new Component();
};

export type AssertFunction<
  // deno-lint-ignore no-explicit-any
  F extends (...xs: Array<any>) => any,
> = {
  (
    assert: (
      xs: Parameters<F>, // Arguments as an Array for the current call
      i: number, // Number of the current call
      zs: Array<Parameters<F>>, // Array of all the arguments of all the calls
    ) => void | never,
  ): F extends undefined ? void : ReturnType<F>;
  callCount: number;
  called: boolean;
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
export const factorizeSpy = <
  // deno-lint-ignore no-explicit-any
  F extends (...xs: Array<any>) => any,
>(f = noop as F): [
  F,
  AssertFunction<F>,
] => {
  type XS = Parameters<F>;
  type T = ReturnType<F>;
  const axs: Array<Parameters<F>> = [];
  let i = 0;
  let called = false;
  return [
    ((...xs: XS): T => {
      called = true;
      axs.push(xs);
      i++;

      return f(...xs);
    }) as F,
    Object.defineProperties(
      (g: (xs: XS, i: number, ys: Array<XS>) => void | never) => {
        axs.forEach((xs, i, ys) => g(xs, i, ys));
      },
      {
        callCount: {
          get: () => i,
        },
        called: {
          get: () => called,
        },
      },
    ) as AssertFunction<F>,
  ];
};

export const getTests = (x: string) =>
  (Reflect.get(globalThis, TestsSymbol) as Map<
    string,
    Map<string, () => void | never>
  >)?.get(x)?.entries();

export const test = (
  name: string,
  f: () => void | never,
  g?: () => boolean,
) => {
  if (g && !g()) return;
  if (Reflect.has(globalThis, "Deno") && f.length === 0) {
    return Reflect.get(globalThis, "Deno").test(name, f);
  }
  if (!Reflect.has(globalThis, TestsSymbol)) {
    Object.defineProperty(globalThis, TestsSymbol, {
      value: new Map(),
      writable: true,
    });
  }
  let tests = Reflect.get(globalThis, TestsSymbol).get(
    globalThis.location?.href,
  );
  if (!tests) {
    tests = new Map();
    Reflect.get(globalThis, TestsSymbol).set(globalThis.location?.href, tests);
  }
  tests.set(f, { name });
};

export const withDom = <E extends Element>(
  f: (e: E) => void | never,
  template = "<div></div>",
): () => void => {
  if (!globalThis.requestAnimationFrame) {
    globalThis.requestAnimationFrame = (f) => setTimeout(f);
  }

  if ("DocumentFragment" in globalThis) {
    const $t = globalThis.document.createElement("template");
    $t.innerHTML = template;

    /*
      When the test is ran within a browser, the test-runner will pass an Element to append
      the testing environment.
    */
    // deno-lint-ignore ban-ts-comment
    // @ts-ignore
    return (e: E) => {
      e.appendChild($t.content.cloneNode(true));
      return () => f(e);
    };
  }

  return () =>
    Promise.all(
      [
        "https://deno.land/x/deno_dom@v0.1.30-alpha/deno-dom-wasm.ts",
        "https://deno.land/x/deno_dom@v0.1.30-alpha/src/constructor-lock.ts",
      ].map((x) => import(x)),
    )
      .then(([{ DOMParser, Element }, { CTOR_KEY }]) => {
        const document = new DOMParser().parseFromString(template, "text/html");

        Reflect.defineProperty(globalThis, "HTMLElement", {
          value: class HTMLElement extends Element {
            constructor() {
              super("test", null, [], CTOR_KEY);
            }
            adoptedCallback() {}
            attributeChangedCallback(_n: string, _o: string, _v: string) {}
            connectedCallback() {}
            disconnectedCallback() {}
            setAttribute(n: string, v: string) {
              this.attributeChangedCallback(n, this.getAttribute(n), v);
              Element.prototype.setAttribute.call(this, n, v);
            }
          },
          writable: true,
        });
        globalThis.document = document;

        return maybeCall(() => f(document as E))
          .finally(() => {
            Reflect.defineProperty(globalThis, "HTMLElement", {
              value: undefined,
              writable: true,
            });
            Reflect.defineProperty(globalThis, "document", {
              value: undefined,
              writable: true,
            });
          });
      });
};
