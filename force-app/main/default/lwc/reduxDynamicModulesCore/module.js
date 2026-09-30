// copied from https://github.com/microsoft/redux-dynamic-modules

import { getRefCountedReducerManager, getReducerManager } from './reducer';

export function getModuleManager(middlewareManager, extensions, advancedCombineReducers) {
    let _dispatch = null;
    let _reducerManager;
    let _modules = [];
    const _moduleIds = new Set();

    const _seedReducers = () => {
        _dispatch({ type: '@@Internal/ModuleManager/SeedReducers' });
    };

    const _dispatchActions = (actions) => {
        if (!actions) {
            return;
        }

        if (!_dispatch) {
            throw new Error('setDispatch should be called on ModuleManager before adding any modules.');
        }

        actions.forEach(_dispatch);
    };

    const _addMiddlewares = (middlewares) => {
        if (!middlewares) {
            return;
        }
        middlewareManager.add(middlewares);
    };

    const _removeMiddlewares = (middlewares) => {
        if (!middlewares) {
            return;
        }
        middlewareManager.remove(middlewares);
    };

    const _addReducers = (reducerMap) => {
        if (!reducerMap) {
            return;
        }
        if (!_reducerManager) {
            _reducerManager = getRefCountedReducerManager(
                // @ts-ignore
                getReducerManager(reducerMap, advancedCombineReducers)
            );
        } else {
            Object.keys(reducerMap).forEach((key) => _reducerManager.add(key, reducerMap[key]));
        }
    };

    const _removeReducers = (reducerMap) => {
        if (!reducerMap || !_reducerManager) {
            return;
        }
        Object.keys(reducerMap).forEach((key) => _reducerManager.remove(key, reducerMap[key]));
    };
    // Create reduce function which redirects to _reducers.reduce
    const _reduce = (s, a) => {
        if (_reducerManager) {
            return _reducerManager.reduce(s, a);
        }
        return s || null;
    };

    const moduleManager = {
        getReducer: _reduce,
        setDispatch: (dispatch) => {
            _dispatch = dispatch;
        },
        getItems: () => [], //We are not keeping a copy of added modules, for now no one calls this so we are ok
        add: (modulesToAdd) => {
            if (!modulesToAdd || modulesToAdd.length === 0) {
                return;
            }
            modulesToAdd = modulesToAdd.filter((mdl) => mdl);
            const justAddedModules = [];
            modulesToAdd.forEach((mdl) => {
                if (!_moduleIds.has(mdl.id)) {
                    _moduleIds.add(mdl.id);
                    _modules.push(mdl);
                    _addReducers(mdl.reducerMap);

                    const middlewares = mdl.middlewares;
                    if (middlewares) {
                        _addMiddlewares(middlewares);
                    }
                    justAddedModules.push(mdl);
                }
            });

            /* Fire an action so that the newly added reducers can seed their initial state */
            _seedReducers();

            // add the sagas and dispatch actions at the end so all the reducers are registered
            justAddedModules.forEach((mdl) => {
                // Let the extensions know we added a module
                extensions.forEach((p) => {
                    if (p.onModuleAdded) {
                        p.onModuleAdded(mdl);
                    }
                });

                // Dispatch the initial actions
                const moduleAddedAction = {
                    type: '@@Internal/ModuleManager/ModuleAdded',
                    payload: mdl.id
                };
                _dispatchActions(mdl.initialActions ? [moduleAddedAction, ...mdl.initialActions] : [moduleAddedAction]);
            });
        },
        connect: (modules) => {
            if (!modules) {
                return;
            }

            modules.forEach((mdl) => mdl.connectActions && _dispatchActions(mdl.connectActions));
        },
        remove: (modulesToRemove) => {
            if (!modulesToRemove) {
                return;
            }
            modulesToRemove = modulesToRemove.filter((m) => m).reverse();
            modulesToRemove.forEach((mdl) => {
                if (_moduleIds.has(mdl.id)) {
                    _dispatchActions(mdl.finalActions);

                    _removeReducers(mdl.reducerMap);
                    _removeMiddlewares(mdl.middlewares);

                    // Let the extensions know we removed a module
                    extensions.forEach((p) => {
                        if (p.onModuleRemoved) {
                            p.onModuleRemoved(mdl);
                        }
                    });

                    _moduleIds.delete(mdl.id);
                    _modules = _modules.filter((m) => m.id !== mdl.id);

                    _dispatchActions([
                        {
                            type: '@@Internal/ModuleManager/ModuleRemoved',
                            payload: mdl.id
                        }
                    ]);
                }
            });
        },
        dispose: () => {
            moduleManager.remove(_modules);
        }
    };
    return moduleManager;
}
