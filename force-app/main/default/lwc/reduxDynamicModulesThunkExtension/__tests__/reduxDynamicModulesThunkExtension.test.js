import { getThunkExtension } from 'c/reduxDynamicModulesThunkExtension';
import { thunk } from 'c/reduxThunk';

describe('getThunkExtension', () => {
    it('provides the thunk middleware', () => {
        expect(getThunkExtension()).toEqual({ middleware: thunk });
    });

    it('runs functions with dispatch and getState and passes plain actions on', () => {
        const store = { dispatch: jest.fn(), getState: jest.fn(() => 'state') };
        const next = jest.fn();
        const invoke = getThunkExtension().middleware(store)(next);

        expect(invoke((dispatch, getState) => getState())).toBe('state');
        invoke({ type: 'plain' });

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith({ type: 'plain' });
    });
});
