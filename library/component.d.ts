export const StateSymbol: unique symbol;

export type State = { [k: string]: unknown };
export type CustomElement = HTMLElement & {
  adoptedCallback?(): void;
  attributeChangedCallback?(
    name: string,
    oldValue: string,
    newValue: string,
  ): void;
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  elements?: { [k: string]: HTMLElement };
  [StateSymbol]: State;
};
export type Constructor<E extends CustomElement> = {
  new (): E;
} & { observedAttributes: Array<string> };
export type HOF<E extends CustomElement, S extends State> = (
  factorize: (
    f: (Component: Constructor<E>, render: (e: E, s: S) => void) => void,
  ) => void,
  construct?: (f: (e: E) => void) => void,
) => void;

export declare enum Callbacks {
  "adoptedCallback",
  "attributeChangedCallback",
  "connectedCallback",
  "disconnectedCallback",
}

export function factorizeComponent<
  S extends State,
  E extends CustomElement = CustomElement,
>(
  render: (element: E, state: State) => void,
  state: State,
  ...fs: Array<HOF<E, S>>
): Constructor<E>;

export function useAttributes<E extends CustomElement, S extends State>(
  validateAttribute: <X>(
    attributes: { name: string; oldValue: X; value: X },
    element?: E,
    state?: S,
  ) => S | boolean,
  map?: { [K in keyof S]: (x: string) => S[K] },
): HOF<E, S>;

export function useCallbacks<E extends CustomElement, S extends State>(
  callbacks: {
    [K in keyof typeof Callbacks]?:
      | ((
        element: E,
        render: ($e: E, s: State, e: Event) => void,
      ) => void)
      | ((
        element: E,
        name: string,
        oldValue: string,
        value: string,
        render: ($e: E, s: State, e: Event) => void,
      ) => void);
  },
): HOF<E, S>;

export function useShadow<E extends CustomElement, S extends State>(
  options?: { mode: "open" | "closed" },
): HOF<E, S>;

export function useTemplate<E extends CustomElement, S extends State>(
  getTemplate: () => HTMLTemplateElement,
  map: { [k: string]: (e: E) => CustomElement },
): HOF<E, S>;
