export const StateSymbol: unique symbol;

export type State = { [k: string]: unknown };
export type CustomElement<S extends State = {}> = HTMLElement & {
  adoptedCallback?(): void;
  attributeChangedCallback?(
    name: string,
    oldValue: string,
    newValue: string,
  ): void;
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  elements?: { [k: string]: HTMLElement };
  state: Partial<S>;
};
export type Constructor<E extends CustomElement = CustomElement> = {
  new (): E;
} & { observedAttributes: Array<string> };
export type FactorizeHOF<S extends State = State, E extends CustomElement = CustomElement> = (
  f: (Component: Constructor<E>, render: (e: E, s: S) => void) => void,
) => void
export type ConstructHOF<E extends CustomElement = CustomElement> = (f: (e: E) => void) => void
export type HOF<S extends State, E extends CustomElement = CustomElement> = (
  factorize: FactorizeHOF<S, E>,
  construct: ConstructHOF<E>,
) => void;
export type AsyncRenderCallback<
  S extends State,
  E extends CustomElement = CustomElement,
> = ($e: E, s: S, e: Event) => S | undefined;
export type AsyncRender<
  S extends State,
  E extends CustomElement = CustomElement,
> = (
  f: AsyncRenderCallback<S, E>,
) => (e: Event) => void;
export type Render<S extends State, E extends CustomElement = CustomElement> = (
  element: E,
  state: S,
) => void;
export type AttributeCallback<
  S extends State,
  E extends CustomElement = CustomElement,
> = <X extends ValueOf<S>>(
  attributes: { name: keyof S; oldValue: X; value: X },
  element?: E,
  state?: S,
) => Partial<S> | boolean;
export type LifeCycleCallback<
  S extends State,
  E extends CustomElement = CustomElement,
> =
  | ((
    element: E,
    render: AsyncRender<S, E>,
  ) => void)
  | ((
    element: E,
    render: AsyncRender<S, E>,
    name: string,
    oldValue: string,
    value: string,
  ) => S | void);

export declare enum Callbacks {
  "adoptedCallback",
  "attributeChangedCallback",
  "connectedCallback",
  "disconnectedCallback",
}

type ValueOf<T> = T[keyof T];

export function factorizeComponent<
  S extends State = State,
  E extends CustomElement = CustomElement,
>(
  render: Render<S, E>,
  state: S,
  ...fs: Array<HOF<S, E>>
): Constructor<E>;

export function useAttributes<
  S extends State,
  E extends CustomElement = CustomElement,
>(
  validateAttribute: AttributeCallback<S, E>,
  map?: { [K in keyof S]: (x: string) => S[K] },
): HOF<S, E>;

export function useCallbacks<
  S extends State,
  E extends CustomElement = CustomElement,
>(
  callbacks: {
    [K in keyof typeof Callbacks]?: LifeCycleCallback<S, E>;
  },
): HOF<S, E>;

export function useShadow<
  S extends State,
  E extends CustomElement = CustomElement,
>(
  options?: { mode: "open" | "closed" },
): HOF<S, E>;

export function useTemplate<
  S extends State,
  E extends CustomElement = CustomElement,
  X extends Node = Node
>(
  getTemplate: () => HTMLTemplateElement,
  map?: { [k: string]: (e: E) => X | null },
): HOF<S, E>;
