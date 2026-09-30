import * as lwc from 'lwc';

const LOGGER_LABEL = '@salesforce/label/c.REDUX_LOGGER';

const counterReducer = (state = 0, action) => {
    switch (action.type) {
        case 'counter/increment':
            return state + 1;
        case 'counter/set':
            return action.payload;
        default:
            return state;
    }
};
const increment = () => ({ type: 'counter/increment' });
const counterModule = { id: 'counter', reducersMap: { counter: counterReducer } };
const labelModule = { id: 'label', reducersMap: { label: (state = 'hello') => state } };

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * The root store is a module level singleton inside reduxProvider,
 * so every test loads a fresh copy of the component tree.
 */
const load = ({ loggerLabel = 'false' } = {}) => {
    let modules;
    jest.isolateModules(() => {
        // share one LWC engine, a second engine would clash with the global custom elements registry
        jest.doMock('lwc', () => lwc);
        // mocks registered with doMock persist between registries, so the label is always set explicitly
        jest.doMock(LOGGER_LABEL, () => ({ __esModule: true, default: loggerLabel }), { virtual: true });
        const { createElement } = require('lwc');
        const ReduxTestHost = require('c/reduxTestHost').default;
        const ReduxProvider = require('c/reduxProvider').default;
        modules = { createElement, ReduxTestHost, ReduxProvider };
    });
    return {
        ...modules,
        mount(props = {}) {
            const host = modules.createElement('c-redux-test-host', { is: modules.ReduxTestHost });
            Object.assign(host, props);
            document.body.appendChild(host);
            return host;
        }
    };
};

const child = (key, options = {}) => ({ key, ...options });

describe('c-redux-provider', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.restoreAllMocks();
    });

    describe('store creation', () => {
        it('creates a store with the provider modules and initial state', () => {
            const { mount } = load();
            const host = mount({ localStore: true, modules: [counterModule], initialState: { counter: 5 } });

            expect(host.getProvider().getLocalStore().getState()).toEqual({ counter: 5 });
        });

        it('seeds modules that are added later from the initial state', () => {
            const { mount } = load();
            const host = mount({
                localStore: true,
                initialState: { counter: 7 },
                children: [
                    child('a', { mapStateToProps: (state) => ({ count: state.counter }), modules: [counterModule] })
                ]
            });

            expect(host.getChildren()[0].getProp('count')).toBe(7);
        });

        it('accepts module factories', () => {
            const { mount } = load();
            const host = mount({ localStore: true, modules: [() => counterModule] });

            expect(host.getProvider().getLocalStore().getState()).toEqual({ counter: 0 });
        });

        it('fires reduxprovider__connect with the initial state and a load event', () => {
            const { createElement, ReduxProvider } = load();
            const provider = createElement('c-redux-provider', { is: ReduxProvider });
            provider.modules = [counterModule];
            const onConnect = jest.fn();
            const onLoad = jest.fn();
            provider.addEventListener('reduxprovider__connect', onConnect);
            provider.addEventListener('load', onLoad);

            document.body.appendChild(provider);

            expect(onConnect).toHaveBeenCalledTimes(1);
            const event = onConnect.mock.calls[0][0];
            expect(event.detail).toEqual({ state: { counter: 0 } });
            expect(event.bubbles).toBe(true);
            expect(event.composed).toBe(true);
            expect(onLoad).toHaveBeenCalledTimes(1);
        });

        it('shares one root store between providers without local-store', async () => {
            const { mount } = load();
            const first = mount({ modules: [counterModule] });
            const onConnect = jest.fn();
            document.body.addEventListener('reduxprovider__connect', onConnect);
            const second = mount({ modules: [labelModule] });

            // only the first provider creates the store
            expect(onConnect).not.toHaveBeenCalled();
            second.getProvider().dispatch(increment());
            first.children = [child('a', { mapStateToProps: (state) => ({ state }) })];
            await flush();

            expect(first.getChildren()[0].getProp('state')).toEqual({ counter: 1, label: 'hello' });
            expect(first.getProvider().getLocalStore()).toBeUndefined();
            document.body.removeEventListener('reduxprovider__connect', onConnect);
        });

        it('keeps local stores isolated from each other and from the root store', async () => {
            const { mount } = load();
            const root = mount({ modules: [counterModule] });
            const localA = mount({ localStore: true, modules: [counterModule] });
            const localB = mount({ localStore: true, modules: [counterModule] });

            localA.getProvider().dispatch(increment());
            localA.getProvider().dispatch(increment());
            localB.getProvider().dispatch(increment());

            root.children = [child('root', { mapStateToProps: (state) => ({ count: state.counter }) })];
            await flush();

            expect(localA.getProvider().getLocalStore().getState().counter).toBe(2);
            expect(localB.getProvider().getLocalStore().getState().counter).toBe(1);
            expect(root.getChildren()[0].getProp('count')).toBe(0);
        });
    });

    describe('connecting components', () => {
        it('maps state to props and updates them on every change', () => {
            const { mount } = load();
            const host = mount({
                localStore: true,
                modules: [counterModule],
                children: [child('a', { mapStateToProps: (state) => ({ count: state.counter }) })]
            });
            const [connected] = host.getChildren();
            expect(connected.getProp('count')).toBe(0);

            host.getProvider().dispatch(increment());

            expect(connected.getProp('count')).toBe(1);
        });

        it('passes the component to mapStateToProps as the second argument', () => {
            const { mount } = load();
            const mapStateToProps = jest.fn((state, component) => ({
                isComponent: typeof component.getProp === 'function'
            }));
            const host = mount({ localStore: true, children: [child('a', { mapStateToProps })] });

            expect(host.getChildren()[0].getProp('isComponent')).toBe(true);
        });

        it('registers component modules on connect and removes them on disconnect', async () => {
            const { mount } = load();
            const host = mount({
                localStore: true,
                children: [
                    child('a', { mapStateToProps: (state) => ({ count: state.counter }), modules: [counterModule] }),
                    child('b', { mapStateToProps: (state) => ({ count: state.counter }), modules: [counterModule] })
                ]
            });
            const store = host.getProvider().getLocalStore();
            store.dispatch(increment());
            expect(store.getState()).toEqual({ counter: 1 });

            // the module is reference counted: it stays while one component still uses it
            host.children = [host.children[1]];
            await flush();
            expect(store.getState()).toEqual({ counter: 1 });

            host.children = [];
            await flush();
            expect(store.getState()).toEqual({});
        });

        it('stops updating a component after it disconnects', async () => {
            const { mount } = load();
            const mapStateToProps = jest.fn((state) => ({ count: state.counter }));
            const host = mount({
                localStore: true,
                modules: [counterModule],
                children: [child('a', { mapStateToProps })]
            });
            const calls = mapStateToProps.mock.calls.length;

            host.children = [];
            await flush();
            host.getProvider().dispatch(increment());

            expect(mapStateToProps).toHaveBeenCalledTimes(calls);
        });

        it('does not update components without a computed display', () => {
            const { mount } = load();
            const host = mount({
                localStore: true,
                modules: [counterModule],
                children: [child('a', { mapStateToProps: (state) => ({ count: state.counter }) })]
            });
            jest.spyOn(window, 'getComputedStyle').mockReturnValue({ display: '' });

            host.getProvider().dispatch(increment());

            expect(host.getChildren()[0].getProp('count')).toBe(0);
        });

        it('logs and rethrows errors thrown by mapStateToProps', () => {
            const { mount } = load();
            const error = new Error('broken selector');
            const host = mount({
                localStore: true,
                modules: [counterModule],
                children: [
                    child('a', {
                        mapStateToProps: (state) => {
                            if (state.counter > 0) {
                                throw error;
                            }
                            return {};
                        }
                    })
                ]
            });
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

            expect(() => host.getProvider().dispatch(increment())).toThrow(error);
            expect(consoleError).toHaveBeenCalledWith(error);
        });

        it('binds an object of action creators', () => {
            const { mount } = load();
            const host = mount({
                localStore: true,
                modules: [counterModule],
                children: [child('a', { mapDispatchToProps: { increment } })]
            });

            host.getChildren()[0].callProp('increment');

            expect(host.getProvider().getLocalStore().getState().counter).toBe(1);
        });

        it('calls a mapDispatchToProps function with dispatch and the component', () => {
            const { mount } = load();
            const mapDispatchToProps = jest.fn((dispatch, component) => ({
                setToFive: () => dispatch({ type: 'counter/set', payload: 5 }),
                hasComponent: typeof component.getProp === 'function'
            }));
            const host = mount({
                localStore: true,
                modules: [counterModule],
                children: [child('a', { mapDispatchToProps })]
            });
            const [connected] = host.getChildren();

            connected.callProp('setToFive');

            expect(connected.getProp('hasComponent')).toBe(true);
            expect(host.getProvider().getLocalStore().getState().counter).toBe(5);
        });

        it('assigns dispatch to ReduxMixin.Dispatch when mapDispatchToProps is missing', () => {
            const { mount } = load();
            const host = mount({ localStore: true, modules: [counterModule], children: [child('a')] });

            host.getChildren()[0].getSymbolProp('Dispatch')(increment());

            expect(host.getProvider().getLocalStore().getState().counter).toBe(1);
        });

        it('lets a component add modules later through ReduxMixin.AddModules', () => {
            const { mount } = load();
            const host = mount({ localStore: true, children: [child('a')] });
            const store = host.getProvider().getLocalStore();

            const remove = host.getChildren()[0].addModules([counterModule]);
            expect(store.getState()).toEqual({ counter: 0 });

            remove();
            expect(store.getState()).toEqual({});
        });

        it('connects components to the closest provider', async () => {
            const { mount } = load();
            const root = mount({ modules: [counterModule] });
            const local = mount({ localStore: true, modules: [counterModule] });
            local.children = [child('local', { mapDispatchToProps: { increment } })];
            await flush();

            local.getChildren()[0].callProp('increment');

            expect(local.getProvider().getLocalStore().getState().counter).toBe(1);
            root.children = [child('root', { mapStateToProps: (state) => ({ count: state.counter }) })];
            await flush();
            expect(root.getChildren()[0].getProp('count')).toBe(0);
        });
    });

    describe('public API', () => {
        it('dispatch() and addModules() are safe before the store exists', () => {
            const { createElement, ReduxProvider } = load();
            const provider = createElement('c-redux-provider', { is: ReduxProvider });

            expect(() => provider.dispatch(increment())).not.toThrow();
            expect(provider.addModules([counterModule])()).toBeNull();
        });

        it('addModules() registers modules and returns a function that removes them', () => {
            const { mount } = load();
            const host = mount({ localStore: true });
            const provider = host.getProvider();

            const remove = provider.addModules([counterModule]);
            provider.dispatch(increment());
            expect(provider.getLocalStore().getState()).toEqual({ counter: 1 });

            remove();
            expect(provider.getLocalStore().getState()).toEqual({});
        });

        it('adds modules assigned after the provider is connected', async () => {
            const { mount } = load();
            const host = mount({ localStore: true, modules: [counterModule] });

            host.modules = [labelModule];
            await flush();

            expect(host.getProvider().getLocalStore().getState()).toEqual({ counter: 0, label: 'hello' });
        });
    });

    describe('disconnect', () => {
        it('fires reduxprovider__disconnect', () => {
            const { mount } = load();
            const host = mount({ localStore: true });
            const onDisconnect = jest.fn();
            host.getProvider().addEventListener('reduxprovider__disconnect', onDisconnect);

            document.body.removeChild(host);

            expect(onDisconnect).toHaveBeenCalledTimes(1);
        });

        it('removes the modules it added to an existing store', () => {
            const { mount } = load();
            const owner = mount({
                modules: [counterModule],
                children: [child('a', { mapStateToProps: (s) => ({ s }) })]
            });
            const guest = mount({ modules: [labelModule] });
            const [observer] = owner.getChildren();
            expect(observer.getProp('s')).toEqual({ counter: 0, label: 'hello' });

            document.body.removeChild(guest);

            expect(observer.getProp('s')).toEqual({ counter: 0 });
        });

        it('keeps the modules with disable-cleanup-on-disconnect', () => {
            const { mount } = load();
            const owner = mount({
                modules: [counterModule],
                children: [child('a', { mapStateToProps: (s) => ({ s }) })]
            });
            const guest = mount({ modules: [labelModule], disableCleanupOnDisconnect: true });

            document.body.removeChild(guest);
            owner.getProvider().dispatch(increment());

            expect(owner.getChildren()[0].getProp('s')).toEqual({ counter: 1, label: 'hello' });
        });
    });

    describe('extensions', () => {
        it('runs module sagas with use-saga', () => {
            const { mount } = load();
            const { effects } = require('c/reduxSaga');
            function* saga() {
                yield effects.takeEvery('counter/increment', function* double() {
                    yield effects.put({ type: 'counter/set', payload: 100 });
                });
            }
            const host = mount({ localStore: true, useSaga: true, modules: [{ ...counterModule, sagas: [saga] }] });
            const store = host.getProvider().getLocalStore();

            store.dispatch(increment());

            expect(store.getState().counter).toBe(100);
            expect(store.getSagaTasks()).toHaveLength(1);
        });

        it('runs module epics with use-observable', () => {
            const { mount } = load();
            const { ofType } = require('c/reduxObservable');
            const { operators } = require('c/rxjs');
            const epic = (action$) =>
                action$.pipe(ofType('counter/increment'), operators.mapTo({ type: 'counter/set', payload: 50 }));
            const host = mount({
                localStore: true,
                useObservable: true,
                modules: [{ ...counterModule, epics: [epic] }]
            });
            const store = host.getProvider().getLocalStore();

            store.dispatch(increment());

            expect(store.getState().counter).toBe(50);
        });

        it('supports thunks', () => {
            const { mount } = load();
            const host = mount({ localStore: true, useThunk: true, modules: [counterModule] });
            const provider = host.getProvider();

            provider.dispatch((dispatch, getState) => {
                dispatch({ type: 'counter/set', payload: getState().counter + 10 });
            });

            expect(provider.getLocalStore().getState().counter).toBe(10);
        });

        it('does not log actions by default', () => {
            const { mount } = load();
            const group = jest.spyOn(console, 'group').mockImplementation(() => {});
            mount({ localStore: true, modules: [counterModule] })
                .getProvider()
                .dispatch(increment());

            expect(group).not.toHaveBeenCalled();
        });

        it('logs actions when the REDUX_LOGGER label is true', () => {
            const { mount } = load({ loggerLabel: 'true' });
            const group = jest.spyOn(console, 'group').mockImplementation(() => {});
            jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
            jest.spyOn(console, 'log').mockImplementation(() => {});
            jest.spyOn(console, 'info').mockImplementation(() => {});

            mount({ localStore: true, modules: [counterModule] })
                .getProvider()
                .dispatch(increment());

            expect(group).toHaveBeenCalledWith('%ccounter/increment', expect.any(String));
        });
    });

    describe('devtools', () => {
        it('does not fire reduxprovider__action without use-devtools', () => {
            const { mount } = load();
            const onAction = jest.fn();
            document.body.addEventListener('reduxprovider__action', onAction);

            mount({ localStore: true, modules: [counterModule] })
                .getProvider()
                .dispatch(increment());

            expect(onAction).not.toHaveBeenCalled();
            document.body.removeEventListener('reduxprovider__action', onAction);
        });

        it('fires reduxprovider__action with the action and the next state', () => {
            const { mount } = load();
            const host = mount({ localStore: true, useDevtools: true, modules: [counterModule] });
            const onAction = jest.fn();
            host.addEventListener('reduxprovider__action', onAction);

            host.getProvider().dispatch(increment());

            expect(onAction).toHaveBeenCalledTimes(1);
            const event = onAction.mock.calls[0][0];
            expect(event.detail).toEqual({ action: increment(), state: { counter: 1 } });
            expect(event.composed).toBe(true);
        });

        it.each(['JUMP_TO_ACTION', 'JUMP_TO_STATE'])('replaces the state on %s without reporting it', (type) => {
            const { mount } = load();
            const host = mount({ localStore: true, useDevtools: true, modules: [counterModule] });
            const provider = host.getProvider();
            const onAction = jest.fn();
            host.addEventListener('reduxprovider__action', onAction);

            provider.dispatch({ type: 'DISPATCH', payload: { type }, state: JSON.stringify({ counter: 42 }) });

            expect(provider.getLocalStore().getState()).toEqual({ counter: 42 });
            expect(onAction).not.toHaveBeenCalled();
        });
    });
});
