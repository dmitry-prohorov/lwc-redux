import { advance, change, cleanup, flush, mount } from 'test-utils';

const renderSearch = async () => {
    const app = mount('c-redux-examples', 'c/reduxExamples');
    await flush();
    const search = app.shadowRoot.querySelector('c-example-saga-search');
    const root = search.shadowRoot;
    return {
        input: root.querySelector('[data-id="query"]'),
        results: () => [...root.querySelectorAll('[data-result]')].map((item) => item.textContent)
    };
};

describe('c-example-saga-search', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
        cleanup();
        jest.useRealTimers();
    });

    it('searches after the debounce and shows the results', async () => {
        const { input, results } = await renderSearch();

        change(input, 'ma');
        await flush();
        expect(input.value).toBe('ma');
        expect(results()).toEqual([]);

        await advance(300);
        expect(input.isLoading).toBe(true);

        await advance(400);
        expect(input.isLoading).toBe(false);
        expect(results()).toEqual(['Margaret Hamilton']);
    });

    it('only searches for the latest query', async () => {
        const { input, results } = await renderSearch();

        change(input, 'a');
        await advance(100);
        change(input, 'gr');
        await advance(700);

        expect(results()).toEqual(['Grace Hopper']);
    });

    it('clears the results when the query is emptied', async () => {
        const { input, results } = await renderSearch();
        change(input, 'ada');
        await advance(700);
        expect(results()).toEqual(['Ada Lovelace']);

        change(input, '');
        await advance(300);

        expect(results()).toEqual([]);
    });
});
