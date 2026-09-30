import { clone } from '../clone';

class Point {
    constructor(x) {
        this.x = x;
    }
}

describe('clone', () => {
    it.each([1, 'text', true, null, undefined, 10n])('returns primitive %p as is', (value) => {
        expect(clone(value)).toBe(value);
    });

    it('returns functions as is', () => {
        const fn = () => 1;
        expect(clone(fn)).toBe(fn);
    });

    it('deep copies objects and arrays', () => {
        const value = { list: [1, { nested: true }], inner: { a: 1 } };
        const copy = clone(value);

        expect(copy).toEqual(value);
        expect(copy).not.toBe(value);
        expect(copy.list).not.toBe(value.list);
        expect(copy.list[1]).not.toBe(value.list[1]);
        expect(copy.inner).not.toBe(value.inner);
    });

    it('keeps sparse array length', () => {
        const copy = clone(new Array(3));
        expect(copy).toHaveLength(3);
    });

    it('keeps the prototype of objects', () => {
        const copy = clone(new Point(2));
        expect(copy).toBeInstanceOf(Point);
        expect(copy.x).toBe(2);

        const bare = Object.create(null);
        bare.a = 1;
        expect(Object.getPrototypeOf(clone(bare))).toBeNull();
    });

    it('copies only own enumerable keys', () => {
        const value = Object.create({ inherited: true });
        value.own = 1;
        Object.defineProperty(value, 'hidden', { value: 2, enumerable: false });

        expect(Object.keys(clone(value))).toEqual(['own']);
        expect(clone(value).hidden).toBeUndefined();
    });

    it('copies dates, regular expressions and typed arrays', () => {
        const date = new Date(1000);
        const regexp = /a+b/gi;
        const typed = new Uint8Array([1, 2, 3]);

        const copy = clone({ date, regexp, typed });

        expect(copy.date).toEqual(date);
        expect(copy.date).not.toBe(date);
        expect(copy.regexp.source).toBe('a+b');
        expect(copy.regexp.flags).toBe('gi');
        expect(copy.regexp).not.toBe(regexp);
        expect(copy.typed).toEqual(typed);
        expect(copy.typed).not.toBe(typed);
    });

    it('shares Map, Set and other objects', () => {
        const map = new Map();
        const set = new Set();
        const copy = clone({ map, set });

        expect(copy.map).toBe(map);
        expect(copy.set).toBe(set);
    });

    it('preserves circular and repeated references', () => {
        const shared = { value: 1 };
        const value = { a: shared, b: shared };
        value.self = value;

        const copy = clone(value);

        expect(copy.self).toBe(copy);
        expect(copy.a).toBe(copy.b);
        expect(copy.a).not.toBe(shared);
    });

    it('uses the clone method of the value', () => {
        const value = { clone: () => 'custom copy' };
        expect(clone(value)).toBe('custom copy');
    });

    it('works with frozen state from Redux Toolkit', () => {
        const frozen = Object.freeze({ list: Object.freeze([Object.freeze({ id: 1 })]) });
        const copy = clone(frozen);

        copy.list.push({ id: 2 });
        expect(copy.list).toHaveLength(2);
        expect(Object.isFrozen(copy)).toBe(false);
    });
});
