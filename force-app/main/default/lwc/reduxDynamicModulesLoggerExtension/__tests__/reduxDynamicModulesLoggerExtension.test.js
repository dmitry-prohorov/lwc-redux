import { getLoggerExtension } from 'c/reduxDynamicModulesLoggerExtension';

describe('getLoggerExtension', () => {
    let consoleSpies;

    beforeEach(() => {
        consoleSpies = ['group', 'groupEnd', 'log', 'info', 'error'].reduce((spies, method) => {
            spies[method] = jest.spyOn(console, method).mockImplementation(() => {});
            return spies;
        }, {});
    });

    afterEach(() => jest.restoreAllMocks());

    it('provides a single middleware (redux-eggs format)', () => {
        expect(typeof getLoggerExtension().middleware).toBe('function');
    });

    it('logs the previous state, the action and the next state', () => {
        const states = [{ count: 0 }, { count: 1 }];
        const store = { getState: jest.fn(() => states.shift()) };
        const next = jest.fn(() => 'result');
        const action = { type: 'counter/increment' };

        const result = getLoggerExtension().middleware(store)(next)(action);

        expect(result).toBe('result');
        expect(next).toHaveBeenCalledWith(action);
        expect(consoleSpies.group).toHaveBeenCalledWith('%ccounter/increment', 'font-style: italic; ');
        expect(consoleSpies.log).toHaveBeenCalledWith('%c prev state', 'color:green', { count: 0 });
        expect(consoleSpies.info).toHaveBeenCalledWith('dispatching', action);
        expect(consoleSpies.log).toHaveBeenCalledWith('%c next state', 'color:green', { count: 1 });
        expect(consoleSpies.groupEnd).toHaveBeenCalled();
    });

    it('logs actions ending with FAIL as errors', () => {
        const action = { type: 'load/FAIL' };
        getLoggerExtension().middleware({ getState: () => ({}) })(jest.fn())(action);

        expect(consoleSpies.group).toHaveBeenCalledWith('%cload/FAIL', 'font-style: italic; color: red');
        expect(consoleSpies.error).toHaveBeenCalledWith('dispatching', action);
        expect(consoleSpies.info).not.toHaveBeenCalled();
    });
});
