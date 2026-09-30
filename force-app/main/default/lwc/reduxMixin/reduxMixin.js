import {
    REGISTER_REDUX_COMPONENT_EVENT,
    REDUX_COMPONENT_NAME_PROP,
    REDUX_DISPATCH_NAME_PROP,
    REDUX_UNSUBSCRIBE_NAME_PROP,
    REDUX_REMOVE_MODULE_NAME_PROP,
    REDUX_ADD_MODULE_NAME_PROP
} from 'c/reduxConstants';

const connect = Symbol('connecttoredux');
const disconnect = Symbol('disconnectfromredux');
const subscribe = Symbol('communicationconnect');
const unsubscribe = Symbol('communicationdisconnect');
const subscription = Symbol('communicationsubscription');
const ReduxMixin = (base) =>
    class extends base {
        [REDUX_COMPONENT_NAME_PROP] = this.constructor.name;
        [connect](mapStateToProps, mapDispatchToProps, { modules } = {}) {
            this.dispatchEvent(
                new CustomEvent(REGISTER_REDUX_COMPONENT_EVENT, {
                    detail: {
                        mapStateToProps,
                        mapDispatchToProps,
                        modules,
                        context: () => this
                    },
                    bubbles: true,
                    composed: true,
                    cancelable: true
                })
            );
        }
        [disconnect]() {
            this[unsubscribe]();
            if (this[REDUX_UNSUBSCRIBE_NAME_PROP]) {
                this[REDUX_UNSUBSCRIBE_NAME_PROP]();
            }
            if (this[REDUX_REMOVE_MODULE_NAME_PROP]) {
                this[REDUX_REMOVE_MODULE_NAME_PROP]();
            }
        }
        [subscribe](bus$) {
            const stream$ = bus$.getStream();
            if (stream$ && typeof stream$.subscribe === 'function') {
                this[subscription] = stream$.subscribe(({ fn, args }) => fn && this[fn] && this[fn](...args));
            }
        }
        [unsubscribe]() {
            this[subscription] && this[subscription].unsubscribe();
        }

        disconnectedCallback() {
            this[disconnect]();
        }
    };
ReduxMixin.Connect = connect;
ReduxMixin.Name = REDUX_COMPONENT_NAME_PROP;
ReduxMixin.Dispatch = REDUX_DISPATCH_NAME_PROP;
ReduxMixin.Disconnect = disconnect;
ReduxMixin.Subscribe = subscribe;
ReduxMixin.Unsubscribe = unsubscribe;
ReduxMixin.AddModules = REDUX_ADD_MODULE_NAME_PROP;

export { ReduxMixin };
