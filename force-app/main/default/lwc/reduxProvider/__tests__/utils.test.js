import { match } from '../utils';

describe('reduxProvider/utils match', () => {
    afterEach(() => jest.restoreAllMocks());

    it('returns the result of the last factory that accepts the argument', () => {
        const first = jest.fn(() => 'first');
        const last = jest.fn(() => 'last');

        expect(match('arg', [first, last], 'mapStateToProps')).toBe('last');
        expect(last).toHaveBeenCalledWith('arg');
        expect(first).not.toHaveBeenCalled();
    });

    it('falls back to earlier factories', () => {
        const first = jest.fn(() => 'first');
        const last = jest.fn(() => undefined);

        expect(match('arg', [first, last], 'mapStateToProps')).toBe('first');
    });

    it('returns a function that throws a descriptive error when no factory matches', () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        const init = match(42, [() => undefined], 'mapDispatchToProps', 'MyComponent');
        const message =
            'Invalid value of type number for mapDispatchToProps argument when connecting component MyComponent.';

        expect(init).toBeInstanceOf(Function);
        expect(() => init()).toThrow(message);
        expect(consoleError).toHaveBeenCalledWith(message);
    });
});
