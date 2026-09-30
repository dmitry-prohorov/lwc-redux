const TYPED_ARRAYS = new Set([
    'Int8Array',
    'Uint8Array',
    'Uint8ClampedArray',
    'Int16Array',
    'Uint16Array',
    'Int32Array',
    'Uint32Array',
    'Float32Array',
    'Float64Array',
    'BigInt64Array',
    'BigUint64Array'
]);

const typeOf = (value) => Object.prototype.toString.call(value).slice(8, -1);

const cloneRegExp = (pattern) => new RegExp(pattern.source, pattern.flags);

const deepClone = (value, copies) => {
    if (value === null || typeof value !== 'object') {
        return value;
    }
    if (copies.has(value)) {
        return copies.get(value);
    }

    const type = typeOf(value);
    let copy;
    if (type === 'Array') {
        copy = new Array(value.length);
    } else if (type === 'Object') {
        copy = Object.create(Object.getPrototypeOf(value));
    } else if (type === 'Date') {
        return new Date(value.valueOf());
    } else if (type === 'RegExp') {
        return cloneRegExp(value);
    } else if (TYPED_ARRAYS.has(type)) {
        return value.slice();
    } else {
        // Map, Set, Promise, DOM nodes, ... are shared, not copied
        return value;
    }

    // register before copying the children so circular references point to the copy
    copies.set(value, copy);
    Object.keys(value).forEach((key) => {
        copy[key] = deepClone(value[key], copies);
    });
    return copy;
};

/**
 * Deep copy of a value:
 * - values with their own `clone()` method are cloned with it
 * - plain objects (prototype is kept), arrays, dates, regular expressions and typed arrays are copied
 * - circular and repeated references are preserved
 * - primitives, functions and other objects (Map, Set, ...) are returned as they are
 * @template T
 * @param {T} value
 * @returns {T}
 */
export const clone = (value) =>
    value != null && typeof value.clone === 'function' ? value.clone() : deepClone(value, new WeakMap());
