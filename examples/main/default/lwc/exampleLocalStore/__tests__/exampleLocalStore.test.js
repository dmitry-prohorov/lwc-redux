import { cleanup, flush, mount } from 'test-utils';

describe('c-example-local-store', () => {
    afterEach(cleanup);

    it('renders two local-store providers', () => {
        const element = mount('c-example-local-store', 'c/exampleLocalStore');
        const providers = element.shadowRoot.querySelectorAll('c-redux-provider');

        expect(providers).toHaveLength(2);
        providers.forEach((provider) => expect(provider.localStore).toBe(true));
    });

    it('keeps the counters independent', async () => {
        const element = mount('c-example-local-store', 'c/exampleLocalStore');
        const [left, right] = element.shadowRoot.querySelectorAll('c-example-counter');
        const count = (counter) => counter.shadowRoot.querySelector('[data-id="count"]').textContent;

        left.shadowRoot.querySelector('[data-id="increment"]').click();
        left.shadowRoot.querySelector('[data-id="increment"]').click();
        right.shadowRoot.querySelector('[data-id="decrement"]').click();
        await flush();

        expect(left.label).toBe('Local store A');
        expect(right.label).toBe('Local store B');
        expect(count(left)).toBe('2');
        expect(count(right)).toBe('-1');
        const [leftProvider, rightProvider] = element.shadowRoot.querySelectorAll('c-redux-provider');
        expect(leftProvider.getLocalStore()).not.toBe(rightProvider.getLocalStore());
    });
});
