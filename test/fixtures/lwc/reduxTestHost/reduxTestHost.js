import { LightningElement, api } from 'lwc';

/**
 * Renders <c-redux-provider> with a configurable set of connected children.
 * `children` is an array of { key, mapStateToProps, mapDispatchToProps, modules }.
 */
export default class ReduxTestHost extends LightningElement {
    @api localStore = false;
    @api useSaga = false;
    @api useThunk = false;
    @api useObservable = false;
    @api useDevtools = false;
    @api disableCleanupOnDisconnect = false;
    @api modules;
    @api initialState;
    @api children = [];

    @api getProvider() {
        return this.template.querySelector('c-redux-provider');
    }

    @api getChildren() {
        return [...this.template.querySelectorAll('c-redux-test-child')];
    }
}
