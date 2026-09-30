import { createStore } from 'c/reduxDynamicModulesCore';
import { getSagaExtension } from 'c/reduxDynamicModulesSagaExtension';
import { effects } from 'c/reduxSaga';
import { sagaEquals } from '../comparer';
import { getSagaManager } from '../manager';

const counter = (state = 0, action) => (action.type === 'inc' ? state + 1 : state);

describe('reduxDynamicModulesSagaExtension (legacy)', () => {
    describe('sagaEquals', () => {
        function* a() {}
        function* b() {}

        it.each([
            [a, a, true],
            [a, b, false],
            [a, { saga: a }, true],
            [{ saga: a }, a, true],
            [a, { saga: a, argument: 1 }, false],
            [{ saga: a, argument: 1 }, { saga: a, argument: 1 }, true],
            [{ saga: a, argument: 1 }, { saga: a, argument: 2 }, false],
            [a, undefined, false],
            [undefined, undefined, true]
        ])('%#', (left, right, expected) => {
            expect(sagaEquals(left, right)).toBe(expected);
        });
    });

    describe('getSagaManager', () => {
        it('runs sagas once, with arguments, and cancels them', () => {
            const tasks = [];
            const middleware = {
                run: jest.fn((...args) => {
                    const task = { args, cancel: jest.fn() };
                    tasks.push(task);
                    return task;
                })
            };
            function* saga() {}
            const registration = { saga, argument: 'arg' };
            const manager = getSagaManager(middleware);

            manager.add([saga, saga, registration, null]);
            expect(middleware.run).toHaveBeenCalledTimes(2);
            expect(middleware.run).toHaveBeenLastCalledWith(saga, 'arg');
            expect(manager.getItems()).toEqual([saga, registration]);

            manager.remove([saga]);
            expect(tasks[0].cancel).toHaveBeenCalled();

            manager.dispose();
            expect(tasks[1].cancel).toHaveBeenCalled();

            expect(() => manager.add(undefined)).not.toThrow();
            expect(() => manager.remove(undefined)).not.toThrow();
        });
    });

    describe('getSagaExtension', () => {
        it('runs module sagas with the legacy store and cancels them on removal', () => {
            const context = {};
            const worker = jest.fn();
            function* saga() {
                yield effects.takeEvery('ping', worker);
            }
            const store = createStore({ extensions: [getSagaExtension(context)] });
            const { remove } = store.addModules([{ id: 'saga', reducerMap: { counter }, sagas: [saga] }]);

            store.dispatch({ type: 'ping' });
            remove();
            store.dispatch({ type: 'ping' });

            expect(worker).toHaveBeenCalledTimes(1);
            expect(context.moduleManager.addModules).toBe(store.addModules);
            store.dispose();
        });

        it('ignores modules without sagas', () => {
            const store = createStore({ extensions: [getSagaExtension()] });
            expect(() => store.addModules([{ id: 'plain', reducerMap: { counter } }]).remove()).not.toThrow();
        });
    });
});
