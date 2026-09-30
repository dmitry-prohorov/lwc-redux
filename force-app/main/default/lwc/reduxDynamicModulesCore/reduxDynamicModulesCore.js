// copied from https://github.com/microsoft/redux-dynamic-modules
// Commits on Mar 25, 2020
import { applyMiddleware, createStore as createReduxStore, compose } from 'c/redux';
import { getRefCountedManager } from './ref-counted';
import { getMiddlewareManager } from './middleware';
import { getModuleManager } from './module';

export function createStore(moduleStoreSettings, ...initialModules) {
    const {
        initialState = {},
        extensions = [],
        enhancers = [],
        advancedComposeEnhancers = compose,
        advancedCombineReducers
    } = moduleStoreSettings;

    const extensionMiddleware = extensions.reduce((mw, p) => {
        if (p.middleware) {
            // extensions may provide a single middleware (redux-eggs format) or an array of them
            mw.push(...[].concat(p.middleware));
        }

        return mw;
    }, []);

    const middlewareManager = getRefCountedManager(getMiddlewareManager(), (a, b) => a === b);

    const enhancer = advancedComposeEnhancers(
        ...enhancers,
        applyMiddleware(...extensionMiddleware, middlewareManager.enhancer)
    );

    const moduleManager = getRefCountedManager(
        getModuleManager(middlewareManager, extensions, advancedCombineReducers),
        (a, b) => a.id === b.id,
        (a) => a.retained
    );

    // Create store
    const store = createReduxStore(moduleManager.getReducer, initialState, enhancer);

    moduleManager.setDispatch(store.dispatch);

    const addModules = (modulesToBeAdded) => {
        const flattenedModules = modulesToBeAdded ? modulesToBeAdded.flat() : undefined;
        moduleManager.add(flattenedModules);
        return {
            remove: () => {
                moduleManager.remove(flattenedModules);
            }
        };
    };

    const addModule = (moduleToBeAdded) => {
        return addModules([moduleToBeAdded]);
    };

    extensions.forEach((p) => {
        if (p.onModuleManagerCreated) {
            p.onModuleManagerCreated({
                addModule,
                addModules
            });
        }
    });

    store.addModule = addModule;
    store.addModules = addModules;

    store.dispose = () => {
        // get all added modules and remove them
        moduleManager.dispose();
        middlewareManager.dispose();
        extensions.forEach((p) => {
            if (p.dispose) {
                p.dispose();
            }
        });
    };

    store.addModules(initialModules);

    return store;
}

export * from './comparable';
export * from './middlewares';
export * from './refcounter';
export * from './ref-counted';
export * from './reducer';
