import { LightningElement, api } from 'lwc';

export default class ExampleActionLog extends LightningElement {
    /** @type {{ id: number, type: string, payload: string }[]} */
    @api entries = [];
    /** Latest store state, already serialized */
    @api state = '';

    get hasEntries() {
        return this.entries && this.entries.length > 0;
    }
}
