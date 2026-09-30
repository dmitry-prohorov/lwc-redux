import { LightningElement } from 'lwc';

// Every <c-redux-provider local-store> owns a private store, so the two counters below
// register the same module but never share state with each other or with the root store.
export default class ExampleLocalStore extends LightningElement {}
