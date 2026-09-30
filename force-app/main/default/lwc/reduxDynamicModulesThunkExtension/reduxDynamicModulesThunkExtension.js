// copied from https://github.com/microsoft/redux-dynamic-modules
import { thunk } from 'c/reduxThunk';

export function getThunkExtension() {
    return {
        middleware: thunk
    };
}
