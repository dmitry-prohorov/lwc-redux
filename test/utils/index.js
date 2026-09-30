import * as lwc from 'lwc';

/**
 * <c-redux-provider> keeps the root store in module scope. Loading components through this helper gives
 * every test a fresh module registry (and so a fresh root store) while sharing the single LWC engine.
 */
export const loadIsolated = (moduleName, extraModules = []) => {
    let loaded;
    let extras;
    jest.isolateModules(() => {
        jest.doMock('lwc', () => lwc);
        loaded = require(moduleName);
        extras = extraModules.map((name) => require(name));
    });
    return extraModules.length ? [loaded, ...extras] : loaded;
};

/**
 * Creates and attaches a component loaded in a fresh registry.
 * Modules listed in `extraModules` are loaded in the same registry and returned in `mountWith`,
 * e.g. to reach the exact store or event bus instance used by the component.
 */
export const mountWith = (tagName, moduleName, props = {}, extraModules = []) => {
    const [{ default: Ctor }, ...extras] = loadIsolated(moduleName, extraModules.concat('lwc')).slice(0, -1);
    const element = lwc.createElement(tagName, { is: Ctor });
    Object.assign(element, props);
    document.body.appendChild(element);
    return { element, modules: extras };
};

export const mount = (tagName, moduleName, props = {}) => mountWith(tagName, moduleName, props).element;

export const cleanup = () => {
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
};

/** Lets LWC re-render and pending promises settle */
export const flush = async () => {
    for (let i = 0; i < 5; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
};

/** Advances fake timers (fake API latency, saga delays) and lets the results render */
export const advance = async (ms) => {
    await jest.advanceTimersByTimeAsync(ms);
    await flush();
};

export const change = (element, value) => {
    element.dispatchEvent(new CustomEvent('change', { detail: { value, checked: value } }));
};
