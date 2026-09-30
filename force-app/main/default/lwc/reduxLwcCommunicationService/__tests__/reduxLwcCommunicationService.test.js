import { ReduxLwcCommunicationService } from 'c/reduxLwcCommunicationService';

describe('ReduxLwcCommunicationService', () => {
    it('emits { fn, args } messages to every subscriber', () => {
        const service = new ReduxLwcCommunicationService();
        const first = jest.fn();
        const second = jest.fn();
        service.getStream().subscribe(first);
        service.getStream().subscribe(second);

        service.send('open', 1, 'two');

        expect(first).toHaveBeenCalledWith({ fn: 'open', args: [1, 'two'] });
        expect(second).toHaveBeenCalledWith({ fn: 'open', args: [1, 'two'] });
    });

    it('does not replay messages sent before subscribing', () => {
        const service = new ReduxLwcCommunicationService();
        service.send('early');
        const listener = jest.fn();
        service.getStream().subscribe(listener);

        expect(listener).not.toHaveBeenCalled();
    });

    it('exposes a read-only stream', () => {
        const stream = new ReduxLwcCommunicationService().getStream();
        expect(stream.next).toBeUndefined();
    });

    it('clear() closes the underlying subject', () => {
        const service = new ReduxLwcCommunicationService();
        service.getStream().subscribe(jest.fn());

        service.clear();

        expect(() => service.send('late')).toThrow();
    });
});
