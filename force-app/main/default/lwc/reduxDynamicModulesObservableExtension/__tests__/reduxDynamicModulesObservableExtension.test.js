import { createStore } from 'c/reduxDynamicModulesCore';
import { getObservableExtension } from 'c/reduxDynamicModulesObservableExtension';
import { ofType } from 'c/reduxObservable';
import { operators } from 'c/rxjs';
import { getEpicManager } from '../manager';

const { map } = operators;

const pongs = (state = 0, action) => (action.type === 'PONG' ? state + 1 : state);
const pingEpic = (action$) =>
    action$.pipe(
        ofType('PING'),
        map(() => ({ type: 'PONG' }))
    );

describe('reduxDynamicModulesObservableExtension (legacy)', () => {
    it('runs module epics and stops them when the last module is removed', () => {
        const store = createStore({ extensions: [getObservableExtension()] }, { id: 'keeper', reducerMap: { pongs } });
        const first = store.addModules([{ id: 'ping', epics: [pingEpic] }]);
        const second = store.addModules([{ id: 'ping2', epics: [pingEpic] }]);

        store.dispatch({ type: 'PING' });
        expect(store.getState().pongs).toBe(1);

        first.remove();
        store.dispatch({ type: 'PING' });
        expect(store.getState().pongs).toBe(2);

        second.remove();
        store.dispatch({ type: 'PING' });
        expect(store.getState().pongs).toBe(2);

        expect(() => store.dispose()).not.toThrow();
    });

    it('ignores modules without epics', () => {
        const store = createStore({ extensions: [getObservableExtension()] });
        expect(() => store.addModules([{ id: 'plain', reducerMap: { pongs } }]).remove()).not.toThrow();
    });

    it('runs each epic only once in the middleware', () => {
        const epicMiddleware = { run: jest.fn() };
        const manager = getEpicManager(epicMiddleware);

        manager.add([pingEpic]);
        manager.add([pingEpic]);
        manager.add();
        manager.remove();

        expect(epicMiddleware.run).toHaveBeenCalledTimes(1);
        const wrapper = epicMiddleware.run.mock.calls[0][0];
        expect(wrapper.epicRef()).toBe(pingEpic);
    });
});
