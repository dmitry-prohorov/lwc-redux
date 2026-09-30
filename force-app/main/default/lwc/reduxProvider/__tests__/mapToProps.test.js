import { REDUX_DISPATCH_NAME_PROP } from 'c/reduxConstants';
import { getDependsOnOwnProps, wrapMapToPropsConstant, wrapMapToPropsFunc } from '../wrapMapToProps';
import mapStateToPropsFactories, {
    whenMapStateToPropsIsFunction,
    whenMapStateToPropsIsMissing
} from '../mapStateToProps';
import mapDispatchToPropsFactories, {
    whenMapDispatchToPropsIsFunction,
    whenMapDispatchToPropsIsMissing,
    whenMapDispatchToPropsIsObject
} from '../mapDispatchToProps';
import { match } from '../utils';

describe('wrapMapToProps', () => {
    describe('wrapMapToPropsConstant', () => {
        it('computes the constant once and ignores own props', () => {
            const getConstant = jest.fn((dispatch) => ({ dispatch }));
            const dispatch = jest.fn();
            const selector = wrapMapToPropsConstant(getConstant)(dispatch);

            expect(selector.dependsOnOwnProps).toBe(false);
            expect(selector()).toEqual({ dispatch });
            expect(selector()).toBe(selector());
            expect(getConstant).toHaveBeenCalledTimes(1);
        });
    });

    describe('getDependsOnOwnProps', () => {
        it.each([
            ['one argument', (state) => state, false],
            ['two arguments', (state, props) => props, true],
            ['rest arguments', (...args) => args, true]
        ])('%s', (_, fn, expected) => {
            expect(getDependsOnOwnProps(fn)).toBe(expected);
        });

        it('respects an explicit dependsOnOwnProps flag', () => {
            const fn = (state) => state;
            fn.dependsOnOwnProps = true;
            expect(getDependsOnOwnProps(fn)).toBe(true);

            const other = (state, props) => props;
            other.dependsOnOwnProps = false;
            expect(getDependsOnOwnProps(other)).toBe(true);
        });
    });

    describe('wrapMapToPropsFunc', () => {
        it('passes own props only when the function declares them', () => {
            const withoutProps = jest.fn((state) => ({ state }));
            const withProps = jest.fn((state, props) => ({ state, props }));

            const proxyWithout = wrapMapToPropsFunc(withoutProps)();
            proxyWithout('s', 'p');
            proxyWithout('s2', 'p2');
            expect(withoutProps).toHaveBeenNthCalledWith(1, 's');
            expect(withoutProps).toHaveBeenNthCalledWith(2, 's2');

            const proxyWith = wrapMapToPropsFunc(withProps)();
            expect(proxyWith('s', 'p')).toEqual({ state: 's', props: 'p' });
        });

        it('treats a returned function as the real mapToProps (factory)', () => {
            const mapToProps = jest.fn((state) => ({ value: state.value }));
            const factory = jest.fn(() => mapToProps);
            const proxy = wrapMapToPropsFunc(factory)();

            expect(proxy({ value: 1 }, {})).toEqual({ value: 1 });
            expect(proxy({ value: 2 }, {})).toEqual({ value: 2 });
            expect(factory).toHaveBeenCalledTimes(1);
            expect(mapToProps).toHaveBeenCalledTimes(2);
        });
    });
});

describe('mapStateToProps factories', () => {
    it('wraps functions', () => {
        const init = whenMapStateToPropsIsFunction((state) => ({ a: state.a }));
        expect(init()({ a: 1 })).toEqual({ a: 1 });
    });

    it('maps nothing when missing', () => {
        expect(whenMapStateToPropsIsMissing(undefined)()()).toEqual({});
        expect(whenMapStateToPropsIsMissing(null)()()).toEqual({});
    });

    it('rejects other values', () => {
        expect(whenMapStateToPropsIsFunction({})).toBeUndefined();
        expect(whenMapStateToPropsIsMissing(() => ({}))).toBeUndefined();
        jest.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => match('invalid', mapStateToPropsFactories, 'mapStateToProps')()).toThrow(
            'Invalid value of type string for mapStateToProps'
        );
        jest.restoreAllMocks();
    });
});

describe('mapDispatchToProps factories', () => {
    const dispatch = jest.fn((action) => action);

    beforeEach(() => dispatch.mockClear());

    it('wraps functions', () => {
        const init = whenMapDispatchToPropsIsFunction((d) => ({ go: () => d({ type: 'go' }) }));
        init()(dispatch).go();
        expect(dispatch).toHaveBeenCalledWith({ type: 'go' });
    });

    it('exposes dispatch under a symbol when missing', () => {
        const props = whenMapDispatchToPropsIsMissing(undefined)(dispatch)();
        expect(props[REDUX_DISPATCH_NAME_PROP]).toBe(dispatch);
    });

    it('binds objects of action creators', () => {
        const props = whenMapDispatchToPropsIsObject({ add: (n) => ({ type: 'add', payload: n }), notAFunction: 1 })(
            dispatch
        )();

        expect(props.add(2)).toEqual({ type: 'add', payload: 2 });
        expect(dispatch).toHaveBeenCalledWith({ type: 'add', payload: 2 });
        expect(props.notAFunction).toBeUndefined();
    });

    it('selects the right factory for each form', () => {
        expect(
            match({ a: () => ({ type: 'a' }) }, mapDispatchToPropsFactories, 'mapDispatchToProps')(dispatch)()
        ).toHaveProperty('a');
        expect(
            match(undefined, mapDispatchToPropsFactories, 'mapDispatchToProps')(dispatch)()[REDUX_DISPATCH_NAME_PROP]
        ).toBe(dispatch);
        expect(whenMapDispatchToPropsIsObject(() => ({}))).toBeUndefined();
        expect(whenMapDispatchToPropsIsFunction({})).toBeUndefined();
        expect(whenMapDispatchToPropsIsMissing({})).toBeUndefined();
    });
});
