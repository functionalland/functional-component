import { Constructor, CustomElement } from "./component.d.ts";

type ArgumentTypes<F extends (...xs: Array<unknown>) => unknown> = F extends (...args: infer A) => unknown ? A
  : never;

export function constructComponent<E extends CustomElement>(
  C: Constructor<E>,
): E;

export function factorizeSpy<F extends (...xs: Array<unknown>) => unknown>(f?: F): [
  F,
  {
    (
      assert: (
        xs: ArgumentTypes<F>,
        i: number,
        zs: Array<ArgumentTypes<F>>,
      ) => void | never,
    ): void | never;
    callCount: number;
    called: boolean;
  },
];

export function test(name: string, f: () => void): void;

export function withDom(f: () => void): () => Promise<void>;
