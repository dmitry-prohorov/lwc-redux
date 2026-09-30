import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { ReduxMixin } from 'c/reduxMixin';
import { todosModule, toastBus } from 'c/examplesStore';

const MAX_LOG_ENTRIES = 25;

const stringify = (value) => {
    try {
        return JSON.stringify(value, null, 2);
    } catch (e) {
        return String(value);
    }
};

export default class ReduxExamples extends ReduxMixin(LightningElement) {
    /** Hide the in-app action log fed by use-devtools */
    @api hideActionLog = false;

    // Modules passed to the provider live as long as the provider does
    modules = [todosModule];

    entries = [];
    state = '';
    _nextEntryId = 0;

    connectedCallback() {
        // The only subscriber of the toast bus: sagas and epics call toastBus.send('showToast', toast),
        // which calls this.showToast(toast). The subscription is closed by ReduxMixin on disconnect.
        this[ReduxMixin.Subscribe](toastBus);
    }

    showToast({ title, message, variant = 'info' }) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    get showActionLog() {
        return !this.hideActionLog;
    }

    // Fired once when the store is created
    handleConnect(event) {
        this.state = stringify(event.detail.state);
    }

    // Fired after every dispatched action when the provider has `use-devtools`
    handleAction(event) {
        if (this.hideActionLog) {
            return;
        }
        const { action, state } = event.detail;
        const payload = action.payload === undefined ? '' : stringify(action.payload);
        this.entries = [{ id: ++this._nextEntryId, type: action.type, payload }, ...this.entries].slice(
            0,
            MAX_LOG_ENTRIES
        );
        this.state = stringify(state);
    }
}
