import { createStore } from 'c/redux';
import { devtoolsEnhancer, getDevtoolsExtension, isDevtoolsJumpAction } from '../devtools';

const reducer = (state = { count: 0 }, action) => (action.type === 'inc' ? { count: state.count + 1 } : state);

describe('devtools', () => {
    describe('isDevtoolsJumpAction', () => {
        it.each([
            [{ type: 'DISPATCH', payload: { type: 'JUMP_TO_ACTION' } }, true],
            [{ type: 'DISPATCH', payload: { type: 'JUMP_TO_STATE' } }, true],
            [{ type: 'DISPATCH', payload: { type: 'COMMIT' } }, false],
            [{ type: 'DISPATCH' }, false],
            [{ type: 'JUMP_TO_ACTION' }, false],
            [undefined, false]
        ])('%j -> %s', (action, expected) => {
            expect(isDevtoolsJumpAction(action)).toBe(expected);
        });
    });

    describe('devtoolsEnhancer', () => {
        it('replaces the state with a serialized state on jump', () => {
            const store = createStore(reducer, devtoolsEnhancer);
            store.dispatch({ type: 'DISPATCH', payload: { type: 'JUMP_TO_ACTION' }, state: '{"count":10}' });
            expect(store.getState()).toEqual({ count: 10 });
        });

        it('replaces the state with an object state on jump', () => {
            const store = createStore(reducer, devtoolsEnhancer);
            store.dispatch({ type: 'DISPATCH', payload: { type: 'JUMP_TO_STATE' }, state: { count: 3 } });
            expect(store.getState()).toEqual({ count: 3 });
        });

        it('delegates other actions to the reducer', () => {
            const store = createStore(reducer, { count: 1 }, devtoolsEnhancer);
            store.dispatch({ type: 'inc' });
            store.dispatch({ type: 'DISPATCH', payload: { type: 'COMMIT' } });
            expect(store.getState()).toEqual({ count: 2 });
        });
    });

    describe('getDevtoolsExtension', () => {
        it('reports every action with the next state to the provider', () => {
            const provider = { dispatchAction: jest.fn() };
            const { middleware, enhancer } = getDevtoolsExtension(() => provider);
            const store = { getState: () => ({ count: 1 }) };
            const next = jest.fn(() => 'result');

            expect(enhancer).toBe(devtoolsEnhancer);
            expect(middleware(store)(next)({ type: 'inc' })).toBe('result');
            expect(next).toHaveBeenCalledWith({ type: 'inc' });
            expect(provider.dispatchAction).toHaveBeenCalledWith({ action: { type: 'inc' }, state: { count: 1 } });
        });

        it('does not report jump actions back to devtools', () => {
            const provider = { dispatchAction: jest.fn() };
            const { middleware } = getDevtoolsExtension(() => provider);

            middleware({ getState: () => ({}) })(jest.fn())({ type: 'DISPATCH', payload: { type: 'JUMP_TO_STATE' } });

            expect(provider.dispatchAction).not.toHaveBeenCalled();
        });
    });
});
