// Contract tests for the redux-eggs behaviour that <c-redux-provider> relies on
import { createStore, getCounter, getSagaExtension } from 'c/reduxEggs';
import { effects } from 'c/reduxSaga';

const counter = (state = 0, action) => (action.type === 'inc' ? state + 1 : state);
const counterEgg = { id: 'counter', reducersMap: { counter } };

describe('redux-eggs', () => {
    describe('getCounter', () => {
        it('reference counts values', () => {
            const refs = getCounter();
            refs.add('a');
            refs.add('a');
            expect(refs.getCount('a')).toBe(2);
            refs.remove('a');
            expect(refs.getItems()).toEqual([{ value: 'a', count: 1 }]);
            refs.remove('a');
            expect(refs.getCount('a')).toBe(0);
            expect(refs.getItems()).toEqual([]);
        });

        it('supports custom equality and kept values', () => {
            const refs = getCounter(
                (a, b) => a.id === b.id,
                (value) => value.keep
            );
            refs.add({ id: 1, keep: true });
            refs.add({ id: 1 });
            refs.remove({ id: 1 });
            expect(refs.getCount({ id: 1 })).toBe(Infinity);
        });
    });

    describe('createStore', () => {
        it('adds and removes reducers with their state', () => {
            const store = createStore();
            const remove = store.addEggs([counterEgg]);
            store.dispatch({ type: 'inc' });
            expect(store.getState()).toEqual({ counter: 1 });

            remove();
            expect(store.getState()).toEqual({});
        });

        it('reference counts eggs by id', () => {
            const store = createStore();
            const removeFirst = store.addEggs([counterEgg]);
            const removeSecond = store.addEggs([{ ...counterEgg }]);
            expect(store.getEggCount(counterEgg)).toBe(2);

            removeFirst();
            expect(store.getState()).toEqual({ counter: 0 });
            removeSecond();
            expect(store.getState()).toEqual({});
        });

        it('never removes eggs marked with keep', () => {
            const store = createStore();
            store.addEggs([{ ...counterEgg, keep: true }])();
            expect(store.getState()).toEqual({ counter: 0 });
        });

        it('flattens nested arrays and ignores invalid eggs', () => {
            const store = createStore();
            store.addEggs([[counterEgg], null, { reducersMap: {} }]);
            expect(store.getEggs().map((item) => item.value.id)).toEqual(['counter']);
        });

        it('dispatches @@eggs/reduce when reducers change', () => {
            const seen = [];
            const store = createStore({
                middleware: () => [() => (next) => (action) => seen.push(action) && next(action)]
            });
            store.addEggs([counterEgg])();

            expect(seen.filter((action) => action.type === '@@eggs/reduce')).toEqual([
                { type: '@@eggs/reduce', payload: { method: 'add', reducers: ['counter'] } },
                { type: '@@eggs/reduce', payload: { method: 'remove', reducers: ['counter'] } }
            ]);
        });

        it('calls egg lifecycle hooks with the store', () => {
            const calls = [];
            const hook = (name) => (store) => calls.push([name, typeof store.dispatch]);
            const store = createStore();
            store.addEggs([
                {
                    ...counterEgg,
                    beforeAdd: hook('beforeAdd'),
                    afterAdd: hook('afterAdd'),
                    beforeRemove: hook('beforeRemove'),
                    afterRemove: hook('afterRemove')
                }
            ])();

            expect(calls).toEqual([
                ['beforeAdd', 'function'],
                ['afterAdd', 'function'],
                ['beforeRemove', 'function'],
                ['afterRemove', 'function']
            ]);
        });

        it('adds and removes egg middlewares', () => {
            const spy = jest.fn();
            const middleware = () => (next) => (action) => {
                spy(action.type);
                return next(action);
            };
            const store = createStore();
            const remove = store.addEggs([{ id: 'spy', middlewares: [middleware] }]);
            store.dispatch({ type: 'one' });
            remove();
            store.dispatch({ type: 'two' });

            expect(spy).toHaveBeenCalledWith('one');
            expect(spy).not.toHaveBeenCalledWith('two');
        });

        it('passes extension middlewares and enhancers to the store', () => {
            const extensionMiddleware = jest.fn(() => (next) => (action) => next(action));
            const enhancer =
                (createStoreFn) =>
                (...args) => ({ ...createStoreFn(...args), enhanced: true });
            const store = createStore({ extensions: [{ middleware: extensionMiddleware, enhancer }] });

            expect(store.enhanced).toBe(true);
            expect(extensionMiddleware).toHaveBeenCalled();
        });

        it('uses a custom reducer combiner', () => {
            const reducerCombiner = jest.fn((reducers) => (state = {}) => ({ ...state, keys: Object.keys(reducers) }));
            const store = createStore({ reducerCombiner });
            store.addEggs([counterEgg]);
            expect(store.getState().keys).toEqual(['counter']);
        });
    });

    describe('getSagaExtension', () => {
        it('runs egg sagas while the egg is present', () => {
            const worker = jest.fn();
            function* saga() {
                yield effects.takeEvery('ping', worker);
            }
            const store = createStore({ extensions: [getSagaExtension()] });
            const remove = store.addEggs([{ id: 'saga', sagas: [saga] }]);
            store.dispatch({ type: 'ping' });
            const [task] = store.getSagaTasks();

            remove();
            store.dispatch({ type: 'ping' });

            expect(worker).toHaveBeenCalledTimes(1);
            expect(task.isCancelled()).toBe(true);
            expect(store.getSagaTasks()).toEqual([]);
        });
    });
});
