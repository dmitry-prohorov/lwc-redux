import { configureStore } from 'c/reduxToolkit';
import { StateObservable, combineEpics, createEpicMiddleware, ofType } from 'c/reduxObservable';
import { Subject, operators } from 'c/rxjs';

const { map, withLatestFrom } = operators;

describe('reduxObservable with the bundled RxJS', () => {
    it('runs epics through createEpicMiddleware', () => {
        const epicMiddleware = createEpicMiddleware({ dependencies: { multiplier: 10 } });
        const reducer = (state = { total: 0 }, action) =>
            action.type === 'ADD' ? { total: state.total + action.payload } : state;
        const epic = (action$, state$, { multiplier }) =>
            action$.pipe(
                ofType('ADD_MULTIPLIED'),
                withLatestFrom(state$),
                map(([action, state]) => ({ type: 'ADD', payload: action.payload * multiplier + state.total }))
            );
        const store = configureStore({ reducer, middleware: () => [epicMiddleware] });
        epicMiddleware.run(epic);

        store.dispatch({ type: 'ADD_MULTIPLIED', payload: 2 });

        expect(store.getState()).toEqual({ total: 20 });
    });

    it('ofType filters by one or more action types', () => {
        const action$ = new Subject();
        const seen = [];
        action$.pipe(ofType('A', 'B')).subscribe((action) => seen.push(action.type));

        ['A', 'B', 'C'].forEach((type) => action$.next({ type }));
        action$.next('not an action');

        expect(seen).toEqual(['A', 'B']);
    });

    it('combineEpics merges epics and names the result', () => {
        const first = function first() {
            return new Subject();
        };
        const second = function second() {
            return new Subject();
        };
        expect(combineEpics(first, second).name).toBe('combineEpics(first, second)');
    });

    it('combineEpics throws when an epic returns nothing', () => {
        const broken = function broken() {};
        expect(() => combineEpics(broken)()).toThrow(
            'combineEpics: one of the provided Epics "broken" does not return a stream'
        );
    });

    it('StateObservable replays the current value and emits only changes', () => {
        const state$ = new Subject();
        const stateObservable = new StateObservable(state$, 1);
        const seen = [];
        stateObservable.subscribe((value) => seen.push(value));

        state$.next(1);
        state$.next(2);

        expect(seen).toEqual([1, 2]);
        expect(stateObservable.value).toBe(2);
    });
});
