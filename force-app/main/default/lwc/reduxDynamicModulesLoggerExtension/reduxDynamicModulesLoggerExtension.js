const loggerMiddleware = (store) => (next) => (action) => {
    /* eslint-disable no-console*/
    const isError = action.type.endsWith('FAIL');
    const groupStyle = `font-style: italic; ${isError ? 'color: red' : ''}`;

    console.group(`%c${action.type}`, groupStyle);
    console.log('%c prev state', 'color:green', store.getState());
    if (isError) {
        console.error('dispatching', action);
    } else {
        console.info('dispatching', action);
    }
    const result = next(action);
    console.log('%c next state', 'color:green', store.getState());
    console.groupEnd();
    /* eslint-enable no-console */
    return result;
};

export function getLoggerExtension() {
    return {
        middleware: loggerMiddleware
    };
}