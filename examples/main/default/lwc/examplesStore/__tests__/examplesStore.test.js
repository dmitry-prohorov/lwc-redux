import { configureStore } from 'c/reduxToolkit';
import { createStore, getSagaExtension } from 'c/reduxEggs';
import {
    DEBOUNCE_MS,
    FILTERS,
    addTodo,
    counterActions,
    counterModule,
    fetchTodos,
    searchActions,
    searchModule,
    searchWorker,
    showToast,
    toastBus,
    selectCanRedo,
    selectCanUndo,
    selectCount,
    selectFilter,
    selectHistoryValues,
    selectQuery,
    selectResults,
    selectSearchStatus,
    selectStep,
    selectTodoStats,
    selectTodosError,
    selectTodosStatus,
    selectUndoCount,
    selectUndoStep,
    selectVisibleTodos,
    todosActions,
    todosModule,
    undoCounterActions,
    undoCounterModule
} from 'c/examplesStore';
import * as api from '../api';

const storeWith = (...modules) => {
    const store = createStore({ extensions: [getSagaExtension()] });
    store.addEggs(modules);
    return store;
};

describe('examplesStore', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    describe('api', () => {
        it('returns copies of the todos', async () => {
            const promise = api.fetchTodos();
            jest.runAllTimers();
            const todos = await promise;
            expect(todos).toHaveLength(3);
            todos[0].title = 'changed';

            const again = api.fetchTodos();
            jest.runAllTimers();
            expect((await again)[0].title).not.toBe('changed');
        });

        it('creates todos with trimmed titles and rejects empty ones', async () => {
            const promise = api.createTodo('  Write docs ');
            jest.runAllTimers();
            expect(await promise).toEqual({
                id: expect.stringMatching(/^t\d+$/),
                title: 'Write docs',
                completed: false
            });

            await expect(api.createTodo('   ')).rejects.toThrow('Title is required');
            await expect(api.createTodo()).rejects.toThrow('Title is required');
        });

        it('searches contacts case-insensitively', async () => {
            const promise = api.searchContacts('ADA');
            jest.runAllTimers();
            expect(await promise).toEqual([{ id: 'c1', name: 'Ada Lovelace' }]);

            const all = api.searchContacts();
            jest.runAllTimers();
            expect(await all).toHaveLength(10);
        });
    });

    describe('counter', () => {
        it('increments and decrements by the step and resets', () => {
            const store = storeWith(counterModule);
            store.dispatch(counterActions.setStep('5'));
            store.dispatch(counterActions.increment());
            store.dispatch(counterActions.increment());
            store.dispatch(counterActions.decrement());
            expect(selectCount(store.getState())).toBe(5);
            expect(selectStep(store.getState())).toBe(5);

            store.dispatch(counterActions.reset());
            expect(store.getState().counter).toEqual({ value: 0, step: 1 });
        });

        it('falls back to a step of 1 for invalid input', () => {
            const store = storeWith(counterModule);
            store.dispatch(counterActions.setStep('abc'));
            expect(selectStep(store.getState())).toBe(1);
        });

        it('selectors work before the module is added', () => {
            expect(selectCount({})).toBe(0);
            expect(selectStep({})).toBe(1);
        });
    });

    describe('todos', () => {
        const loadedStore = async () => {
            const store = storeWith(todosModule);
            const promise = store.dispatch(fetchTodos());
            expect(selectTodosStatus(store.getState())).toBe('loading');
            await jest.runAllTimersAsync();
            await promise;
            return store;
        };

        it('fetches todos', async () => {
            const store = await loadedStore();
            expect(selectTodosStatus(store.getState())).toBe('idle');
            expect(selectTodoStats(store.getState())).toEqual({ total: 3, completed: 2, active: 1 });
        });

        it('stores the error when fetching fails', async () => {
            jest.spyOn(api, 'fetchTodos').mockRejectedValueOnce(new Error('offline'));
            const store = storeWith(todosModule);
            await store.dispatch(fetchTodos());

            expect(selectTodosStatus(store.getState())).toBe('failed');
            expect(selectTodosError(store.getState())).toBe('offline');
            jest.restoreAllMocks();
        });

        it('adds todos and reports validation errors', async () => {
            const store = await loadedStore();
            const added = store.dispatch(addTodo('New one'));
            await jest.runAllTimersAsync();
            await added;
            expect(selectTodoStats(store.getState()).total).toBe(4);

            const result = await store.dispatch(addTodo(''));
            expect(result.error.message).toBe('Title is required');
            expect(selectTodosError(store.getState())).toBe('Title is required');
        });

        it('toggles and removes todos', async () => {
            const store = await loadedStore();
            store.dispatch(todosActions.toggleTodo('t3'));
            store.dispatch(todosActions.toggleTodo('missing'));
            expect(selectTodoStats(store.getState())).toEqual({ total: 3, completed: 3, active: 0 });

            store.dispatch(todosActions.removeTodo('t1'));
            expect(selectTodoStats(store.getState()).total).toBe(2);
        });

        it('filters visible todos with memoized selectors', async () => {
            const store = await loadedStore();
            const all = selectVisibleTodos(store.getState());
            expect(all).toHaveLength(3);
            expect(selectVisibleTodos(store.getState())).toBe(all);

            store.dispatch(todosActions.setFilter(FILTERS.ACTIVE));
            expect(selectFilter(store.getState())).toBe(FILTERS.ACTIVE);
            expect(selectVisibleTodos(store.getState()).map((todo) => todo.id)).toEqual(['t3']);

            store.dispatch(todosActions.setFilter(FILTERS.COMPLETED));
            expect(selectVisibleTodos(store.getState()).map((todo) => todo.id)).toEqual(['t1', 't2']);
        });

        it('selectors work before the module is added', () => {
            expect(selectVisibleTodos({})).toEqual([]);
            expect(selectTodosStatus({})).toBe('idle');
        });
    });

    describe('search saga', () => {
        it('debounces the query and stores the results', async () => {
            const spy = jest.spyOn(api, 'searchContacts');
            const store = storeWith(searchModule);

            store.dispatch(searchActions.setQuery('a'));
            store.dispatch(searchActions.setQuery('al'));
            store.dispatch(searchActions.setQuery('alan'));
            expect(selectQuery(store.getState())).toBe('alan');

            await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
            expect(selectSearchStatus(store.getState())).toBe('loading');
            await jest.runAllTimersAsync();

            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith('alan');
            expect(selectResults(store.getState())).toEqual([{ id: 'c2', name: 'Alan Turing' }]);
            expect(selectSearchStatus(store.getState())).toBe('idle');
            jest.restoreAllMocks();
        });

        it('reports the result with a toast', async () => {
            const send = jest.spyOn(toastBus, 'send').mockImplementation(() => {});
            const store = storeWith(searchModule);

            store.dispatch(searchActions.setQuery('alan'));
            await jest.runAllTimersAsync();
            store.dispatch(searchActions.setQuery('nobody'));
            await jest.runAllTimersAsync();

            expect(send).toHaveBeenNthCalledWith(1, 'showToast', {
                title: 'Search finished',
                message: 'Found 1 contact(s) for "alan"',
                variant: 'success'
            });
            expect(send).toHaveBeenNthCalledWith(2, 'showToast', {
                title: 'Search finished',
                message: 'No contacts match "nobody"',
                variant: 'info'
            });
            jest.restoreAllMocks();
        });

        it('yields the toast as an effect, so it can be tested without side effects', () => {
            const worker = searchWorker(searchActions.setQuery('ada'));
            worker.next(); // delay
            worker.next(); // searchStarted
            worker.next(); // call api
            worker.next([{ id: 'c1', name: 'Ada Lovelace' }]); // put searchSucceeded

            expect(worker.next().value).toEqual(
                showToast({ title: 'Search finished', message: 'Found 1 contact(s) for "ada"', variant: 'success' })
            );
            expect(worker.next().done).toBe(true);
        });

        it('clears the results for an empty query without calling the api', async () => {
            const spy = jest.spyOn(api, 'searchContacts');
            const store = storeWith(searchModule);
            store.dispatch(searchActions.searchSucceeded([{ id: 'x', name: 'X' }]));

            store.dispatch(searchActions.setQuery('   '));
            await jest.runAllTimersAsync();

            expect(spy).not.toHaveBeenCalled();
            expect(selectResults(store.getState())).toEqual([]);
            jest.restoreAllMocks();
        });

        it('stores the error when the search fails', async () => {
            jest.spyOn(api, 'searchContacts').mockRejectedValueOnce(new Error('timeout'));
            const send = jest.spyOn(toastBus, 'send').mockImplementation(() => {});
            const store = storeWith(searchModule);

            store.dispatch(searchActions.setQuery('ada'));
            await jest.runAllTimersAsync();

            expect(selectSearchStatus(store.getState())).toBe('failed');
            expect(store.getState().search.error).toBe('timeout');
            expect(send).toHaveBeenCalledWith('showToast', {
                title: 'Search failed',
                message: 'timeout',
                variant: 'error'
            });
            jest.restoreAllMocks();
        });
    });

    describe('undo counter', () => {
        it('undoes and redoes value changes', () => {
            const store = configureStore({ reducer: undoCounterModule.reducersMap.undoCounter });
            const state = () => ({ undoCounter: store.getState() });

            expect(selectCanUndo(state())).toBe(false);
            store.dispatch(undoCounterActions.increment());
            store.dispatch(undoCounterActions.increment());
            expect(selectUndoCount(state())).toBe(2);
            expect(selectHistoryValues(state())).toEqual([0, 1]);

            store.dispatch(undoCounterActions.undo());
            expect(selectUndoCount(state())).toBe(1);
            expect(selectCanRedo(state())).toBe(true);

            store.dispatch(undoCounterActions.redo());
            expect(selectUndoCount(state())).toBe(2);

            store.dispatch(undoCounterActions.clearHistory());
            expect(selectCanUndo(state())).toBe(false);
        });

        it('does not record step changes in the history', () => {
            const store = configureStore({ reducer: undoCounterModule.reducersMap.undoCounter });
            store.dispatch(undoCounterActions.setStep(3));
            const state = { undoCounter: store.getState() };

            expect(selectUndoStep(state)).toBe(3);
            expect(selectCanUndo(state)).toBe(false);
        });

        it('selectors work before the module is added', () => {
            expect(selectUndoCount({})).toBe(0);
            expect(selectCanUndo({})).toBe(false);
            expect(selectCanRedo({})).toBe(false);
            expect(selectHistoryValues({})).toEqual([]);
        });
    });
});
