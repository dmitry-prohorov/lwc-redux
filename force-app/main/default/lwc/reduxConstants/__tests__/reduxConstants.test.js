import * as constants from 'c/reduxConstants';

describe('reduxConstants', () => {
    it('uses a DOM friendly event name', () => {
        expect(constants.REGISTER_REDUX_COMPONENT_EVENT).toBe('registercomponent');
    });

    it('uses unique symbols for component properties', () => {
        const symbols = [
            constants.REDUX_COMPONENT_NAME_PROP,
            constants.REDUX_DISPATCH_NAME_PROP,
            constants.REDUX_UNSUBSCRIBE_NAME_PROP,
            constants.REDUX_REMOVE_MODULE_NAME_PROP,
            constants.REDUX_ADD_MODULE_NAME_PROP
        ];
        symbols.forEach((symbol) => expect(typeof symbol).toBe('symbol'));
        expect(new Set(symbols).size).toBe(symbols.length);
    });

    it('exports shared empty values', () => {
        expect(constants.EMPTY_ARRAY).toEqual([]);
        expect(constants.EMPTY_OBJECT).toEqual({});
    });
});
