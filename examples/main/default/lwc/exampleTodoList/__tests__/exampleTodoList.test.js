import { advance, change, cleanup, flush, mount } from 'test-utils';

const LATENCY = 400;

const renderTodos = async () => {
    const app = mount('c-redux-examples', 'c/reduxExamples');
    await flush();
    const todoList = app.shadowRoot.querySelector('c-example-todo-list');
    const root = todoList.shadowRoot;
    return {
        root,
        $: (id) => root.querySelector(`[data-id="${id}"]`),
        todos: () => [...root.querySelectorAll('[data-todo] lightning-input')].map((input) => input.label)
    };
};

describe('c-example-todo-list', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
        cleanup();
        jest.useRealTimers();
    });

    it('shows a spinner while loading, then the todos', async () => {
        const { root, todos, $ } = await renderTodos();
        expect(root.querySelector('lightning-spinner')).not.toBeNull();

        await advance(LATENCY);

        expect(root.querySelector('lightning-spinner')).toBeNull();
        expect(todos()).toEqual([
            'Install lwc-redux',
            'Wrap the app in <c-redux-provider>',
            'Connect a component with ReduxMixin'
        ]);
        expect($('stats').textContent).toBe('1 active, 2 completed');
    });

    it('adds a todo and clears the input', async () => {
        const { todos, $ } = await renderTodos();
        await advance(LATENCY);

        change($('title'), 'Write tests');
        $('add').click();
        await advance(LATENCY);

        expect(todos()).toContain('Write tests');
        expect($('title').value).toBe('');
        expect($('stats').textContent).toBe('2 active, 2 completed');
    });

    it('shows an error for an empty title', async () => {
        const { $ } = await renderTodos();
        await advance(LATENCY);

        $('add').click();
        await advance(0);

        expect($('error').textContent).toBe('Title is required');
    });

    it('toggles and removes todos', async () => {
        const { root, todos, $ } = await renderTodos();
        await advance(LATENCY);

        root.querySelector('lightning-input[data-id="t3"]').dispatchEvent(new CustomEvent('change'));
        await flush();
        expect($('stats').textContent).toBe('0 active, 3 completed');

        root.querySelector('lightning-button-icon[data-id="t1"]').click();
        await flush();
        expect(todos()).not.toContain('Install lwc-redux');
    });

    it('filters todos', async () => {
        const { todos, $ } = await renderTodos();
        await advance(LATENCY);

        change($('filter'), 'active');
        await flush();
        expect(todos()).toEqual(['Connect a component with ReduxMixin']);
        expect($('filter').value).toBe('active');

        change($('filter'), 'completed');
        await flush();
        expect(todos()).toHaveLength(2);
    });

    it('reloads the todos', async () => {
        const { root, todos, $ } = await renderTodos();
        await advance(LATENCY);
        root.querySelector('lightning-button-icon[data-id="t1"]').click();
        await flush();

        $('reload').click();
        await advance(LATENCY);

        expect(todos()).toContain('Install lwc-redux');
    });
});
