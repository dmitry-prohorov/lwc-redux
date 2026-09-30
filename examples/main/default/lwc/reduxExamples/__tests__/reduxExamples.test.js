import { advance, change, cleanup, flush, mount, mountWith } from 'test-utils';

const render = (props) => mount('c-redux-examples', 'c/reduxExamples', props);
const query = (element, selector) => element.shadowRoot.querySelector(selector);

describe('c-redux-examples', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
        cleanup();
        jest.useRealTimers();
    });

    it('renders every example inside one root provider with thunk, saga, observable and devtools', () => {
        const element = render();
        const provider = query(element, 'c-redux-provider');

        expect(provider.useThunk).toBe(true);
        expect(provider.useSaga).toBe(true);
        expect(provider.useObservable).toBe(true);
        expect(provider.useDevtools).toBe(true);
        [
            'c-example-counter',
            'c-example-todo-list',
            'c-example-saga-search',
            'c-example-rxjs-timer',
            'c-example-undo-counter',
            'c-example-local-store'
        ].forEach((tag) => expect(query(element, tag)).not.toBeNull());
    });

    it('registers the todos module on the provider', () => {
        const element = render();
        const [todosModule] = query(element, 'c-redux-provider').modules;
        expect(todosModule.id).toBe('examples-todos');
    });

    it('shows the initial state from reduxprovider__connect', async () => {
        const element = render();
        await flush();
        const log = query(element, 'c-example-action-log');

        expect(JSON.parse(log.state)).toEqual({});
    });

    it('logs actions reported by use-devtools, newest first', async () => {
        const element = render();
        await flush();
        const counter = query(element, 'c-example-counter');
        counter.shadowRoot.querySelector('[data-id="increment"]').click();
        await flush();

        const log = query(element, 'c-example-action-log');
        expect(log.entries[0]).toEqual({ id: expect.any(Number), type: 'counter/increment', payload: '' });
        expect(JSON.parse(log.state).counter).toEqual({ value: 1, step: 1 });
    });

    it('serializes payloads and keeps at most 25 entries', async () => {
        const element = render();
        await flush();
        const provider = query(element, 'c-redux-provider');
        for (let i = 0; i < 30; i++) {
            provider.dispatch({ type: 'test/action', payload: { i } });
        }
        await flush();

        const { entries } = query(element, 'c-example-action-log');
        expect(entries).toHaveLength(25);
        expect(JSON.parse(entries[0].payload)).toEqual({ i: 29 });
    });

    it('loads the todos through the provider module', async () => {
        const element = render();
        await advance(1000);

        const log = query(element, 'c-example-action-log');
        expect(JSON.parse(log.state).todos.ids).toEqual(['t1', 't2', 't3']);
    });

    it('shows toasts sent by the search saga through the event bus', async () => {
        const element = render();
        const onToast = jest.fn();
        element.addEventListener('lightning__showtoast', onToast);
        await flush();
        const search = query(element, 'c-example-saga-search');

        change(search.shadowRoot.querySelector('[data-id="query"]'), 'grace');
        await advance(700);

        expect(onToast).toHaveBeenCalledTimes(1);
        expect(onToast.mock.calls[0][0].detail).toEqual({
            title: 'Search finished',
            message: 'Found 1 contact(s) for "grace"',
            variant: 'success'
        });
    });

    it('receives toasts from the bus until it disconnects', () => {
        const {
            element,
            modules: [{ toastBus }]
        } = mountWith('c-redux-examples', 'c/reduxExamples', {}, ['c/examplesStore']);
        const onToast = jest.fn();
        element.addEventListener('lightning__showtoast', onToast);

        toastBus.send('showToast', { title: 'Hello' });
        expect(onToast).toHaveBeenCalledTimes(1);
        expect(onToast.mock.calls[0][0].detail).toEqual({ title: 'Hello', message: undefined, variant: 'info' });

        cleanup();
        toastBus.send('showToast', { title: 'Too late' });
        expect(onToast).toHaveBeenCalledTimes(1);
    });

    it('hides the action log with hide-action-log', async () => {
        const element = render({ hideActionLog: true });
        await flush();
        query(element, 'c-redux-provider').dispatch({ type: 'test/action' });
        await flush();

        expect(query(element, 'c-example-action-log')).toBeNull();
    });
});
