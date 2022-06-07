export const deferUntil = <E extends unknown>(
  e: E,
  f: (x: E) => boolean,
  d = 1000 * 5,
): Promise<E | never> =>
  new Promise((resolve, reject) => {
    if (f(e)) resolve(e);
    else {
      const t1 = setTimeout(() => {
        reject(new Error("Timed out"));
        t1 && clearTimeout(t1);
        t2 && clearInterval(t2);
      }, d);
      const t2 = setInterval(() => {
        if (f(e)) {
          resolve(e);
          t1 && clearTimeout(t1);
          t2 && clearInterval(t2);
        }
      });
    }
  });

export const deferUntilNextFrame = (): Promise<void> =>
  new Promise(
    (resolve) =>
      Reflect.apply(
        Reflect.get(globalThis, "requestAnimationFrame"),
        globalThis,
        [() => resolve()],
      ),
  );

// export const disconnectAllElements = (e: { elemenets: Array<Element> }) => {
//   for (const k in e.elements) {
//     for (const f of b.listeners) {
//       if (Object.prototype.hasOwnProperty.call(e.elements, k)) {
//         e.elements[k].removeEventListener(f);
//       }
//     }
//   }
// };

export const factorizeTemplate = (x: string) =>
  (document: Document) => {
    const t = document.createElement("template");
    t.innerHTML = x;
    return t;
  };

export const intersects = <X>(xs: Array<X>, ys: Array<X>) =>
  ys && ys.reduce(
      (x, y) => !xs.includes(y) ? false : x,
      true,
    ) || false;

export const maybeCall = <Y>(f: () => Promise<Y> | Y): Promise<Y | never> => {
  try {
    return Promise.resolve(f()) as Promise<Y>;
  } catch (e) {
    return Promise.reject(e) as Promise<never>;
  }
};

export const noop = (..._: Array<unknown>): void => undefined;

export const parseSelectorForElement = <E extends Element>(
  e: E,
): Array<string> => {
  const as = [e.localName];
  for (const { name, value } of Array.from(e.attributes)) {
    if (name === "class") {
      as.push(
        ...value.split(" ").map((x) => `.${x}`),
      );
    } else {
      as.push(
        name === "id" ? `#${value}` : `[${name}="${value}"]`,
      );
    }
  }
  return as;
};

export const randomUUID = (): string =>
  Reflect.has(globalThis?.crypto, "randomUUID") &&
    Reflect.apply(
      Reflect.get(globalThis?.crypto, "randomUUID"),
      globalThis.crypto,
      [],
    ) ||
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0,
      v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

export const removeAllChildren = <E extends Element>(e: E) => {
  while (e.firstElementChild) {
    e.removeChild(e.firstElementChild);
  }
};

export const appendElement = <X extends Element, Y extends Element>(
  x: X,
  ...y: Array<Y>
): Y => {
  x.append(...y);
  return y[0];
};
export const appendNode = <X extends Node, Y extends Node>(x: X, y: Y): Y => {
  x.appendChild(y);
  return y;
};
export const prependElement = <X extends Element, Y extends Element>(
  x: X,
  ...y: Array<Y>
): Y => {
  x.prepend(...y);
  return y[0];
};

export const requestIdleCallback = (f: () => void, d = 1000) =>
  Reflect.has(globalThis, "requestIdleCallback") &&
    Reflect.apply(Reflect.get(globalThis, "requestIdleCallback"), null, [f, {
      timeout: d,
    }]) ||
  globalThis.setTimeout(f);

export const parsePascalCaseToSpineCase = (x: string) =>
  x.split(/(?=[A-Z0-9])/).join("-").toLowerCase();

export const parseSpineCaseToCamelCase = (x: string) =>
  x.replace(/(-\w)/g, (m) => m[1].toUpperCase());

/**
 * Renders elements given an iterable.
 */
export const renderFor = <
  X,
  T extends Element,
  E extends HTMLElement & { key?: string },
>(
  te: T,
  xs: Array<X>,
  f: (te: T, x: X, i: number, xs: Iterable<X>) => E,
  g = appendElement,
  h?: (x: X) => string,
) => {
  const fragment = globalThis.document.createDocumentFragment();
  if (xs.length >= te.children.length) {
    const es = Array.from(xs).map((x, i, xs) =>
      renderOnce(
        te,
        (te: T) => {
          const e = f(te, x, i, xs);
          e.dataset.key = h ? h(x) : String(i);
          return e;
        },
        <X extends Element, Y extends Element>(_: X, e: Y) =>
          g(fragment as unknown as X, e),
      )
    );
    te.appendChild(fragment);
    return es;
  }
  removeAllChildren(te);
  return Array.from(xs).map((x, i) => g(te, f(te, x, i, xs) as Element));
};

export const renderIf = <
  T extends Element,
>(
  te: T,
  k: () => boolean,
  f: (te: T) => void,
  g = (te: T) => te,
) => {
  removeAllChildren(te);
  return (k()) ? f(te) : g(te);
};

export const renderOnce = <
  T extends Element,
  E extends HTMLElement,
>(
  te: T,
  f: (te: T) => E,
  g = appendElement,
  h = (te: T, e: E) => te.querySelector(parseSelectorForElement(e).join("")),
) => {
  const e = f(te);
  return h(te, e) || g(te, e as Element);
};
