import { createElement, LightningElement } from 'lwc';
import { ReduxMixin } from 'c/reduxMixin';
import {
    REGISTER_REDUX_COMPONENT_EVENT,
    REDUX_ADD_MODULE_NAME_PROP,
    REDUX_COMPONENT_NAME_PROP,
    REDUX_DISPATCH_NAME_PROP,
    REDUX_REMOVE_MODULE_NAME_PROP,
    REDUX_UNSUBSCRIBE_NAME_PROP
} from 'c/reduxConstants';
import { ReduxLwcCommunicationService } from 'c/reduxLwcCommunicationService';

const mapStateToProps = (state) => state;
const mapDispatchToProps = {};
const modules = [{ id: 'a' }];

class ConnectedComponent extends ReduxMixin(LightningElement) {
    connectedCallback() {
        this[ReduxMixin.Connect](mapStateToProps, mapDispatchToProps, { modules });
    }
    greet(name, punctuation) {
        this.greeting = `hello ${name}${punctuation}`;
    }
}

class PlainComponent extends ReduxMixin(LightningElement) {
    connectedCallback() {
        this[ReduxMixin.Connect]();
    }
}

/** Mounts a component and returns it together with its instance, captured from the register event */
const mount = (Ctor = ConnectedComponent, tagName = 'x-connected') => {
    const element = createElement(tagName, { is: Ctor });
    const register = jest.fn((event) => event.detail);
    element.addEventListener(REGISTER_REDUX_COMPONENT_EVENT, register);
    document.body.appendChild(element);
    const event = register.mock.calls[0][0];
    return { element, event, instance: event.detail.context() };
};

describe('ReduxMixin', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('exposes the symbols used to talk to the provider', () => {
        expect(ReduxMixin.Name).toBe(REDUX_COMPONENT_NAME_PROP);
        expect(ReduxMixin.Dispatch).toBe(REDUX_DISPATCH_NAME_PROP);
        expect(ReduxMixin.AddModules).toBe(REDUX_ADD_MODULE_NAME_PROP);
        ['Connect', 'Disconnect', 'Subscribe', 'Unsubscribe'].forEach((key) => {
            expect(typeof ReduxMixin[key]).toBe('symbol');
        });
    });

    it('Connect fires a composed, bubbling register event with the mapping functions', () => {
        const { event, instance } = mount();

        expect(event.type).toBe(REGISTER_REDUX_COMPONENT_EVENT);
        expect(event.bubbles).toBe(true);
        expect(event.composed).toBe(true);
        expect(event.cancelable).toBe(true);
        expect(event.detail).toEqual({ mapStateToProps, mapDispatchToProps, modules, context: expect.any(Function) });
        expect(instance).toBeInstanceOf(ConnectedComponent);
    });

    it('Connect works without arguments', () => {
        const { event } = mount(PlainComponent, 'x-plain');
        expect(event.detail).toEqual({
            mapStateToProps: undefined,
            mapDispatchToProps: undefined,
            modules: undefined,
            context: expect.any(Function)
        });
    });

    it('stores the component name', () => {
        const { instance } = mount();
        expect(instance[ReduxMixin.Name]).toBe('ConnectedComponent');
    });

    it('unsubscribes from the store and removes its modules on disconnect', () => {
        const { element, instance } = mount();
        const unsubscribe = jest.fn();
        const removeModules = jest.fn();
        instance[REDUX_UNSUBSCRIBE_NAME_PROP] = unsubscribe;
        instance[REDUX_REMOVE_MODULE_NAME_PROP] = removeModules;

        document.body.removeChild(element);

        expect(unsubscribe).toHaveBeenCalledTimes(1);
        expect(removeModules).toHaveBeenCalledTimes(1);
    });

    it('disconnects safely when it was never connected to a provider', () => {
        const { element } = mount();
        expect(() => document.body.removeChild(element)).not.toThrow();
    });

    describe('communication service', () => {
        it('calls component methods sent through the service', () => {
            const { instance } = mount();
            const service = new ReduxLwcCommunicationService();

            instance[ReduxMixin.Subscribe](service);
            service.send('greet', 'world', '!');

            expect(instance.greeting).toBe('hello world!');
        });

        it('ignores unknown methods and empty messages', () => {
            const { instance } = mount();
            const service = new ReduxLwcCommunicationService();
            instance[ReduxMixin.Subscribe](service);

            expect(() => service.send('doesNotExist', 1)).not.toThrow();
            expect(() => service.send(undefined)).not.toThrow();
        });

        it('stops listening after Unsubscribe', () => {
            const { instance } = mount();
            const service = new ReduxLwcCommunicationService();
            instance[ReduxMixin.Subscribe](service);

            instance[ReduxMixin.Unsubscribe]();
            service.send('greet', 'again', '?');

            expect(instance.greeting).toBeUndefined();
        });

        it('stops listening on disconnect', () => {
            const { element, instance } = mount();
            const service = new ReduxLwcCommunicationService();
            instance[ReduxMixin.Subscribe](service);

            document.body.removeChild(element);
            service.send('greet', 'ghost', '.');

            expect(instance.greeting).toBeUndefined();
        });

        it('ignores services without a subscribable stream', () => {
            const { instance } = mount();

            expect(() => instance[ReduxMixin.Subscribe]({ getStream: () => undefined })).not.toThrow();
            expect(() => instance[ReduxMixin.Unsubscribe]()).not.toThrow();
        });
    });
});
