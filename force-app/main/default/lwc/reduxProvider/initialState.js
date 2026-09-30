import { combineReducers } from 'c/reduxToolkit';

/**
 * redux-eggs creates the store before any module reducer is registered and its root reducer
 * returns an empty state while there are no reducers, so a preloaded state would be dropped.
 * This combiner seeds every state key from `initialState` the first time a module provides
 * a reducer for it, whether the module is added with the store or later.
 */
export const createInitialStateCombiner = (initialState, reducerCombiner = combineReducers) => {
    const pending = { ...initialState };

    return (reducers) => {
        const combinedReducer = reducerCombiner(reducers);

        return (state, action) => {
            const keysToSeed = Object.keys(reducers).filter(
                (key) => key in pending && (state === undefined || state[key] === undefined)
            );
            if (keysToSeed.length) {
                state = { ...state };
                keysToSeed.forEach((key) => {
                    state[key] = pending[key];
                    delete pending[key];
                });
            }
            return combinedReducer(state, action);
        };
    };
};
