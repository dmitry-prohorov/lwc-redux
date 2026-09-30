import { createInitialStateCombiner } from '../initialState';

const counter = (state = 0, action) => (action.type === 'inc' ? state + 1 : state);
const label = (state = 'default') => state;

describe('createInitialStateCombiner', () => {
    it('seeds a key from the initial state the first time its reducer is added', () => {
        const combiner = createInitialStateCombiner({ counter: 5, label: 'preloaded' });

        let state = combiner({ counter })(undefined, { type: '@@INIT' });
        expect(state).toEqual({ counter: 5 });

        state = combiner({ counter, label })(state, { type: 'inc' });
        expect(state).toEqual({ counter: 6, label: 'preloaded' });
    });

    it('uses the initial value only once, so a re-added module starts from its default', () => {
        const combiner = createInitialStateCombiner({ counter: 5 });
        combiner({ counter })(undefined, { type: '@@INIT' });

        expect(combiner({ counter })({}, { type: '@@INIT' })).toEqual({ counter: 0 });
    });

    it('does not override existing state', () => {
        const combiner = createInitialStateCombiner({ counter: 5 });
        expect(combiner({ counter })({ counter: 1 }, { type: '@@INIT' })).toEqual({ counter: 1 });
    });

    it('works without an initial state and with a custom combiner', () => {
        const customCombiner = jest.fn((reducers) => (state = {}, action) => ({
            ...state,
            seen: action.type,
            keys: Object.keys(reducers)
        }));
        const reducer = createInitialStateCombiner(undefined, customCombiner)({ counter });

        expect(reducer(undefined, { type: 'x' })).toEqual({ seen: 'x', keys: ['counter'] });
    });
});
