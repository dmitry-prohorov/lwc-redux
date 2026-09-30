import { cleanup, flush, mount, change } from 'test-utils';

// exampleCounter needs a provider, reduxExamples renders it inside the root one
const renderCounter = async () => {
    const app = mount('c-redux-examples', 'c/reduxExamples');
    await flush();
    const counter = app.shadowRoot.querySelector('c-example-counter');
    const $ = (id) => counter.shadowRoot.querySelector(`[data-id="${id}"]`);
    return { app, counter, $ };
};

describe('c-example-counter', () => {
    afterEach(cleanup);

    it('renders the initial state', async () => {
        const { $ } = await renderCounter();
        expect($('count').textContent).toBe('0');
        expect($('step').value).toBe(1);
    });

    it('increments, decrements and resets', async () => {
        const { $ } = await renderCounter();

        $('increment').click();
        $('increment').click();
        $('decrement').click();
        await flush();
        expect($('count').textContent).toBe('1');

        $('reset').click();
        await flush();
        expect($('count').textContent).toBe('0');
    });

    it('uses the step for changes', async () => {
        const { $ } = await renderCounter();

        change($('step'), '10');
        await flush();
        $('increment').click();
        await flush();

        expect($('step').value).toBe(10);
        expect($('count').textContent).toBe('10');
    });

    it('shows the label', async () => {
        const { counter } = await renderCounter();
        expect(counter.shadowRoot.querySelector('.slds-text-title_caps').textContent).toBe('Counter');
    });
});
