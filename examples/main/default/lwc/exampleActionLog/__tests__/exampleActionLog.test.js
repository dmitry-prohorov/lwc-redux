import { createElement } from 'lwc';
import ExampleActionLog from 'c/exampleActionLog';

describe('c-example-action-log', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders the entries and the state', () => {
        const element = createElement('c-example-action-log', { is: ExampleActionLog });
        element.entries = [
            { id: 2, type: 'counter/increment', payload: '' },
            { id: 1, type: 'todos/add', payload: '"Write docs"' }
        ];
        element.state = '{ "counter": 1 }';
        document.body.appendChild(element);

        const items = element.shadowRoot.querySelectorAll('[data-entry]');
        expect(items).toHaveLength(2);
        expect(items[0].textContent).toContain('counter/increment');
        expect(items[1].textContent).toContain('"Write docs"');
        expect(element.shadowRoot.querySelector('[data-id="state"]').textContent).toBe('{ "counter": 1 }');
    });

    it('renders no list without entries', () => {
        const element = createElement('c-example-action-log', { is: ExampleActionLog });
        element.entries = undefined;
        document.body.appendChild(element);

        expect(element.shadowRoot.querySelector('ol')).toBeNull();
    });
});
