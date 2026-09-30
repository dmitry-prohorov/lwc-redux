import {
    createDynamicMiddlewares,
    createStore,
    getMap,
    getObjectRefCounter,
    getRefCountedManager,
    getReducerManager,
    getRefCountedReducerManager,
    getStringRefCounter
} from 'c/reduxDynamicModulesCore';
import { getThunkExtension } from 'c/reduxDynamicModulesThunkExtension';

const counter = (state = 0, action) => (action.type === 'inc' ? state + 1 : state);
const label = (state = 'x') => state;

describe('reduxDynamicModulesCore (legacy)', () => {
    describe('getMap', () => {
        it('stores values with a custom comparer', () => {
            const map = getMap((a, b) => a.id === b.id);
            map.add({ id: 1 }, 'one');
            map.add({ id: 1 }, 'duplicate');

            expect(map.get({ id: 1 })).toBe('one');
            expect(map.remove({ id: 1 })).toBe('one');
            expect(map.get({ id: 1 })).toBeUndefined();
            expect(map.remove({ id: 1 })).toBeUndefined();
        });

        it('ignores empty keys', () => {
            const map = getMap();
            map.add(undefined, 'value');
            expect(map.keys).toEqual([]);
            expect(map.get(undefined)).toBeUndefined();
            expect(map.remove(null)).toBeUndefined();
        });
    });

    describe('getObjectRefCounter', () => {
        it('counts references', () => {
            const refs = getObjectRefCounter();
            const item = {};
            refs.add(item);
            refs.add(item);
            expect(refs.getCount(item)).toBe(2);
            expect(refs.remove(item)).toBe(false);
            expect(refs.remove(item)).toBe(true);
            expect(refs.getCount(item)).toBe(0);
            expect(refs.remove(item)).toBe(false);
        });

        it('keeps retained items forever', () => {
            const refs = getObjectRefCounter(undefined, (item) => item.retained);
            const item = { retained: true };
            refs.add(item);
            expect(refs.getCount(item)).toBe(Infinity);
            expect(refs.remove(item)).toBe(false);
        });

        it('ignores empty values', () => {
            const refs = getObjectRefCounter();
            refs.add(null);
            expect(refs.getCount(null)).toBe(0);
            expect(refs.getCount(undefined)).toBe(0);
        });
    });

    describe('getStringRefCounter', () => {
        it('counts keys', () => {
            const refs = getStringRefCounter();
            refs.add('a');
            refs.add('a');
            expect(refs.getCount('a')).toBe(2);
            expect(refs.remove('a')).toBe(false);
            expect(refs.remove('a')).toBe(true);
            expect(refs.remove('a')).toBe(false);
            expect(refs.getCount('a')).toBe(0);
        });

        it('ignores empty keys', () => {
            const refs = getStringRefCounter();
            refs.add(undefined);
            expect(refs.getCount(undefined)).toBe(0);
            expect(refs.remove(null)).toBe(false);
        });
    });

    describe('getReducerManager', () => {
        it('adds and removes reducers and their state', () => {
            const manager = getReducerManager({ counter });
            let state = manager.reduce(undefined, { type: 'inc' });
            expect(state).toEqual({ counter: 1 });

            manager.add('label', label);
            manager.add('label', counter); // already registered, ignored
            state = manager.reduce(state, { type: 'init' });
            expect(state).toEqual({ counter: 1, label: 'x' });

            manager.remove('counter');
            manager.remove('missing');
            expect(manager.reduce(state, { type: 'init' })).toEqual({ label: 'x' });
            expect(Object.keys(manager.getReducerMap())).toEqual(['label']);
        });

        it('returns the state unchanged when there are no reducers', () => {
            const manager = getReducerManager({ counter });
            manager.remove('counter');
            expect(manager.reduce({ counter: 1 }, { type: 'x' })).toEqual({});
        });

        it('reference counts reducer keys', () => {
            const manager = getRefCountedReducerManager(getReducerManager({ counter }));
            manager.add('counter', counter);
            manager.remove('counter');
            expect(manager.getReducerMap()).toHaveProperty('counter');
            manager.remove('counter');
            expect(manager.getReducerMap()).not.toHaveProperty('counter');
        });
    });

    describe('createDynamicMiddlewares', () => {
        it('adds, removes and resets middlewares', () => {
            const calls = [];
            const make = (name) => () => (next) => (action) => {
                calls.push(name);
                return next(action);
            };
            const first = make('first');
            const second = make('second');
            const instance = createDynamicMiddlewares();
            const run = (action) => instance.enhancer({})((a) => a)(action);

            instance.addMiddleware(first, second);
            run({ type: 'a' });
            expect(calls).toEqual(['first', 'second']);

            instance.removeMiddleware(first);
            run({ type: 'b' });
            expect(calls).toEqual(['first', 'second', 'second']);

            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
            instance.removeMiddleware(first);
            expect(consoleError).toHaveBeenCalledWith('Middleware does not exist!', first);
            consoleError.mockRestore();

            instance.resetMiddlewares();
            run({ type: 'c' });
            expect(calls).toHaveLength(3);
        });
    });

    describe('getRefCountedManager', () => {
        it('adds items once and removes them when the last reference is gone', () => {
            const manager = {
                getItems: () => [],
                add: jest.fn(),
                remove: jest.fn(),
                dispose: jest.fn(),
                connect: jest.fn()
            };
            const refCounted = getRefCountedManager(manager, (a, b) => a.id === b.id);

            refCounted.add([{ id: 1 }, null]);
            refCounted.add([{ id: 1 }]);
            expect(manager.add).toHaveBeenNthCalledWith(1, [{ id: 1 }]);
            expect(manager.add).toHaveBeenNthCalledWith(2, []);
            expect(manager.connect).toHaveBeenCalledTimes(2);

            refCounted.remove([{ id: 1 }, null]);
            expect(manager.remove).not.toHaveBeenCalled();
            refCounted.remove([{ id: 1 }]);
            expect(manager.remove).toHaveBeenCalledWith([{ id: 1 }]);

            refCounted.add(undefined);
            refCounted.remove(undefined);
            refCounted.dispose();
            expect(manager.dispose).toHaveBeenCalled();
        });
    });

    describe('createStore', () => {
        it('creates a store with initial modules and lifecycle actions', () => {
            const seen = [];
            const recorder = () => (next) => (action) => {
                seen.push(action.type);
                return next(action);
            };
            const store = createStore(
                { initialState: { counter: 3 }, extensions: [{ middleware: [recorder] }] },
                {
                    id: 'counter',
                    reducerMap: { counter },
                    initialActions: [{ type: 'inc' }],
                    finalActions: [{ type: 'bye' }],
                    connectActions: [{ type: 'connected' }]
                }
            );

            expect(store.getState()).toEqual({ counter: 4 });
            expect(seen).toEqual([
                '@@Internal/ModuleManager/SeedReducers',
                '@@Internal/ModuleManager/ModuleAdded',
                'inc',
                'connected'
            ]);

            store.dispose();
            expect(seen.slice(-2)).toEqual(['bye', '@@Internal/ModuleManager/ModuleRemoved']);
            expect(store.getState()).toEqual({});
        });

        it('adds and removes modules with reference counting', () => {
            const store = createStore({});
            const first = store.addModules([{ id: 'counter', reducerMap: { counter } }]);
            const second = store.addModule({ id: 'counter', reducerMap: { counter } });
            store.dispatch({ type: 'inc' });

            first.remove();
            expect(store.getState()).toEqual({ counter: 1 });
            second.remove();
            expect(store.getState()).toEqual({});
        });

        it('keeps retained modules', () => {
            const store = createStore({});
            store.addModules([{ id: 'counter', reducerMap: { counter }, retained: true }]).remove();
            expect(store.getState()).toEqual({ counter: 0 });
        });

        it('adds and removes module middlewares', () => {
            const spy = jest.fn();
            const middleware = () => (next) => (action) => {
                spy(action.type);
                return next(action);
            };
            const store = createStore({});
            const { remove } = store.addModules([{ id: 'm', middlewares: [middleware] }]);
            store.dispatch({ type: 'one' });
            remove();
            store.dispatch({ type: 'two' });

            expect(spy).toHaveBeenCalledWith('one');
            expect(spy).not.toHaveBeenCalledWith('two');
        });

        it('notifies extensions', () => {
            const extension = {
                onModuleManagerCreated: jest.fn(),
                onModuleAdded: jest.fn(),
                onModuleRemoved: jest.fn(),
                dispose: jest.fn()
            };
            const store = createStore({ extensions: [extension] });
            const mdl = { id: 'a', reducerMap: { label } };
            store.addModules([mdl]).remove();
            store.dispose();

            expect(extension.onModuleManagerCreated).toHaveBeenCalledWith({
                addModule: store.addModule,
                addModules: store.addModules
            });
            expect(extension.onModuleAdded).toHaveBeenCalledWith(mdl);
            expect(extension.onModuleRemoved).toHaveBeenCalledWith(mdl);
            expect(extension.dispose).toHaveBeenCalled();
        });

        it('accepts extensions that provide a single middleware', () => {
            const store = createStore(
                { extensions: [getThunkExtension()] },
                { id: 'counter', reducerMap: { counter } }
            );
            store.dispatch((dispatch) => dispatch({ type: 'inc' }));
            expect(store.getState()).toEqual({ counter: 1 });
        });

        it('returns an empty state without modules', () => {
            expect(createStore({}).getState()).toEqual({});
        });

        it('applies custom enhancers', () => {
            const enhancer =
                (createStoreFn) =>
                (...args) => ({ ...createStoreFn(...args), enhanced: true });
            expect(createStore({ enhancers: [enhancer] }).enhanced).toBe(true);
        });
    });
});
