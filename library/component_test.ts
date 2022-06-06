import { assert, assertEquals } from "./asserts.js";
import {
  AsyncRenderCallback,
  CustomElement,
  ConstructHOF,
  HOF,
  LifeCycleCallback,
  State,
  StateSymbol,
  factorizeComponent,
  useAttributes,
  useCallbacks,
  useShadow,
  useTemplate,
} from "./component.ts";
// @deno-types="./testing.d.ts"
import { constructComponent, factorizeSpy, test, withDom } from "./testing.js";
import { deferUntil, deferUntilNextFrame, noop } from "./utilities.js";

type RenderSpyFunction<
  S extends State,
  E extends CustomElement<S> = CustomElement<S>,
> = (e: E, s: S) => void;

test(
  "factorizeComponent: Render function is called once",
  withDom(() => {
    type ComponentState = { active: boolean };
    const [renderSpy, assertRenderSpy] = factorizeSpy<
      RenderSpyFunction<ComponentState>
    >();
    const Component = factorizeComponent<ComponentState>(renderSpy, {
      active: false,
    });

    const e = constructComponent<ComponentState>(Component);
    e.connectedCallback && e.connectedCallback();

    return deferUntil(null, () => assertRenderSpy.called)
      .then(() => {
        assert(assertRenderSpy.callCount === 1);
        assertRenderSpy(([e, state]) => {
          assertEquals(e.state, state);
        });
      });
  }),
  () => "ShadowRoot" in globalThis,
);

test(
  "factorizeComponent: Add a factory",
  withDom(() => {
    type ComponentState = { active: boolean };
    const [renderSpy, assertRenderSpy] = factorizeSpy<
      RenderSpyFunction<ComponentState>
    >();
    const Component = factorizeComponent<ComponentState>(
      renderSpy,
      { active: false },
      ((factorize) => {
        factorize((Component, render) => {
          const _connectedCallback = Component.prototype.connectedCallback;

          Object.defineProperty(
            Component.prototype,
            "connectedCallback",
            {
              configurable: true,
              enumerable: true,
              value() {
                _connectedCallback && _connectedCallback();
                setTimeout(() => render(this, { active: true }), 500);
              },
            },
          );
        });
      }) as HOF<ComponentState>,
    );

    const e = constructComponent<ComponentState>(Component);
    e.connectedCallback && e.connectedCallback();

    return deferUntil(null, () => assertRenderSpy.callCount === 2)
      .then(() => {
        assertRenderSpy(([_e, state], i) => {
          if (i === 0) {
            assertEquals(state, { active: false });
          } else {
            assertEquals(state, { active: true });
          }
        });
      });
  }),
  () => "ShadowRoot" in globalThis,
);

test(
  "factorizeComponent: Add a contructor",
  withDom(() => {
    type ComponentState = { active: boolean };
    const Component = factorizeComponent<ComponentState>(
      () => {},
      { active: false },
      ((_, construct) => {
        construct((e) => {
          e.attachShadow({ mode: "open" });
        });
      }) as HOF<ComponentState>,
    );

    const e = constructComponent<ComponentState>(Component);
    assert(e.shadowRoot);
  }),
  () => "ShadowRoot" in globalThis,
);

test(
  "useAttributes",
  withDom(() => {
    type ComponentState = { value: number };
    const [attributeMapSpy, assertAttributeMapSpy] = factorizeSpy(Number);
    const [validateAttributeSpy, assertValidateAttributeSpy] = factorizeSpy(
      ({ name: _name, oldValue, value }) => (oldValue !== value && value >= 0),
    );
    const [renderSpy, assertRenderSpy] = factorizeSpy<
      RenderSpyFunction<ComponentState>
    >();

    const Component = factorizeComponent(renderSpy, { value: 42 });

    useAttributes(
      validateAttributeSpy,
      {
        value: attributeMapSpy,
      },
    )((f) => f(Component, renderSpy, { value: 42 }));

    const e = constructComponent(Component);

    assertEquals(Component.observedAttributes, ["value"]);

    e.setAttribute("value", "24");

    return deferUntilNextFrame()
      .then(() => {
        assert(assertAttributeMapSpy.called);
        assertAttributeMapSpy(([x]) => {
          if (!x) return;
          assert(x === "24");
        });
        assert(assertValidateAttributeSpy.called);
        assertValidateAttributeSpy(([{ name, value }]) => {
          assert(name === "value");
          assert(value === 24);
        });
        assert(assertRenderSpy.called);
        assertRenderSpy(([_, { value }]) => {
          assert(value === 24);
        });
      });
  }),
  () => "ShadowRoot" in globalThis,
);

test(
  "useCallbacks",
  withDom(() => {
    type ComponentState = { active: boolean; count: number };
    const initialState: ComponentState = {
      active: false,
      count: 0,
    };
    const callback =
      ((
        _e: CustomElement<ComponentState>,
        render: AsyncRenderCallback<ComponentState>,
        ...xs: [string, string, string]
      ) => {
        render((_, { count }) => ({ active: true, count: ++count }))(
          {} as unknown as Event,
        );
      }) as LifeCycleCallback<ComponentState>;
    const [adoptedCallbackSpy, assertAdoptedCallbackSpy] = factorizeSpy(
      callback,
    );
    const [attributeChangedCallbackSpy, assertAttributeChangedCallbackSpy] =
      factorizeSpy(callback);
    const [connectedCallbackSpy, assertConnectedCallbackSpy] = factorizeSpy(
      callback,
    );
    const [disconnectedCallbackSpy, assertDisconnectedCallbackSpy] =
      factorizeSpy(callback);
    const [renderSpy, assertRenderSpy] = factorizeSpy<
      RenderSpyFunction<ComponentState>
    >();

    const Component = factorizeComponent(renderSpy, initialState);

    useCallbacks({
      adoptedCallback: adoptedCallbackSpy,
      attributeChangedCallback: attributeChangedCallbackSpy,
      connectedCallback: connectedCallbackSpy,
      disconnectedCallback: disconnectedCallbackSpy,
    })((f) => f(Component, renderSpy, initialState));

    assert(Component.prototype.adoptedCallback);
    assert(Component.prototype.attributeChangedCallback);
    assert(Component.prototype.connectedCallback);
    assert(Component.prototype.disconnectedCallback);

    const e = constructComponent(Component);

    e.adoptedCallback && e.adoptedCallback();

    e.attributeChangedCallback &&
      e.attributeChangedCallback("value", null, "42");

    e.connectedCallback && e.connectedCallback();

    e.disconnectedCallback && e.disconnectedCallback();

    return deferUntilNextFrame()
      .then(() => {
        assert(assertAdoptedCallbackSpy.called);
        assert(assertAttributeChangedCallbackSpy.called);
        assert(assertConnectedCallbackSpy.called);
        assert(assertDisconnectedCallbackSpy.called);
        assert(e[StateSymbol].count === 4);
        assert(assertRenderSpy.callCount === 4);

        return deferUntilNextFrame();
      })
      .then(() => {
        assert(assertRenderSpy.callCount === 5);
      });
  }),
  () => "ShadowRoot" in globalThis,
);

test(
  "useShadow",
  withDom(() => {
    const Component = factorizeComponent(
      () => {},
      { active: false, count: 0 },
      useShadow(),
    );

    const e = constructComponent(Component);

    assert(e.shadowRoot);
  }),
  () => "ShadowRoot" in globalThis,
);

test(
  "useTemplate",
  withDom(() => {
    type ComponentState = { active: boolean; count: number };
    const initialState: ComponentState = {
      active: false,
      count: 0,
    };
    const [renderSpy, assertRenderSpy] = factorizeSpy<
      RenderSpyFunction<ComponentState>
    >();
    const Component = factorizeComponent<ComponentState>(
      renderSpy,
      initialState,
    );

    useTemplate<ComponentState>(
      () => {
        const t = globalThis.document.createElement("template");
        t.innerHTML = `<span>0</span><button>Add</button>`;

        return t;
      },
      {
        addButton: (e) => e.querySelector("button"),
        number: (e) => e.querySelector("span"),
      },
    )((f) => f(Component, renderSpy, initialState), noop as ConstructHOF<ComponentState>);

    const e = constructComponent<ComponentState>(Component);

    e.connectedCallback && e.connectedCallback();

    return deferUntil(null, () => assertRenderSpy.called)
      .then(() => {
        assert(assertRenderSpy.called);
        assertRenderSpy(([e]) => {
          assert(e?.elements?.addButton);
          assert(e?.elements?.number);
        });
      });
  }),
  () => "ShadowRoot" in globalThis,
);
