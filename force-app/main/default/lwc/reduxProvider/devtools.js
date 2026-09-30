const JUMP_ACTIONS = ['JUMP_TO_ACTION', 'JUMP_TO_STATE'];

// Monitor messages sent back from Redux DevTools (time travel) look like
// { type: 'DISPATCH', payload: { type: 'JUMP_TO_ACTION' }, state: '...' }
export const isDevtoolsJumpAction = (action) =>
    !!action && action.type === 'DISPATCH' && !!action.payload && JUMP_ACTIONS.includes(action.payload.type);

const devtoolsMiddleware = (context) => (store) => (next) => (action) => {
    const provider = context();
    const result = next(action);
    // do not echo time travel messages back to devtools, otherwise they appear as new actions in the log
    if (!isDevtoolsJumpAction(action)) {
        provider.dispatchAction({ action, state: store.getState() });
    }
    return result;
};

/**
 * https://github.com/reduxjs/redux-devtools/blob/main/docs/Integrations/Remote.md#5-listening-for-monitor-events
 * TODO: chech if we really need createStore inside this enhancer
 */
export const devtoolsEnhancer = (createStore) => (reducer, initialState, enhancer) => {
    const devtoolsReducer = (state, action) => {
        if (isDevtoolsJumpAction(action)) {
            return (typeof action.state === 'string' && JSON.parse(action.state)) || action.state;
        }
        return reducer(state, action);
    };

    return createStore(devtoolsReducer, initialState, enhancer);
};

export const getDevtoolsExtension = (context) => ({
    middleware: devtoolsMiddleware(context),
    enhancer: devtoolsEnhancer
});
