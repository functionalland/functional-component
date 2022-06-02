export const deferUntil = (e, f, d = 1000 * 5) =>
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

export const deferUntilNextFrame = () =>
  new Promise(
    (resolve) => globalThis.requestAnimationFrame(() => resolve()),
  );

export const disconnectAllElements = (e) => {
  for (const k in e.elements) {
    for (const f of b.listeners) {
      if (Object.prototype.hasOwnProperty.call(e.elements, k)) {
        e.elements[k].removeEventListener(f);
      }
    }
  }
};

export const factorizeTemplate = (html) =>
  (document) => {
    const t = document.createElement("template");
    t.innerHTML = html;
    return t;
  };

export const intersects = (xs, ys) =>
  ys && ys.reduce(
      (b, y) => !xs.includes(y) ? false : b,
      true,
    ) || false;

export const maybeCall = (f, e, ...xs) => {
  try {
    const p = f && f.call(e, ...xs);
    return (p instanceof Promise ? p : Promise.resolve(p));
  } catch (e) {
    return Promise.reject(e);
  }
};

export const noop = (..._) => undefined;

export const parseSelectorForElement = (e) => {
  const as = [e.localName];
  for (const { name, value } of e.attributes) {
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

export const randomUUID = () =>
  window.crypto.randomUUID &&
    window.crypto.randomUUID() ||
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0,
      v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

export const removeAllChildren = (e) => {
  while (e.firstElementChild) {
    e.removeChild(e.firstElementChild);
  }
};

export const appendElement = (x, y) => x.append(y) || y;
export const appendNode = (x, y) => x.appendChild(y) || y;
export const prependElement = (x, y) => x.prepend(y) || y;

export const requestIdleCallback = (f, d = 1000) =>
  globalThis.requestIdleCallback &&
    globalThis.requestIdleCallback(f, { timeout: d }) ||
  globalThis.setTimeout(f);

export const parsePascalCaseToSpineCase = (x) =>
  x.split(/(?=[A-Z0-9])/).join("-").toLowerCase();

export const parseSpineCaseToCamelCase = (x) =>
  x.replace(/(-\w)/g, (m) => m[1].toUpperCase());

/**
 * Renders elements given an iterable.
 */
export const renderFor = (te, xs, f, g = appendElement, h = (x) => x.key) => {
  const fragment = window.document.createDocumentFragment();
  if (xs.length >= te.children.length) {
    const es = Array.from(xs).map((x, i, xs) =>
      renderOnce(
        te,
        (te) => {
          const e = f(te, x, i, xs);
          e.dataset.key = h(x) || String(i);
          return e;
        },
        (_, e) => g(fragment, e),
      )
    );
    te.appendChild(fragment);
    return es;
  }
  removeAllChildren(te);
  return Array.from(xs).map((x) => g(te, f(te, x)));
};

export const renderIf = (te, k, f, g = (x) => x, ...xs) => {
  removeAllChildren(te);
  return (k()) ? f(te, ...xs) : g(te, ...xs);
};

export const renderOnce = (
  te,
  f,
  g = appendElement,
  h = (te, e) => te.querySelector(parseSelectorForElement(e).join("")),
) => {
  const e = f(te);
  return h(te, e) || g(te, e);
};
