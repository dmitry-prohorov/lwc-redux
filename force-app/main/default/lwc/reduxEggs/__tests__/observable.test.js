import { createStore, getObservableExtension } from 'c/reduxEggs';
import { ofType } from 'c/reduxObservable';
import { interval, operators } from 'c/rxjs';

const { map, mapTo, switchMap } = operators;

const counter = (state = 0, action) => (action.type === 'TICK' || action.type === 'PONG' ? state + 1 : state);
const pingEpic = (action$) => action$.pipe(ofType('PING'), mapTo({ type: 'PONG' }));
const tickerEpic = (action$) =>
    action$.pipe(
        ofType('START'),
        switchMap(() => interval(100).pipe(map(() => ({ type: 'TICK' }))))
    );

const storeWithExtension = (options) => {
    const store = createStore({ extensions: [getObservableExtension(options)] });
    store.addEggs([{ id: 'state', reducersMap: { counter }, keep: true }]);
    return store;
};

describe('getObservableExtension', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('provides a single epic middleware', () => {
        expect(typeof getObservableExtension().middleware).toBe('function');
    });

    it('runs the epics of an egg while it is added', () => {
        const store = storeWithExtension();
        const remove = store.addEggs([{ id: 'ping', epics: [pingEpic] }]);

        store.dispatch({ type: 'PING' });
        expect(store.getState().counter).toBe(1);

        remove();
        store.dispatch({ type: 'PING' });
        expect(store.getState().counter).toBe(1);
    });

    it('stops long running epics when the egg is removed', () => {
        const store = storeWithExtension();
        const remove = store.addEggs([{ id: 'ticker', epics: [tickerEpic] }]);

        store.dispatch({ type: 'START' });
        jest.advanceTimersByTime(300);
        expect(store.getState().counter).toBe(3);

        remove();
        jest.advanceTimersByTime(1000);
        expect(store.getState().counter).toBe(3);
    });

    it('runs an epic once when it is added again after removal', () => {
        const store = storeWithExtension();
        const egg = { id: 'ping', epics: [pingEpic] };
        store.addEggs([egg])();
        store.addEggs([egg]);

        store.dispatch({ type: 'PING' });

        expect(store.getState().counter).toBe(1);
    });

    it('reference counts epics shared by several eggs', () => {
        const store = storeWithExtension();
        const removeFirst = store.addEggs([{ id: 'first', epics: [pingEpic] }]);
        const removeSecond = store.addEggs([{ id: 'second', epics: [pingEpic] }]);

        store.dispatch({ type: 'PING' });
        expect(store.getState().counter).toBe(1);

        removeFirst();
        store.dispatch({ type: 'PING' });
        expect(store.getState().counter).toBe(2);

        removeSecond();
        store.dispatch({ type: 'PING' });
        expect(store.getState().counter).toBe(2);
    });

    it('ignores eggs without epics', () => {
        const store = storeWithExtension();
        expect(() => store.addEggs([{ id: 'plain', reducersMap: { other: (s = 1) => s } }])()).not.toThrow();
    });

    it('passes dependencies to the epics', () => {
        const store = storeWithExtension({ dependencies: { amount: 5 } });
        const epic = (action$, state$, { amount }) =>
            action$.pipe(
                ofType('PING'),
                map(() => ({ type: 'PONG', amount }))
            );
        const seen = [];
        store.addEggs([
            { id: 'deps', epics: [epic], middlewares: [() => (next) => (action) => seen.push(action) && next(action)] }
        ]);

        store.dispatch({ type: 'PING' });

        expect(seen).toContainEqual({ type: 'PONG', amount: 5 });
    });
});
