import { CustomElement, CustomElementConstructor, State } from "./component.ts";

type ArgumentTypes<F extends (...xs: Array<unknown>) => unknown> = F extends
  (...args: infer A) => unknown ? A
  : never;

export function constructComponent<
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
>(
  C: CustomElementConstructor<S, E>,
): E;

export function factorizeSpy<F extends (...xs: Array<any>) => unknown>(
  f?: F,
): [
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

export function test(name: string, f: () => void, g?: () => boolean): void;

export function withDom(
  f: (document: HTMLDocument) => void,
  t?: string,
): () => Promise<void>;
