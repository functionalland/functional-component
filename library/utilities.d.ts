export function appendElement<X extends Element, Y extends Element>(
  x: X,
  y: Y,
): Y;

export function appendNode<X extends Node, Y extends Node>(
  x: X,
  y: Y,
): Y;

export function prependElement<X extends Element, Y extends Element>(
  x: X,
  y: Y,
): Y;

export function deferUntil<E>(
  e: E,
  f: (x: E) => boolean,
  d?: number,
): Promise<never> | Promise<E>;

export function deferUntilNextFrame(): Promise<void>;

export function disconnectAllElements<E extends HTMLElement>(e: E): void;

export function intersects(xs: Array<unknown>, ys: Array<unknown>): boolean;

export function maybeCall<X, Y, E extends HTMLElement, XS extends Array<X>>(
  f: (e: E, ...xs: XS) => Y,
  e: E,
  ...xs: XS
): Promise<Y | false>;

export function noop(..._: Array<unknown>): void;

export function parsePascalCaseToSpineCase(x: string): string;

export function parseSpineCaseToCamelCase(x: string): string;

export function parseSelectorForElement<E extends HTMLElement>(
  e: E,
): Array<string>;

export function randomUUID(): string;

export function requestIdleCallback(f: () => void, d?: number): void;

export function renderFor<X, E extends Element, T extends Element>(
  te: T,
  xs: Iterable<X>,
  f: (te: T, x: X, i: number, xs: Iterable<X>) => E,
  g?: (te: T, e: E) => E,
  h?: (x: unknown) => string,
): Array<E>;

export function renderIf<E extends Element, T extends Element>(
  te: T,
  k: () => boolean,
  f: (te: T) => E,
  g?: (te: T) => E,
): E;

export function renderOnce<X, E extends Element, T extends Element>(
  ts: T,
  f: (te: T) => E,
  g?: (te: T, e: E) => E,
  h?: (te: T, e: E) => E,
): E;
