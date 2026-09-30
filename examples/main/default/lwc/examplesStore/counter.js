import { createSlice } from 'c/reduxToolkit';

const initialState = { value: 0, step: 1 };

// A factory so the same logic can be mounted under different keys (see undo.js)
export const createCounterSlice = (name) =>
    createSlice({
        name,
        initialState,
        reducers: {
            increment(state) {
                state.value += state.step;
            },
            decrement(state) {
                state.value -= state.step;
            },
            setStep(state, { payload }) {
                state.step = Number(payload) || 1;
            },
            reset() {
                return initialState;
            }
        }
    });

export const counterSlice = createCounterSlice('counter');
export const counterActions = counterSlice.actions;

export const selectCounter = (state) => state.counter || initialState;
export const selectCount = (state) => selectCounter(state).value;
export const selectStep = (state) => selectCounter(state).step;

// A redux-eggs module. It is added when the first component that needs it connects
// and removed when the last one disconnects.
export const counterModule = {
    id: 'examples-counter',
    reducersMap: { counter: counterSlice.reducer }
};
