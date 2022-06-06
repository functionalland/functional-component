import { maybeCall, parseSpineCaseToCamelCase } from "./utilities.js";

export const StateSymbol = Symbol();
export const ValidateAttributeSymbol = Symbol();

export type State = { [k: string]: unknown };
export type CustomElementConstructor<
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
> = {
  new (): E;
} & { observedAttributes: Array<string> };
export type CustomElement<S extends State> = HTMLElement & {
  adoptedCallback?(): void;
  attributeChangedCallback?(
    name: string,
    oldValue: string | null,
    newValue: string,
  ): void;
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  elements?: { [k: string]: Node };
  state: Partial<S>;
  [StateSymbol]: S;
  [ValidateAttributeSymbol]?: ValidateAttributeCallback<S, CustomElement<S>>;
};
export type AsyncRender<
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
> = ($e: E, s: S, e: Event) => Partial<S> | void;
export type AsyncRenderCallback<
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
> = (f: AsyncRender<S, E>) => (e: Event) => void;
export type RenderCallback<
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
> = (e: E, s: S, os?: { [k: string]: unknown }) => void;
export type ValidateAttributeCallback<
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
> = (
  a: {
    name: string;
    oldValue: Partial<S>[Extract<keyof Partial<S>, string>];
    value: Partial<S>[Extract<keyof Partial<S>, string>];
  },
  e: CustomElement<S>,
  s: S,
) => Partial<S> | boolean;

export type FactorizeCallback<
  S extends State = State,
  E extends CustomElement<S> = CustomElement<S>,
> = (
  Component: CustomElementConstructor<S, E>,
  render: RenderCallback<S, E>,
  s: S,
) => void;
export type FactorizeHOF<
  S extends State = State,
  E extends CustomElement<S> = CustomElement<S>,
> = (
  f: FactorizeCallback<S, E>,
) => void;
export type ConstructCallback<
  S extends State = State,
  E extends CustomElement<S> = CustomElement<S>,
> = (e: E) => void;
export type ConstructHOF<
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
> = (
  f: ConstructCallback<S, E>,
) => void;
export type HOF<
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
> = (
  factorize: FactorizeHOF<S, E>,
  construct: ConstructHOF<S, E>,
) => void;

export declare enum Callbacks {
  "adoptedCallback",
  "attributeChangedCallback",
  "connectedCallback",
  "disconnectedCallback",
}

export type LifeCycleCallback<
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
> =
  | ((
    element: E,
    render: AsyncRenderCallback<S, E>,
  ) => void)
  | ((
    element: E,
    render: AsyncRenderCallback<S, E>,
    name: string,
    oldValue: string,
    value: string,
  ) => S | void);

const asyncRender = <
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
>(
  element: E,
  render: RenderCallback<S, E>,
  observedAttributes: Array<string>,
) =>
  (f: AsyncRender<S, E>) =>
    (event: Event) => {
      if (!observedAttributes) return;

      const state = f(element, Object.assign({}, element[StateSymbol]), event);
      let z = false;

      if (state) {
        for (const k in state as S) {
          const isFromDataset = observedAttributes.includes(`data-${k}`);
          const isObservedAttribute = isFromDataset ||
            observedAttributes.includes(k);
          const v = state[k] as unknown as S[Extract<keyof S, string>];

          if (
            isObservedAttribute &&
            !element[ValidateAttributeSymbol]?.(
              {
                name: (isFromDataset) ? `data-${k}` : k,
                oldValue: element[StateSymbol][k] as typeof v,
                value: v,
              },
              element,
              Object.assign({}, element[StateSymbol]),
            )
          ) {
            continue;
          }

          element[StateSymbol][k] = v as typeof v;

          if (isFromDataset) {
            element.dataset[k] = String(v);
          } else if (isObservedAttribute) {
            element.setAttribute(k, String(v));
          } else {
            z = true;
          }
        }

        if (z) {
          render(element, Object.assign({}, element[StateSymbol]));
        }
      }
    };

const factorizeFunctionalComponentClass = <
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
>(TargetConstructor = HTMLElement) => (
  class FunctionalComponent extends TargetConstructor {
    constructor(gs: Array<ConstructCallback<S, E>>) {
      super();

      for (const g of gs) {
        g(this as unknown as E);
      }

      return this;
    }
  }
);

const parseDatasetToState = (d: string): string =>
  parseSpineCaseToCamelCase(d.replace(/^data-/, ""));

const wrapRender = <
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
>(
  render: RenderCallback<S, E>,
) => {
  const ms = new Map();
  const rs = new Map();

  return (e: E, s: S, options?: { [k: string]: unknown }) => {
    let ss = ms.get(e);
    let r = rs.get(e);
    if (!ss) {
      ss = [];
      ms.set(e, ss);
    }
    if (!r) {
      r = false;
      rs.set(e, r);
    }
    ss.push(s);
    if (!r) {
      rs.set(e, true);

      globalThis.requestAnimationFrame(() => {
        const ss = ms.get(e);
        const state = Object.assign({}, ...ss);
        const t = performance.now();

        render(e, state);
        e.dispatchEvent(
          new CustomEvent("render", {
            detail: { state, time: performance.now() - t, ...options },
          }),
        );

        ss.length = 0;
        rs.set(e, false);
      });
    }
  };
};

/**
 * Factorizes a component given a render function, a state and an arbitrary number of composable functions.
 *
 * The first argument is a render function. The function is called once when the component is connected to the DOM.
 * The render function should accept two parameters, the first one is the element that is being rendered.
 * The second parameter is the current state that should be used to render the component.
 *
 * The second argument to the `factorizeComponent` function is an object that will be used as the inital state.
 *
 * `State :: Object`
 * `R :: (DOMElement, State) -> void`
 * `F :: (((Component, R, State) -> C) -> void, ((DOMElement) -> E) -> void) -> void`
 * `factorizeComponent :: ((DOMElement, State) -> void, State, [...F]) -> Component`
 *
 * ```js
 * window.customElements.define(
 *   "iy-demo",
 *   factorizeComponent(
 *     (e { title }) => {
 *       const h1 = window.document.createElement("h1");
 *       h1.textContent = title;
 *       e.appendChild(e);
 *     },
 *     { title: "Bluebird" }
 *   );
 * );
 * ```
 *
 * ## Higher-order-function
 *
 * The `factorizeComponent` also accepts an arbitrary amount of functions as arguments.
 * Those higher-order-functions should accept 2 parameters; the first one is named `factorize`, the second is named
 * `construct`.
 *
 * Both HOFs accepts a function that will be called, respectively, at the factory phase, before the component is
 * initialize, and, at the construction phase, when the component is being instantiated.
 *
 * The factorize function has three parameters; the first parameter is a Component constructor;
 * the second parameter is the render function which can be called to queue a render request;
 * the third parameter is the initial state.
 *
 * ```js
 * window.customElements.define(
 *   "iy-demo",
 *   factorizeComponent(
 *     render,
 *     state,
 *     (factorize, construct) => {
 *       factorize((Component, render) => {
 *         Object.defineProperty(
 *           Component.prototype,
 *           "forceRender",
 *           {
 *             configurable: false,
 *             enumerable: false,
 *             value() {
 *               render(this);
 *             },
 *           }
 *         );
 *
 *         return Component;
 *       });
 *       construct((element) => {
 *         element.dataset.forceRender = true;
 *       });
 *     }
 *   );
 * );
 * ```
 */
export const factorizeComponent = <
  S extends State = State,
  E extends CustomElement<S> = CustomElement<S>,
>(
  render: RenderCallback<S, E>,
  state: S,
  ...fs: Array<HOF<S, E>>
): CustomElementConstructor<S, E> => {
  const constructors: Array<ConstructCallback<S, E>> = [];
  const factories: Array<FactorizeCallback<S, E>> = [];
  const FunctionalComponent = factorizeFunctionalComponentClass<S, E>();
  const Component = function () {
    return Reflect.construct(
      FunctionalComponent,
      [
        [
          (e: E) => {
            e[StateSymbol] = Object.assign({}, state);

            Object.defineProperty(
              e,
              "state",
              {
                get() {
                  return this[StateSymbol];
                },
                set(s) {
                  render(this, Object.assign({}, this[StateSymbol], s));
                },
              },
            );
          },
          ...constructors,
        ],
      ],
      new.target || FunctionalComponent,
    );
  } as unknown as CustomElementConstructor<S, E>;

  Object.setPrototypeOf(Component.prototype, FunctionalComponent.prototype);
  Object.setPrototypeOf(Component, FunctionalComponent);

  const _render = wrapRender(render);

  for (const f of fs) {
    f(
      (factorize: FactorizeCallback<S, E>) => factories.push(factorize),
      (construct: ConstructCallback<S, E>) => constructors.push(construct),
    );
  }

  for (const h of factories) {
    h(Component, _render, state);
  }

  const _connectedCallback = Component.prototype.connectedCallback;

  Object.defineProperty(
    Component.prototype,
    "connectedCallback",
    {
      configurable: true,
      enumerable: false,
      value() {
        return maybeCall(_connectedCallback, this)
          .then((s = {}) => {
            this[StateSymbol] = Object.assign({}, state, s);
            _render(this, this[StateSymbol], {
              name: "connectedCallback",
              data: {},
            });
          });
      },
    },
  );

  return Component;
};

/**
 * Fetches a HTML file from a server and returns the Promise of a `<template>`.
 *
 * ```js
 * const element = window.document.querySelector("div");
 * fetchTemplate("/demo.html")()
 *   .then((template) => {
 *     element.appendChild(template.content.cloneNode(true));
 *   });
 * ```
 */
export const fetchTemplate = (templatePath: string) =>
  (): Promise<HTMLTemplateElement | never> =>
    fetch(templatePath)
      .then((response) =>
        response.text().then((t) => {
          if (response.ok) {
            return t;
          } else {
            return Promise.reject(new Error(t));
          }
        })
      )
      .then((html) => {
        const e = window.document.createElement("template");
        e.innerHTML = html;

        return e;
      });

/**
 * Creates a reactive lifecycle with a simple state reducer.
 * When a user or a program sets an attribute of the component, the validation function is called which decides if the
 * component should be rendered again.
 *
 * The `useAttributes` function accepts a function to validate an observed attributes value and create a new state. The
 * validation function should have three parameters. The first one is an object representing the attribute that was
 * changed, the second is the element that is affected and the last is the current state of the element. The validation
 * function shoudl return a state fragment or false to cancel the render.
 *
 * The hook function also takes a map object for all of the attributes to observe.The value is a function to transform
 * the value before the validation function called. If not transformation is needed, just pass the identity function.
 * `(x) => x`
 *
 * ```js
 * window.customElements.define(
 *   "iy-demo",
 *   factorizeComponent(
 *     (element, { value }) => {
 *      const span = element.querySelector("span");
 *      span.textContent = String(value);
 *     },
 *     { value: 0 },
 *     useAttributes(
 *       ({ oldValue, value }) => (oldValue !== value && value >= 0) ? ({ value }) : false,
 *       {
 *         value: Number
 *       }
 *     ),
 *     (factorize) => {
 *       factorize((Component) => {
 *         Object.defineProperty(
 *           Component.prototype,
 *           "connectedCallback",
 *           {
 *             enumerable: true,
 *             value() {
 *               console.log("hello");
 *               const span = window.document.createElement("span");
 *               const button = window.document.createElement("button");
 *               button.textContent = "Add";
 *               this.appendChild(span);
 *               this.appendChild(button);
 *               button.addEventListener("click", () => {
 *                 const v = this.getAttribute("value");
 *                 this.setAttribute("value", String(Number(v) + 1));
 *               });
 *             },
 *           },
 *         );
 *         return Component;
 *       });
 *     }
 *   )
 * );
 * ```
 */
export const useAttributes = <
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
>(
  validateAttribute: ValidateAttributeCallback<S, E>,
  map: { [k in keyof Partial<S>]: (x: string | null) => Partial<S>[k] },
) =>
  (factorize: FactorizeHOF<S, E>) => {
    factorize((Component, render) => {
      const _attributeChangedCallback =
        Component.prototype.attributeChangedCallback;
      const _connectedCallback = Component.prototype.connectedCallback;
      const observedAttributes = Object.keys(map);
      Object.defineProperty(
        Component,
        "observedAttributes",
        {
          enumerable: true,
          value: observedAttributes,
        },
      );
      Object.defineProperties(
        Component.prototype,
        {
          attributeChangedCallback: {
            configurable: true,
            enumerable: true,
            value(
              this: E,
              name: string,
              oldValue: string | null,
              value: string,
            ) {
              const state = validateAttribute(
                {
                  name: name,
                  // Overwrite the type because sometime it's just a string
                  oldValue: (Reflect.has(map, name)
                    ? map[name](oldValue)
                    : oldValue) as unknown as Partial<
                      S
                    >[Extract<keyof Partial<S>, string>],
                  value: (Reflect.has(map, name)
                    ? map[name](value)
                    : value) as unknown as Partial<
                      S
                    >[Extract<keyof Partial<S>, string>],
                },
                this,
                Object.assign({}, this[StateSymbol]),
              );

              this.dispatchEvent(
                new CustomEvent(
                  "change:attribute",
                  {
                    detail: {
                      attribute: { name, oldValue, value },
                      state,
                    },
                  },
                ),
              );
              if (state) {
                if (state === true) {
                  const z = parseDatasetToState(name) as keyof S;
                  this[StateSymbol][z] = (Reflect.has(map, name)
                    ? map[name](value)
                    : value) as unknown as S[Extract<keyof S, string>];
                } else {
                  for (const k in state as Partial<S>) {
                    if (!Object.prototype.hasOwnProperty.call(state, k)) {
                      continue;
                    }

                    const z = parseDatasetToState(k) as keyof S;
                    this[StateSymbol][z] =
                      state[k] as unknown as S[Extract<keyof S, string>];
                  }
                }
                render(this, Object.assign({}, this[StateSymbol]), {
                  name: "attributes",
                  data: { name, oldValue, value },
                });
              }

              _attributeChangedCallback &&
                _attributeChangedCallback.call(this, name, oldValue, value);
            },
          },
          connectedCallback: {
            configurable: true,
            enumerable: true,
            value(this: E) {
              return maybeCall(_connectedCallback, this)
                .then(() => {
                  for (const key of observedAttributes) {
                    const normalizedKey = parseDatasetToState(key) as keyof S;
                    const value = map[normalizedKey]
                      ? map[normalizedKey](
                        this.getAttribute(key) as string,
                      )
                      : this.getAttribute(key);
                    if (value) {
                      this[StateSymbol][normalizedKey] =
                        value as S[Extract<keyof S, string>];
                    }
                  }
                });
            },
          },
          [ValidateAttributeSymbol]: {
            configurable: true,
            enumerable: false,
            value: validateAttribute,
          },
        },
      );
    });
  };

/**
 * Hooks into the component's lifecycle. Learn more about [lifecycle callbacks on MDN](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks)
 *
 * The function accepts as argument an object of function to hook into one of the following callback:
 * `connectedCallback`, `disconnectedCallback`, `attributeChangedCallback` and `adoptedCallback`.
 *
 * Each callback function will be called when appropriate with the element, the relevant options and a `asyncRender`
 * function as arguments.
 * The `asyncRender` function can be called at any moment with a "state setter" function. This returns a thunk function
 * that may accept an argument. When the thunk function is called, the "state setter" function is called with the
 * current element and state as argument. This function should return a state fragment or false. The state fragment is
 * then merged with the current state and set the relevant component attributes. See `useAttribute`.
 *
 * ```js
 * window.customElements.define(
 *   "iy-demo",
 *   factorizeComponent(
 *     (element, { value }) => {
 *       const span = element.querySelector("span");
 *       span.textContent = String(value);
 *     },
 *     { value: 0 },
 *     useCallbacks({
 *       connectedCallback: (element, render) => {
 *         const span = window.document.createElement("span");
 *         const button = window.document.createElement("button");
 *         button.textContent = "Add";
 *         element.appendChild(span);
 *         element.appendChild(button);
 *         button.addEventListener("click", render((e, { value }) => ({ value: ++value })));
 *       }
 *     }),
 *     (factorize) => {
 *       factorize((Component, render) => {
 *         Object.defineProperty(
 *           Component,
 *           "observedAttributes",
 *           {
 *             enumerable: true,
 *             value: ["value"],
 *           },
 *         );
 *
 *         Object.defineProperty(
 *           Component.prototype,
 *           "attributeChangedCallback",
 *           {
 *             enumerable: true,
 *             value(name, oldValue, value) {
 *               this[StateSymbol][name] = value;
 *               render(this, Object.assign({}, this[StateSymbol]));
 *             },
 *           },
 *         );
 *
 *         return Component;
 *       });
 *     }
 *   )
 * );
 * ```
 */
export const useCallbacks = <
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
>(
  callbacks: {
    [K in keyof typeof Callbacks]?: LifeCycleCallback<S, E>;
  },
) =>
  (factorize: FactorizeHOF<S, E>) => {
    factorize((Component, render) => {
      for (const k in callbacks) {
        if (!Object.prototype.hasOwnProperty.call(callbacks, k)) continue;
        const f = callbacks[k];
        if (!f) continue;
        const g = Component.prototype[k];

        Object.defineProperty(
          Component.prototype,
          k,
          {
            configurable: true,
            enumerable: true,
            value(...xs: [string, string, string]) {
              return maybeCall(g, this, ...xs)
                .then(() =>
                  f(
                    this,
                    asyncRender(
                      this,
                      render,
                      Component.observedAttributes || [],
                    ),
                    ...xs,
                  )
                );
            },
          },
        );
      }

      return Component;
    });
  };

export const useProperties = <
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
>(ps: Array<string>) =>
  (factorize: FactorizeHOF<S, E>) => {
    factorize((Component, render) => {
      Object.defineProperties(
        Component.prototype,
        ps
          .reduce(
            (o, name) =>
              Object.defineProperty(
                o,
                name,
                {
                  enumerable: true,
                  value: {
                    get() {
                      return this[StateSymbol][name];
                    },
                    set(v: S[Extract<keyof S, string>]) {
                      this[StateSymbol][name] = v;
                      render(this, Object.assign({}, this[StateSymbol]));
                    },
                  },
                  writable: true,
                },
              ),
            {},
          ),
      );
    });
  };

/**
 * Attaches a shadow root to every instance of the Component.
 *
 * ```js
 * window.customElements.define(
 *   "iy-demo",
 *   factorizeComponent(
 *     (element, { value }) => {
 *       const span = element.querySelector("span");
 *       span.textContent = String(value);
 *     },
 *     { value: 0 },
 *     useShadow({ mode: "open" })
 *   )
 * );
 * ```
 */
export const useShadow = <
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
>(options: ShadowRootInit = { mode: "open" }): HOF<S, E> =>
  (_, contruct) => {
    contruct((e: E) => e.attachShadow(options));
  };

/**
 * Automatically appends a clone of a template to the element or the element's shadow root.
 *
 * The function accepts a function that must return a template instance or a Promise of a template instance.
 * Optionally, the function can also be passed an object as the second argument that is used to define
 * children that would be often queried during the render phase.
 * The object's values must be a function that will accept the component instance as the first parameter
 * and return a child element or node list.
 * The elements will be accessible as the `elements` property of the Component instance element.
 *
 * ```js
 * window.customElements.define(
 *   "iy-demo",
 *   factorizeComponent(
 *     (e, { value }) => {
 *       e.elements.number.textContent = String(value);
 *     },
 *     { value: 0 },
 *     useShadow({ mode: "open" }),
 *     useTemplate(
 *       () => {
 *         const t = window.document.createElement("template");
 *         t.innerHTML = `<span>0</span><button>Add</button>`
 *
 *         return t;
 *       },
 *       {
 *         number: (e) => e.shadowRoot.querySelector("span"),
 *         addButton: (e) => e.shadowRoot.querySelector("button")
 *       }
 *     )
 *   ),
 * );
 * ```
 */
export const useTemplate = <
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
>(
  f: () => HTMLTemplateElement | Promise<HTMLTemplateElement>,
  map?: { [k: string]: (e: E) => Node | null },
): HOF<S, E> =>
  (factorize) => {
    factorize((Component) => {
      const _connectedCallback = Component.prototype.connectedCallback;
      Object.defineProperty(
        Component.prototype,
        "connectedCallback",
        {
          configurable: true,
          enumerable: true,
          value(this: E) {
            return maybeCall(_connectedCallback, this)
              .then(() => maybeCall(f))
              .then((template) => {
                if (!template) return;
                (this.shadowRoot || this).appendChild(
                  template.content.cloneNode(true),
                );

                if (map) {
                  Object.defineProperty(
                    this,
                    "elements",
                    {
                      enumerable: false,
                      value: {},
                    },
                  );

                  for (const k in map) {
                    if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
                    const e = map[k](this);
                    if (!e) continue;
                    this.elements && (this.elements[k] = e);
                  }

                  Object.freeze(this.elements);
                }
              });
          },
        },
      );
    });
  };
