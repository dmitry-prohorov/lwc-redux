# LWC Redux

Redux for Lightning Web Components on Salesforce.

This library packages [Redux](https://redux.js.org/), [Redux Toolkit](https://redux-toolkit.js.org/),
[Redux Saga](https://redux-saga.js.org/), [Redux Observable](https://redux-observable.js.org/),
[Redux Undo](https://github.com/omnidan/redux-undo), [Reselect](https://github.com/reduxjs/reselect) and
[RxJS](https://rxjs.dev/) as LWC service modules. It also adds LWC bindings on top of them:

- `<c-redux-provider>` creates a store and makes it available to every component inside it.
- `ReduxMixin` connects a component to the store with `mapStateToProps` and `mapDispatchToProps`, in the same way as
  `react-redux`'s `connect`.
- Dynamic modules (built on [redux-eggs](https://github.com/redux-eggs/redux-eggs)) let each component bring its own
  reducers, middlewares and sagas. They are added when the component connects and removed when it disconnects.
- [Redux DevTools](https://github.com/reduxjs/redux-devtools) integration, including time travel through the browser
  extension.

## Contents

- [What's inside](#whats-inside)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Examples](#examples)
- [Core concepts](#core-concepts)
    - [Provider and stores](#provider-and-stores)
    - [Modules](#modules)
    - [Connecting components](#connecting-components)
    - [Provider API reference](#provider-api-reference)
    - [ReduxMixin API reference](#reduxmixin-api-reference)
- [Redux Toolkit](#redux-toolkit)
- [Side effects](#side-effects): [Thunk](#thunk), [Saga](#saga), [Observable (epics)](#observable-epics)
- [Undo / redo](#undo--redo)
- [Calling component methods through the store: ReduxLwcCommunicationService](#calling-component-methods-reduxlwccommunicationservice)
- [Debugging: Redux DevTools and logger](#debugging-redux-devtools-and-logger)
- [Testing](#testing)
- [Migrating from the previous version](#migrating-from-the-previous-version)
- [Legacy dynamic modules API](#legacy-dynamic-modules-api)

## What's inside

All modules live in [force-app/main/default/lwc](force-app/main/default/lwc) and are imported as `c/<name>`.

| Module                                                | What it is                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `c/reduxProvider`                                     | `<c-redux-provider>`: creates the store, registers modules and connects child components    |
| `c/reduxMixin`                                        | `ReduxMixin(LightningElement)`: connects a component to the nearest provider                |
| `c/reduxConstants`                                    | Event names and symbols shared by the provider and the mixin                                |
| `c/redux`                                             | Redux 5 (`createStore`, `combineReducers`, `compose`, `applyMiddleware`, `isAction`, …)     |
| `c/reduxToolkit`                                      | Redux Toolkit 2 (`createSlice`, `configureStore`, `createAsyncThunk`, …) and extra helpers  |
| `c/reduxEggs`                                         | redux-eggs: the dynamic module store the provider uses, plus saga and observable extensions |
| `c/reduxThunk`                                        | Redux Thunk 3 (`thunk`, `withExtraArgument`)                                                |
| `c/reduxSaga`                                         | Redux Saga 1 (default export is `createSagaMiddleware`, plus `effects` and `typedEffects`)  |
| `c/reduxObservable`                                   | Redux Observable 3 (`createEpicMiddleware`, `combineEpics`, `ofType`)                       |
| `c/reduxUndo`                                         | Redux Undo (`undoable`, `ActionCreators`, `includeAction`, …)                               |
| `c/reselect`                                          | Reselect 5 (`createSelector`, `createStructuredSelector`, `weakMapMemoize`, …)              |
| `c/rxjs`                                              | RxJS 6 (`Subject`, `Observable`, … and `operators`)                                         |
| `c/reduxLwcCommunicationService`                      | A small message bus for calling component methods from outside, e.g. from sagas             |
| `c/reduxDynamicModulesLoggerExtension`                | Console logger middleware extension                                                         |
| `c/reduxDynamicModulesThunkExtension`                 | Thunk middleware extension                                                                  |
| `c/reduxDynamicModulesCore`, `…Saga…`, `…Observable…` | The [legacy dynamic modules store](#legacy-dynamic-modules-api)                             |

The package also contains one custom label, `REDUX_LOGGER`, which turns the console logger on and off.

## Installation

Deploy the library to your org with the [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli):

```bash
sf project deploy start --source-dir force-app --target-org <alias>
```

You can also copy the folders you need from `force-app/main/default/lwc` into your own project. The dependencies between
them are:

- `reduxProvider` needs `reduxConstants`, `reduxEggs`, `reduxToolkit`, `redux`, `reselect`, `reduxSaga`, `reduxThunk`,
  `reduxDynamicModulesThunkExtension`, `reduxDynamicModulesLoggerExtension` and the `REDUX_LOGGER` label.
- `reduxMixin` needs `reduxConstants`.
- `reduxObservable` and `reduxLwcCommunicationService` need `rxjs`.

## Quick start

**1. Describe your state with a slice and a module.** A module is a plain object with a unique `id` and the reducers it
contributes to the store.

```js
// lwc/counterStore/counterStore.js
import { createSlice } from 'c/reduxToolkit';

export const counterSlice = createSlice({
    name: 'counter',
    initialState: { value: 0 },
    reducers: {
        increment(state) {
            state.value += 1;
        },
        decrement(state) {
            state.value -= 1;
        }
    }
});

export const counterModule = {
    id: 'counter',
    reducersMap: { counter: counterSlice.reducer }
};

export const selectCount = (state) => state.counter?.value ?? 0;
```

**2. Connect a component.** Extend `ReduxMixin(LightningElement)` and call `this[ReduxMixin.Connect]` from
`connectedCallback`.

```js
// lwc/counter/counter.js
import { LightningElement } from 'lwc';
import { ReduxMixin } from 'c/reduxMixin';
import { counterModule, counterSlice, selectCount } from 'c/counterStore';

const mapStateToProps = (state) => ({ count: selectCount(state) });
const mapDispatchToProps = { increment: counterSlice.actions.increment };

export default class Counter extends ReduxMixin(LightningElement) {
    count = 0;

    connectedCallback() {
        this[ReduxMixin.Connect](mapStateToProps, mapDispatchToProps, { modules: [counterModule] });
    }

    handleClick() {
        this.increment();
    }
}
```

```html
<!-- lwc/counter/counter.html -->
<template>
    <lightning-button label="{count}" onclick="{handleClick}"></lightning-button>
</template>
```

**3. Wrap your app in a provider.**

```html
<!-- lwc/app/app.html -->
<template>
    <c-redux-provider>
        <c-counter></c-counter>
    </c-redux-provider>
</template>
```

That's it. Every `c-counter` inside the provider shares the same `counter` state. The module is added when the first
counter connects and removed when the last one disconnects.

## Examples

The [examples](examples) folder is a second package directory with deployable metadata. It contains a Lightning tab with
interactive examples, a Visualforce page wired to the Redux DevTools browser extension, and a permission set.

```bash
# deploy the library and the examples
sf project deploy start --source-dir force-app --source-dir examples --target-org <alias>
# grant access to the tab and the Visualforce page
sf org assign permset --name Redux_Examples --target-org <alias>
# open the examples tab
sf org open --path lightning/n/Redux_Examples --target-org <alias>
# or open the DevTools page (install the Redux DevTools browser extension first)
sf org open --path apex/ReduxDevtools --target-org <alias>
```

| Example                                                              | Shows                                                                                                                                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [reduxExamples](examples/main/default/lwc/reduxExamples)             | Root provider with `use-thunk use-saga use-observable use-devtools`, provider-level `modules`, action log, the only toast bus subscriber                                 |
| [exampleCounter](examples/main/default/lwc/exampleCounter)           | `createSlice`, `mapDispatchToProps` as an object, component-level modules                                                                                                |
| [exampleTodoList](examples/main/default/lwc/exampleTodoList)         | `createAsyncThunk`, `createEntityAdapter`, `createSelector`, `mapDispatchToProps` as a function                                                                          |
| [exampleSagaSearch](examples/main/default/lwc/exampleSagaSearch)     | A debounced search saga (`takeLatest` + `delay`) that runs only while the component is on the page and reports results with a toast through an event bus                 |
| [exampleRxjsTimer](examples/main/default/lwc/exampleRxjsTimer)       | A countdown driven by redux-observable epics (`interval`, `switchMap`, `takeUntil`, `withLatestFrom`) with a toast when it finishes                                      |
| [exampleUndoCounter](examples/main/default/lwc/exampleUndoCounter)   | `redux-undo` with an action filter                                                                                                                                       |
| [exampleLocalStore](examples/main/default/lwc/exampleLocalStore)     | Two isolated stores with `<c-redux-provider local-store>`                                                                                                                |
| [exampleActionLog](examples/main/default/lwc/exampleActionLog)       | An in-app monitor built on the `reduxprovider__action` event                                                                                                             |
| [examplesStore](examples/main/default/lwc/examplesStore)             | Slices, selectors, thunks, sagas, epics, modules and the toast bus ([notifications.js](examples/main/default/lwc/examplesStore/notifications.js)) shared by the examples |
| [ReduxDevtools.page](examples/main/default/pages/ReduxDevtools.page) | Lightning Out host that bridges the provider to the Redux DevTools extension                                                                                             |

The examples use a fake in-memory API ([api.js](examples/main/default/lwc/examplesStore/api.js)), so they deploy without
any Apex. Every example is covered by Jest tests in its `__tests__` folder.

## Core concepts

### Provider and stores

`<c-redux-provider>` creates a Redux Toolkit store (`configureStore`) managed by redux-eggs. Components inside the
provider, including slotted components and components deeper in the tree, connect to the nearest provider.

- **Root store (default).** All providers without `local-store` on the page share one root store. The **first** provider
  that renders creates it, so store-wide options (`use-saga`, `use-devtools`, `initial-state`) only take effect on that
  first provider. Put one provider at the top of your app and configure it there.
- **Local store.** `<c-redux-provider local-store>` creates a private store for its subtree. Use it for widgets that can
  appear several times on a page and must not share state. Local stores can be nested inside a root provider, and each
  component connects to the closest provider.

```html
<c-redux-provider use-saga use-devtools modules="{appModules}" initial-state="{initialState}">
    <c-header></c-header>
    <c-redux-provider local-store>
        <c-isolated-widget></c-isolated-widget>
    </c-redux-provider>
</c-redux-provider>
```

### Modules

A module (redux-eggs calls it an "egg") bundles everything a feature needs. Only `id` is required:

```js
export const ordersModule = {
    id: 'orders', // unique, used for reference counting
    reducersMap: { orders: ordersReducer }, // mounted at state.orders
    middlewares: [auditMiddleware], // added to the store while the module is present
    sagas: [ordersSaga], // started on add, cancelled on remove (requires use-saga)
    epics: [ordersEpic], // started on add, stopped on remove (requires use-observable)
    keep: false, // true: never remove the module once added
    // lifecycle hooks, each receives the store
    beforeAdd: (store) => {},
    afterAdd: (store) => store.dispatch(loadOrders()),
    beforeRemove: (store) => {},
    afterRemove: (store) => {}
};
```

There are three ways to register modules:

| Where                                                                    | Lifetime                                        |
| ------------------------------------------------------------------------ | ----------------------------------------------- |
| `<c-redux-provider modules={modules}>`                                   | While the provider is connected                 |
| `this[ReduxMixin.Connect](mapState, mapDispatch, { modules })`           | While the component is connected                |
| `this[ReduxMixin.AddModules](modules)` or `provider.addModules(modules)` | Until you call the returned `remove()` function |

Modules are **reference counted by `id`**. If two components register the same module, it is added once, and it is
removed only when both have disconnected. When the last reference goes away, its reducers are removed and their state
keys are deleted from the store. Its middlewares are removed and its sagas are cancelled. After every add or remove, the
store dispatches `@@eggs/reduce` with `{ method, reducers }`.

`modules` can also contain factories (`() => module`). The provider calls them before registering.

### Connecting components

```js
this[ReduxMixin.Connect](mapStateToProps, mapDispatchToProps, { modules });
```

**`mapStateToProps(state, component)`** runs immediately and then after every dispatched action. Every key of the
returned object is assigned to the component, for example `this.count = 1`. Declare those fields on the class so they
are reactive. The second argument is the component itself, so you can read its public properties:

```js
const mapStateToProps = (state, component) => ({
    record: selectRecordById(state, component.recordId)
});
```

A `mapStateToProps` that declares exactly one parameter is always called with `state` only. It can also be a factory
that returns the real function on its first call, which is handy for per-instance memoized selectors:

```js
const makeMapStateToProps = () => {
    const selectVisible = createSelector([selectItems, (state, cmp) => cmp.filter], filterItems);
    return (state, component) => ({ items: selectVisible(state, component) });
};
this[ReduxMixin.Connect](makeMapStateToProps);
```

Pass `undefined` or `null` if the component does not read state.

**`mapDispatchToProps`** can take three forms:

```js
// 1. An object of action creators: each one is wrapped with dispatch
const mapDispatchToProps = { increment: counterActions.increment, loadTodos: fetchTodos };

// 2. A function (dispatch, component) => props
const mapDispatchToProps = (dispatch, component) => ({
    save: () => dispatch(saveRecord(component.recordId))
});

// 3. Omitted: dispatch is stored on the component under a symbol
this[ReduxMixin.Connect](mapStateToProps);
this[ReduxMixin.Dispatch]({ type: 'something/happened' });
```

**Disconnecting.** The mixin implements `disconnectedCallback`. It unsubscribes from the store and removes the modules
registered by `Connect`. If you override `disconnectedCallback`, call `super.disconnectedCallback()` or
`this[ReduxMixin.Disconnect]()`:

```js
disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanupSomethingElse();
}
```

> **Note:** before updating a component, the provider checks `getComputedStyle(host).display`. Components whose host has
> no computed display (for example, an element detached from the document) are skipped.

### Provider API reference

**Attributes**

| Attribute                       | Type                            | Description                                                                                                                                                     |
| ------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules`                       | `Array<module \| () => module>` | Modules registered for the lifetime of the provider. Setting a new array later adds those modules too.                                                          |
| `initial-state`                 | `object`                        | Preloaded state. Each key is applied once, when a module first registers a reducer for it                                                                       |
| `local-store`                   | `boolean`                       | Create a private store instead of using the shared root store                                                                                                   |
| `use-saga`                      | `boolean`                       | Add the saga middleware and run `sagas` declared by modules                                                                                                     |
| `use-observable`                | `boolean`                       | Add the redux-observable middleware and run `epics` declared by modules                                                                                         |
| `use-devtools`                  | `boolean`                       | Report actions through events and support time travel, see [DevTools](#debugging-redux-devtools-and-logger)                                                     |
| `use-thunk`                     | `boolean`                       | Add `redux-thunk`. Redux Toolkit already includes thunk in its default middleware, so thunks work without it; the attribute is kept for backward compatibility. |
| `disable-cleanup-on-disconnect` | `boolean`                       | Keep the modules added by this provider when it disconnects                                                                                                     |
| `use-logger`                    | `boolean`                       | **Deprecated, ignored.** The logger is controlled by the `REDUX_LOGGER` label.                                                                                  |

**Methods** (call them on the element, for example `this.template.querySelector('c-redux-provider')`)

| Method                | Description                                                          |
| --------------------- | -------------------------------------------------------------------- |
| `dispatch(action)`    | Dispatch an action to the provider's store                           |
| `addModules(modules)` | Register modules, returns a function that removes them               |
| `getLocalStore()`     | Return the store of a `local-store` provider (`undefined` otherwise) |

**Events** (all bubble and are composed, so they can be handled above the provider, even from a Visualforce host page)

| Event                       | `detail`            | When                                                     |
| --------------------------- | ------------------- | -------------------------------------------------------- |
| `load`                      | —                   | After the provider registered its modules (not composed) |
| `reduxprovider__connect`    | `{ state }`         | When the provider creates its store                      |
| `reduxprovider__action`     | `{ action, state }` | After every action, only with `use-devtools`             |
| `reduxprovider__disconnect` | —                   | When the provider is removed from the DOM                |

### ReduxMixin API reference

| Member                                                         | Description                                                                                         |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `this[ReduxMixin.Connect](mapState, mapDispatch, { modules })` | Connect to the nearest provider                                                                     |
| `this[ReduxMixin.Disconnect]()`                                | Unsubscribe and remove the modules registered by `Connect`                                          |
| `this[ReduxMixin.Dispatch](action)`                            | Store `dispatch`, available when `mapDispatchToProps` is omitted                                    |
| `this[ReduxMixin.AddModules](modules)`                         | Register more modules later, returns a remove function                                              |
| `this[ReduxMixin.Subscribe](service)`                          | Listen to a [ReduxLwcCommunicationService](#calling-component-methods-reduxlwccommunicationservice) |
| `this[ReduxMixin.Unsubscribe]()`                               | Stop listening (also done on disconnect)                                                            |
| `this[ReduxMixin.Name]`                                        | Component name used in error messages                                                               |

Adding a module later is useful for code that is rarely used:

```js
async handleOpenReport() {
    this.removeReportModule = this[ReduxMixin.AddModules]([reportModule]);
}
disconnectedCallback() {
    super.disconnectedCallback();
    this.removeReportModule?.();
}
```

## Redux Toolkit

`c/reduxToolkit` re-exports all of Redux Toolkit 2, including `createSlice`, `createAsyncThunk`, `createEntityAdapter`,
`createSelector`, `createListenerMiddleware`, `combineSlices` and `nanoid`. See
[todos.js](examples/main/default/lwc/examplesStore/todos.js) for a complete slice with an entity adapter, async thunks
and memoized selectors.

Two helpers are added for updating state from partial payloads, for example form values:

```js
import { assignPayloadToState, safeAssigner } from 'c/reduxToolkit';

const settingsSlice = createSlice({
    name: 'settings',
    initialState: { title: '', size: 10 },
    reducers: {
        // copies (deep clones) keys of the payload that exist in the state, unknown keys are ignored
        update(state, { payload }) {
            assignPayloadToState(state, payload);
        },
        // same, but also skips undefined values
        patch(state, { payload }) {
            assignPayloadToState(state, payload, safeAssigner);
        }
    }
});
```

## Side effects

### Thunk

Dispatch functions or `createAsyncThunk` actions. `dispatch` returns whatever the thunk returns, so a component can wait
for the result:

```js
const mapDispatchToProps = (dispatch) => ({
    createTodo: (title) => dispatch(addTodo(title))
});

async handleAdd() {
    const result = await this.createTodo(this.title);
    if (!result.error) {
        this.title = '';
    }
}
```

Calling Apex from a thunk works the same way:

```js
import getAccounts from '@salesforce/apex/AccountController.getAccounts';
export const fetchAccounts = createAsyncThunk('accounts/fetch', (searchTerm) => getAccounts({ searchTerm }));
```

### Saga

Add `use-saga` to the root provider and list the root sagas in a module. They start when the module is added and are
cancelled when it is removed.

```js
import { effects } from 'c/reduxSaga';
const { call, delay, put, takeLatest } = effects;

function* searchWorker({ payload }) {
    yield delay(300); // debounce: takeLatest cancels the previous worker
    const results = yield call(searchContacts, payload);
    yield put(searchActions.searchSucceeded(results));
}

function* searchSaga() {
    yield takeLatest(searchActions.setQuery.type, searchWorker);
}

export const searchModule = { id: 'search', reducersMap: { search: searchSlice.reducer }, sagas: [searchSaga] };
```

`c/reduxSaga` also exports the `typedEffects` from `typed-redux-saga`, and the default `createSagaMiddleware`, `END`,
`channel`, `eventChannel`, `buffers`, `runSaga`, and so on. `store.getSagaTasks()` returns the running tasks.

### Observable (epics)

Add `use-observable` to the root provider and list the epics in a module. Like sagas, epics start when the module is
added and are stopped when it is removed, so an `interval` or a subscription opened by an epic never outlives the
components that use it. An epic shared by several modules runs once.

```js
import { combineEpics, ofType } from 'c/reduxObservable';
import { interval, operators } from 'c/rxjs';
const { map, switchMap, takeUntil } = operators;

// start -> a tick every second until pause
const tickEpic = (action$) =>
    action$.pipe(
        ofType('timer/start'),
        switchMap(() =>
            interval(1000).pipe(
                map(() => ({ type: 'timer/tick' })),
                takeUntil(action$.pipe(ofType('timer/pause')))
            )
        )
    );

export const timerModule = {
    id: 'timer',
    reducersMap: { timer: timerSlice.reducer },
    epics: [combineEpics(tickEpic, finishEpic)]
};
```

Epics receive `(action$, state$, dependencies)`. Read the current state with `withLatestFrom(state$)` or `state$.value`.
See [timer.js](examples/main/default/lwc/examplesStore/timer.js) for a complete example.

If you create stores yourself, use the extension directly:
`createStore({ extensions: [getObservableExtension({ dependencies })] })` from `c/reduxEggs`.

## Undo / redo

Wrap a reducer with `undoable` from `c/reduxUndo`. The state becomes `{ past, present, future }`:

```js
import undoable, { ActionCreators, includeAction } from 'c/reduxUndo';

export const editorModule = {
    id: 'editor',
    reducersMap: {
        editor: undoable(editorSlice.reducer, { limit: 20, filter: includeAction(['editor/setText']) })
    }
};

const mapStateToProps = (state) => ({
    text: state.editor.present.text,
    canUndo: state.editor.past.length > 0
});
const mapDispatchToProps = { undo: ActionCreators.undo, redo: ActionCreators.redo };
```

`ActionCreators.undo()` applies to every undoable reducer in the store, so if you have more than one, make them react to
different action types with the `undoType` and `redoType` options.

## Calling component methods: ReduxLwcCommunicationService

The store layer (sagas, epics) should not touch components, but sometimes it has to trigger something only a component
can do: show a toast, focus an input, open a modal. `ReduxLwcCommunicationService` is a small event bus on top of an
RxJS `Subject` for this. `send(method, ...args)` calls `method(...args)` on every subscribed component that has that
method.

The examples use it to show toasts from sagas and epics
([notifications.js](examples/main/default/lwc/examplesStore/notifications.js)):

```js
// notifications.js: one bus per feature, plus helpers
import { ReduxLwcCommunicationService } from 'c/reduxLwcCommunicationService';
import { effects } from 'c/reduxSaga';

export const toastBus = new ReduxLwcCommunicationService();
export const sendToast = (toast) => toastBus.send('showToast', toast);
export const showToast = (toast) => effects.call(sendToast, toast); // saga effect

// saga
function* searchWorker({ payload }) {
    const results = yield call(searchContacts, payload);
    yield put(searchActions.searchSucceeded(results));
    yield showToast({ title: 'Search finished', message: `Found ${results.length}`, variant: 'success' });
}

// epic: side effect only
const notifyEpic = (action$) =>
    action$.pipe(
        ofType('timer/finished'),
        tap(() => sendToast({ title: "Time's up!", variant: 'success' })),
        ignoreElements()
    );

// the app container: the only subscriber
export default class App extends ReduxMixin(LightningElement) {
    connectedCallback() {
        this[ReduxMixin.Subscribe](toastBus); // unsubscribed automatically on disconnect
    }
    showToast({ title, message, variant = 'info' }) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
```

Guidelines:

- **Send plain data, not DOM events.** Sending `('dispatchEvent', new ShowToastEvent(...))` also works, but then the
  store layer builds DOM events and depends on the component's API. A named message such as `showToast` with a plain
  object keeps the two sides independent and easy to test.
- **In sagas, yield `call(...)`** instead of calling `send` directly. The saga then yields a plain effect description,
  so tests can assert `expect(gen.next().value).toEqual(showToast({...}))` without running the side effect.
- **Subscribe exactly once per message.** Every subscriber that has the method receives the message. Subscribe in one
  place, usually the container that renders the provider, so a toast is not shown twice.
- The bus is a module-level singleton, so it is shared by all stores on the page, including `local-store` ones.
- `ShowToastEvent` is only handled in Lightning Experience and the Salesforce app. In Visualforce or Lightning Out, show
  the message some other way.
- `clear()` completes the bus and unsubscribes every listener.

## Debugging: Redux DevTools and logger

### Redux DevTools browser extension

Components inside Lightning Experience run in a sandbox (Lightning Web Security or Locker), which cannot reliably reach
the `window.__REDUX_DEVTOOLS_EXTENSION__` object that the extension injects into the page. For this reason the provider
does not talk to the extension directly. With `use-devtools` it:

1. fires `reduxprovider__connect` with the initial state when the store is created;
2. fires `reduxprovider__action` with `{ action, state }` after every action;
3. understands the `JUMP_TO_ACTION` and `JUMP_TO_STATE` messages from the DevTools monitor, so time travel replaces the
   store state.

These events are composed, so the page that hosts the components can forward them to the extension. The
[ReduxDevtools.page](examples/main/default/pages/ReduxDevtools.page) example does exactly that with Lightning Out. The
core of the bridge is:

```js
const devtools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({ name: 'My app' });
let provider;

container.addEventListener('reduxprovider__connect', (event) => {
    provider = event.composedPath().find((node) => node.localName === 'c-redux-provider');
    devtools.init(event.detail.state);
    devtools.subscribe((message) => {
        if (message.type === 'DISPATCH' && /^JUMP_TO_(ACTION|STATE)$/.test(message.payload.type)) {
            provider.dispatch(message); // time travel
        } else if (message.type === 'ACTION') {
            provider.dispatch(JSON.parse(message.payload)); // "Dispatch" button of the monitor
        }
    });
});
container.addEventListener('reduxprovider__action', (event) => {
    devtools.send(event.detail.action, event.detail.state);
});
```

To debug your own app this way:

1. Install the Redux DevTools extension for
   [Chrome](https://chromewebstore.google.com/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd),
   [Firefox](https://addons.mozilla.org/firefox/addon/reduxdevtools/) or Edge.
2. Add `use-devtools` to your root provider.
3. Add your component as an `aura:dependency` of a Lightning Out app like
   [reduxExamplesOutApp](examples/main/default/aura/reduxExamplesOutApp/reduxExamplesOutApp.app) and host it in a
   Visualforce page with the script above.
4. Open the page, open the browser DevTools and select the **Redux** tab. You can inspect actions, state and diffs, time
   travel with the slider, and dispatch actions.

When `window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__` is reachable, for example in a local LWC OSS environment or when the
sandbox exposes it, Redux Toolkit's built-in `devTools` support connects the store to the extension on its own.

### In-app action log

You can also handle `reduxprovider__action` in the component that renders the provider. This works everywhere, including
Lightning Experience and mobile, and needs no extension:

```html
<c-redux-provider use-devtools onreduxprovider__action="{handleAction}">…</c-redux-provider>
```

See [reduxExamples](examples/main/default/lwc/reduxExamples) and
[exampleActionLog](examples/main/default/lwc/exampleActionLog).

### Console logger

Set the `REDUX_LOGGER` custom label to `true` (Setup → Custom Labels) to log every action in the browser console: the
previous state, the action and the next state. Actions whose type ends with `FAIL` are logged as errors. The label is
read when the store is created, so reload the page after changing it. Logging is off by default, so it never runs in
production by accident.

## Testing

The project uses [`@salesforce/sfdx-lwc-jest`](https://github.com/salesforce/sfdx-lwc-jest):

```bash
npm install
npm test                   # all tests
npm run test:unit:coverage # with coverage (vendored third party bundles are excluded)
```

Tests cover the provider, the mixin, devtools support, `mapStateToProps`/`mapDispatchToProps` handling, the module
lifecycle, the extensions, the legacy dynamic modules store and all examples.

A connected component must be rendered **inside the template** of a component that contains the provider. Under Jest's
synthetic shadow DOM, an element added with `provider.appendChild(child)` is not slotted, so its register event never
reaches the provider. Render the component that owns the provider (your app or container component), or a small test
host like [reduxTestHost](test/fixtures/lwc/reduxTestHost):

```js
import { createElement } from 'lwc';
import App from 'c/app'; // <c-redux-provider><c-counter></c-counter></c-redux-provider>

it('increments', async () => {
    const app = createElement('c-app', { is: App });
    document.body.appendChild(app);
    const counter = app.shadowRoot.querySelector('c-counter');

    counter.shadowRoot.querySelector('lightning-button').click();
    await Promise.resolve();

    expect(counter.shadowRoot.querySelector('lightning-button').label).toBe(1);
});
```

Things to know:

- **The root store is a module-level singleton,** so state leaks between tests in a file. Use `local-store` providers,
  or load the component with `jest.isolateModules` and share the LWC engine (see [test/utils](test/utils/index.js)):

    ```js
    import * as lwc from 'lwc';
    let App;
    jest.isolateModules(() => {
        jest.doMock('lwc', () => lwc); // a second LWC engine would clash with the custom elements registry
        App = require('c/app').default;
    });
    ```

- **jsdom does not compute a default `display`** for custom elements, and the provider skips updates for components
  without one. [jest.setup.js](jest.setup.js) emulates the browser default. Copy it into your project if your tests
  render connected components.
- **Fake timers:** thunks and sagas resolve through promises. Use `await jest.advanceTimersByTimeAsync(ms)` rather than
  `jest.advanceTimersByTime(ms)`.
- **Coverage:** the LWC transformer caches files without instrumentation, so `test:unit:coverage` runs with
  `--no-cache`.

## Migrating from the previous version

- **The store is built on redux-eggs and Redux Toolkit.** Modules use `reducersMap` (previously `reducerMap`).
  `initialActions`, `finalActions` and `connectActions` are not supported. Dispatch from `afterAdd`, `beforeRemove` or
  `connectedCallback` instead.
- **`c/redux` is Redux 5.** It contains only the public API. The previous per-file modules (`createStore.js`,
  `compose.js`, …) are replaced by one bundle.
- **`c/reduxThunk` has named exports:** `import { thunk, withExtraArgument } from 'c/reduxThunk'`.
- **Extensions** (`getThunkExtension`, `getLoggerExtension`) return `middleware` as a single function, which is the
  redux-eggs format.
- **`use-logger` is ignored.** Use the `REDUX_LOGGER` label instead.
- **`use-observable` runs `epics` declared by modules** through the new `getObservableExtension` in `c/reduxEggs`.
  Legacy modules with `epics` keep working.
- **New:** `local-store`, `addModules()`, `getLocalStore()`, `ReduxMixin.AddModules`, `ReduxMixin.Unsubscribe` (the
  misspelled `ReduxMixin.Unubscribe` was removed), `c/reduxToolkit`, `c/reduxUndo`, `c/reduxEggs`,
  `c/reduxLwcCommunicationService`, and devtools time travel.
- `c/reselect` is Reselect 5. The metadata API version is 64.0.
- **Fixes:** `initial-state` seeds each module's state when the module is first added (before, redux-eggs dropped the
  preloaded state). `provider.addModules()` works with the redux-eggs store. `c/reduxObservable` works with the bundled
  RxJS 6. The legacy `createStore` accepts extensions that return a single middleware. DevTools time-travel messages are
  no longer echoed back to the monitor as new actions.

## Legacy dynamic modules API

`c/reduxDynamicModulesCore` is a port of [redux-dynamic-modules](https://github.com/microsoft/redux-dynamic-modules),
which the provider used before redux-eggs. It is still available if you create stores yourself:

```js
import { createStore } from 'c/reduxDynamicModulesCore';
import { getSagaExtension } from 'c/reduxDynamicModulesSagaExtension';
import { getThunkExtension } from 'c/reduxDynamicModulesThunkExtension';

const store = createStore({ initialState: {}, extensions: [getThunkExtension(), getSagaExtension()] }, todoModule);
const { remove } = store.addModules([
    { id: 'users', reducerMap: { users }, sagas: [usersSaga], initialActions: [load()] }
]);
```

Legacy modules use `reducerMap`, `middlewares`, `sagas`, `epics` (with `getObservableExtension()`), `initialActions`,
`finalActions`, `connectActions` and `retained`.

## Project structure

```
force-app/main/default/
├── labels/CustomLabels.labels-meta.xml   REDUX_LOGGER label
└── lwc/                                  the library (see "What's inside")
examples/main/default/
├── lwc/                                  example components and their Jest tests
├── aura/reduxExamplesOutApp/             Lightning Out app
├── pages/ReduxDevtools.page              DevTools bridge page
├── tabs/Redux_Examples.tab-meta.xml      Lightning tab for the examples
└── permissionsets/Redux_Examples…        access to the tab and the page
```

## Read all about it

- [Redux docs](https://redux.js.org/) and [Redux Toolkit docs](https://redux-toolkit.js.org/)
- [Redux Saga docs](https://redux-saga.js.org/)
- [Redux Observable docs](https://redux-observable.js.org/) and [RxJS docs](https://rxjs.dev/guide/overview)
- [redux-eggs](https://github.com/redux-eggs/redux-eggs) and
  [redux-dynamic-modules](https://github.com/microsoft/redux-dynamic-modules)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools) and its
  [remote integration protocol](https://github.com/reduxjs/redux-devtools/blob/main/docs/Integrations/Remote.md)
- [Redux Undo](https://github.com/omnidan/redux-undo)
- [Normalizing data](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape)
- [Idiomatic Redux: selectors and Reselect](https://blog.isquaredsoftware.com/2017/12/idiomatic-redux-using-reselect-selectors/)
