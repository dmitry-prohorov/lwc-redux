import { cleanup, flush, mount } from 'test-utils';

const renderUndoCounter = async () => {
    const app = mount('c-redux-examples', 'c/reduxExamples');
    await flush();
    const counter = app.shadowRoot.querySelector('c-example-undo-counter');
    return (id) => counter.shadowRoot.querySelector(`[data-id="${id}"]`);
};

const click = async (...buttons) => {
    buttons.forEach((button) => button.click());
    await flush();
};

describe('c-example-undo-counter', () => {
    afterEach(cleanup);

    it('starts without history', async () => {
        const $ = await renderUndoCounter();
        expect($('count').textContent).toBe('0');
        expect($('undo').disabled).toBe(true);
        expect($('redo').disabled).toBe(true);
        expect($('history').textContent).toBe('History: ');
    });

    it('undoes and redoes changes', async () => {
        const $ = await renderUndoCounter();
        await click($('increment'), $('increment'), $('decrement'));
        expect($('count').textContent).toBe('1');
        expect($('history').textContent).toBe('History: 0 → 1 → 2');

        await click($('undo'));
        expect($('count').textContent).toBe('2');
        expect($('redo').disabled).toBe(false);

        await click($('redo'));
        expect($('count').textContent).toBe('1');
        expect($('redo').disabled).toBe(true);
    });

    it('clears the history', async () => {
        const $ = await renderUndoCounter();
        await click($('increment'));
        expect($('undo').disabled).toBe(false);

        await click($('clear'));

        expect($('undo').disabled).toBe(true);
        expect($('count').textContent).toBe('1');
    });
});
