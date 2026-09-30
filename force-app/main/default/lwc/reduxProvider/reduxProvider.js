import { LightningElement, api } from 'lwc';
import REDUX_LOGGER from '@salesforce/label/c.REDUX_LOGGER';
import {
    REGISTER_REDUX_COMPONENT_EVENT,
    REDUX_COMPONENT_NAME_PROP,
    REDUX_UNSUBSCRIBE_NAME_PROP,
    REDUX_REMOVE_MODULE_NAME_PROP,
    REDUX_ADD_MODULE_NAME_PROP
} from 'c/reduxConstants';

import mapDispatchToPropsFactories from './mapDispatchToProps';
import mapStateToPropsFactories from './mapStateToProps';
import { match } from './utils';
import { getLoggerExtension } from 'c/reduxDynamicModulesLoggerExtension';
import { getThunkExtension } from 'c/reduxDynamicModulesThunkExtension';
import { getDevtoolsExtension } from './devtools';
import { createInitialStateCombiner } from './initialState';
import { getSagaExtension, getObservableExtension, createStore } from 'c/reduxEggs';

const LOGGER_ENABLED = REDUX_LOGGER === 'true';

let uid = 0;
let _store = {};
export default class ReduxProvider extends LightningElement {
    @api useThunk = false;
    @api useSaga = false;
    @api useObservable = false;
    @api useDevtools = false;
    @api useLogger = false;
    @api disableCleanupOnDisconnect = false;
    @api localStore = false;

    @api
    get modules() {
        return this._modules;
    }
    set modules(input) {
        this._modules = input;
        this.connected && this._addModules();
    }
    @api initialState;

    @api dispatch(action) {
        const { dispatch } = _store[this._getStoreName()] || {};
        dispatch && dispatch(action);
    }

    @api addModules(modules) {
        const { addEggs } = _store[this._getStoreName()] || {};

        if (addEggs) {
            return addEggs(modules);
        }

        return () => null;
    }
    @api getLocalStore() {
        return _store[this.uniqueName];
    }

    uniqueName = `redux_provider_${++uid}`;

    connectedCallback() {
        this.connected = true;
        this.template.addEventListener(REGISTER_REDUX_COMPONENT_EVENT, this.handleEvent);
        this._initializeScripts();
    }

    disconnectedCallback() {
        this.connected = false;
        this.dispatchEvent(
            new CustomEvent('reduxprovider__disconnect', { composed: true, bubbles: true, cancelable: true })
        );
        this.template.removeEventListener(REGISTER_REDUX_COMPONENT_EVENT, this.handleEvent);
        !this.disableCleanupOnDisconnect && this._cleanup();
    }

    handleEvent = (evt) => {
        switch (evt.type) {
            case REGISTER_REDUX_COMPONENT_EVENT:
                evt.stopPropagation();
                this._connect(evt.detail);
                break;
            default:
                break;
        }
    };

    dispatchAction(detail) {
        this.dispatchEvent(
            new CustomEvent('reduxprovider__action', {
                detail,
                composed: true,
                bubbles: true,
                cancelable: true
            })
        );
    }

    _initializeScripts() {
        this._addModules();
        this.dispatchEvent(new CustomEvent('load', { cancelable: true }));
    }

    _createStore(initialModules) {
        const { useThunk, useSaga, useObservable, initialState = {}, useDevtools } = this;
        const enhancers = [];
        const extensions = [
            useThunk && getThunkExtension(),
            LOGGER_ENABLED && getLoggerExtension(),
            useSaga && getSagaExtension(),
            useObservable && getObservableExtension(),
            useDevtools && getDevtoolsExtension(() => this)
        ].filter((e) => e);

        const store = createStore({
            reducerCombiner: createInitialStateCombiner(initialState),
            extensions,
            enhancers
        });
        store.addEggs(initialModules);
        _store[this._getStoreName()] = store;

        this.dispatchEvent(
            new CustomEvent('reduxprovider__connect', {
                detail: { state: _store[this._getStoreName()].getState() },
                composed: true,
                bubbles: true,
                cancelable: true
            })
        );
    }

    _addModules() {
        const { modules = [] } = this;
        const initialModules = modules.map((mdl) => {
            if (typeof mdl === 'function') {
                return mdl();
            }
            return mdl;
        });

        if (!_store[this._getStoreName()]) {
            this._createStore(initialModules);
        } else {
            this._removeEggs = _store[this._getStoreName()].addEggs(initialModules);
        }
    }

    _cleanup() {
        if (this._removeEggs) {
            this._removeEggs();
            this._removeEggs = undefined;
        }
    }

    _connect({ mapStateToProps, mapDispatchToProps, context, modules }) {
        const { getState, subscribe, dispatch, addEggs } = _store[this._getStoreName()];

        const component = typeof context === 'function' ? context() : context;

        component[REDUX_ADD_MODULE_NAME_PROP] = addEggs;

        if (modules) {
            const removeModules = addEggs(modules);
            component[REDUX_REMOVE_MODULE_NAME_PROP] = removeModules;
        }

        const initMapStateToProps = match(
            mapStateToProps,
            mapStateToPropsFactories,
            'mapStateToProps',
            component[REDUX_COMPONENT_NAME_PROP]
        )();
        const initMapDispatchToProps = match(
            mapDispatchToProps,
            mapDispatchToPropsFactories,
            'mapDispatchToProps',
            component[REDUX_COMPONENT_NAME_PROP]
        )(dispatch);

        if (mapStateToProps) {
            const handleStateChanges = () => {
                if (!this._componentExist(component)) return;
                try {
                    const state = getState();
                    const attributeMap = initMapStateToProps(state, component);
                    Object.entries(attributeMap).forEach(([key, value]) => (component[key] = value));
                } catch (e) {
                    // exception catcher to handle internal issues in selectors
                    console.error(e);
                    // propagate exception to prevent code execution
                    throw e;
                }
            };

            handleStateChanges();
            component[REDUX_UNSUBSCRIBE_NAME_PROP] = subscribe(handleStateChanges);
        }

        const attributeDispatchMap = initMapDispatchToProps(dispatch, component);
        Reflect.ownKeys(attributeDispatchMap).forEach((key) => (component[key] = attributeDispatchMap[key]));
    }

    _componentExist(component) {
        const computedStyle = window.getComputedStyle(component.template.host);
        return computedStyle.display;
    }

    _getStoreName() {
        return this.localStore ? this.uniqueName : 'ROOT';
    }
}
