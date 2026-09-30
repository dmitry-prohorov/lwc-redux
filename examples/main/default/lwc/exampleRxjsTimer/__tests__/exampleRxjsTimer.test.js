import { advance, change, cleanup, flush, mount } from 'test-utils';

const renderTimer = async () => {
    const app = mount('c-redux-examples', 'c/reduxExamples');
    await flush();
    const timer = app.shadowRoot.querySelector('c-example-rxjs-timer');
    return { app, $: (id) => timer.shadowRoot.querySelector(`[data-id="${id}"]`) };
};

describe('c-example-rxjs-timer', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
        cleanup();
        jest.useRealTimers();
    });

    it('renders the idle timer', async () => {
        const { $ } = await renderTimer();
        expect($('remaining').textContent).toBe('10');
        expect($('status').textContent).toBe('Status: idle');
        expect($('progress').value).toBe(0);
        expect($('start').label).toBe('Start');
        expect($('pause').disabled).toBe(true);
    });

    it('counts down while running', async () => {
        const { $ } = await renderTimer();
        $('start').click();
        await advance(3000);

        expect($('remaining').textContent).toBe('7');
        expect($('progress').value).toBe(30);
        expect($('start').disabled).toBe(true);
        expect($('duration').disabled).toBe(true);
    });

    it('pauses, resumes and resets', async () => {
        const { $ } = await renderTimer();
        $('start').click();
        await advance(2000);
        $('pause').click();
        await advance(3000);
        expect($('remaining').textContent).toBe('8');
        expect($('start').label).toBe('Resume');

        $('start').click();
        await advance(1000);
        expect($('remaining').textContent).toBe('7');

        $('reset').click();
        await flush();
        expect($('remaining').textContent).toBe('10');
        expect($('status').textContent).toBe('Status: idle');
    });

    it('finishes and shows a toast through the container', async () => {
        const { app, $ } = await renderTimer();
        const onToast = jest.fn();
        app.addEventListener('lightning__showtoast', onToast);

        change($('duration'), '2');
        await flush();
        $('start').click();
        await advance(3000);

        expect($('status').textContent).toBe('Status: finished');
        expect(onToast).toHaveBeenCalledTimes(1);
        expect(onToast.mock.calls[0][0].detail).toEqual({
            title: "Time's up!",
            message: '2 seconds passed',
            variant: 'success'
        });
    });
});
