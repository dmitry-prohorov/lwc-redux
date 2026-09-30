import { effects } from 'c/reduxSaga';
import { SHOW_TOAST, sendToast, showToast, toastBus } from 'c/examplesStore';

describe('notifications', () => {
    it('sends toasts to subscribers of the bus', () => {
        const listener = jest.fn();
        const subscription = toastBus.getStream().subscribe(listener);
        const toast = { title: 'Hi', variant: 'info' };

        sendToast(toast);

        expect(listener).toHaveBeenCalledWith({ fn: SHOW_TOAST, args: [toast] });
        subscription.unsubscribe();
    });

    it('showToast is a declarative call effect', () => {
        const toast = { title: 'Hi' };
        expect(showToast(toast)).toEqual(effects.call(sendToast, toast));
    });
});
