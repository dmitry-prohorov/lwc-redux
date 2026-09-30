import { ReduxLwcCommunicationService } from 'c/reduxLwcCommunicationService';
import { effects } from 'c/reduxSaga';

const { call } = effects;

/**
 * Event bus from the store layer (sagas, epics) to components. Exactly one component should subscribe
 * (reduxExamples does: `this[ReduxMixin.Subscribe](toastBus)`), otherwise every subscriber shows the toast.
 */
export const toastBus = new ReduxLwcCommunicationService();

/** Name of the component method that receives toasts */
export const SHOW_TOAST = 'showToast';

/**
 * Sends plain, serializable toast data. The subscribed component turns it into a ShowToastEvent,
 * so the store layer never creates DOM events.
 * @param {{ title: string, message?: string, variant?: 'info' | 'success' | 'warning' | 'error' }} toast
 */
export const sendToast = (toast) => toastBus.send(SHOW_TOAST, toast);

/**
 * Saga effect version of sendToast: `yield showToast({...})`.
 * Being a `call` effect, it can be asserted in saga tests instead of running the side effect.
 */
export const showToast = (toast) => call(sendToast, toast);
