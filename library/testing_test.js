import { assert } from "./asserts.ts";
import { factorizeSpy, test } from "./testing.ts";

test(
  "factorizeSpy",
  () => {
    const [f, assertF] = factorizeSpy(() => 66);
    const compose = (f, g, x) => f(g(x));
    const x = compose(f, (x) => x * 2, 42);
    assert(x === 66);
    assert(assertF.called);
    assert(assertF.callCount === 1);
    assertF(([x]) => assert(x === 84));
  },
);
