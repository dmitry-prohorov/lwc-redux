import { assignPayloadToState, createSlice, configureStore, safeAssigner } from 'c/reduxToolkit';

describe('reduxToolkit helpers', () => {
    describe('assignPayloadToState', () => {
        it('assigns only keys that exist in the state', () => {
            const state = { name: 'a', size: 1 };
            assignPayloadToState(state, { name: 'b', unknown: true });
            expect(state).toEqual({ name: 'b', size: 1 });
        });

        it('deep clones assigned values', () => {
            const state = { options: null };
            const options = { nested: { value: 1 } };
            assignPayloadToState(state, { options });

            expect(state.options).toEqual(options);
            expect(state.options).not.toBe(options);
            expect(state.options.nested).not.toBe(options.nested);
        });

        it('assigns undefined values by default', () => {
            const state = { name: 'a' };
            assignPayloadToState(state, { name: undefined });
            expect(state).toEqual({ name: undefined });
        });

        it('uses a custom assigner', () => {
            const state = { name: 'a' };
            const assigner = jest.fn((target, key, value) => {
                target[key] = `${value}!`;
            });
            assignPayloadToState(state, { name: 'b' }, assigner);

            expect(assigner).toHaveBeenCalledWith(state, 'name', 'b');
            expect(state.name).toBe('b!');
        });
    });

    describe('safeAssigner', () => {
        it('skips undefined values and clones the others', () => {
            const state = { name: 'a', list: [] };
            const list = [{ id: 1 }];
            assignPayloadToState(state, { name: undefined, list }, safeAssigner);

            expect(state.name).toBe('a');
            expect(state.list).toEqual(list);
            expect(state.list).not.toBe(list);
        });
    });

    it('works inside immer reducers', () => {
        const slice = createSlice({
            name: 'settings',
            initialState: { title: '', size: 10 },
            reducers: {
                update(state, { payload }) {
                    assignPayloadToState(state, payload, safeAssigner);
                }
            }
        });
        const store = configureStore({ reducer: slice.reducer });

        store.dispatch(slice.actions.update({ title: 'Hello', size: undefined, extra: 1 }));

        expect(store.getState()).toEqual({ title: 'Hello', size: 10 });
    });
});
