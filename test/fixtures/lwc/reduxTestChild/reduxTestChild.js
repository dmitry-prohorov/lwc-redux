import { LightningElement, api } from 'lwc';
import { ReduxMixin } from 'c/reduxMixin';

/**
 * Test double for a connected component: connects with whatever the test passes in
 * and exposes the props assigned by the provider.
 */
export default class ReduxTestChild extends ReduxMixin(LightningElement) {
    @api mapStateToProps;
    @api mapDispatchToProps;
    @api modules;
    @api skipConnect = false;

    connectedCallback() {
        if (!this.skipConnect) {
            this[ReduxMixin.Connect](this.mapStateToProps, this.mapDispatchToProps, { modules: this.modules });
        }
    }

    @api getProp(name) {
        return this[name];
    }

    @api callProp(name, ...args) {
        return this[name](...args);
    }

    @api getSymbolProp(name) {
        return this[ReduxMixin[name]];
    }

    @api addModules(modules) {
        return this[ReduxMixin.AddModules](modules);
    }
}
