import { createStore, getObservableExtension } from 'c/reduxEggs';
import {
    SHOW_TOAST,
    TICK_MS,
    TIMER_STATUS,
    selectDuration,
    selectRemaining,
    selectTimerStatus,
    timerActions,
    timerModule,
    toastBus
} from 'c/examplesStore';

const createTimerStore = () => {
    const store = createStore({ extensions: [getObservableExtension()] });
    const remove = store.addEggs([timerModule]);
    return { store, remove, state: () => store.getState() };
};

describe('timer (redux-observable)', () => {
    let send;

    beforeEach(() => {
        jest.useFakeTimers();
        send = jest.spyOn(toastBus, 'send').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe('reducer', () => {
        it('sets the duration and ignores invalid values', () => {
            const { store, state } = createTimerStore();
            store.dispatch(timerActions.setDuration('3'));
            expect(selectDuration(state())).toBe(3);
            expect(selectRemaining(state())).toBe(3);

            store.dispatch(timerActions.setDuration('abc'));
            expect(selectDuration(state())).toBe(1);
            store.dispatch(timerActions.setDuration(-5));
            expect(selectDuration(state())).toBe(1);
        });

        it('does not change the duration while running', () => {
            const { store, state } = createTimerStore();
            store.dispatch(timerActions.start());
            store.dispatch(timerActions.setDuration(99));
            expect(selectDuration(state())).toBe(10);
        });

        it('pauses only a running timer', () => {
            const { store, state } = createTimerStore();
            store.dispatch(timerActions.pause());
            expect(selectTimerStatus(state())).toBe(TIMER_STATUS.IDLE);
        });

        it('selectors work before the module is added', () => {
            expect(selectDuration({})).toBe(10);
            expect(selectRemaining({})).toBe(10);
            expect(selectTimerStatus({})).toBe(TIMER_STATUS.IDLE);
        });
    });

    describe('epics', () => {
        it('ticks every second while running', () => {
            const { store, state } = createTimerStore();
            store.dispatch(timerActions.start());
            expect(selectTimerStatus(state())).toBe(TIMER_STATUS.RUNNING);

            jest.advanceTimersByTime(3 * TICK_MS);

            expect(selectRemaining(state())).toBe(7);
        });

        it('stops ticking on pause and resumes on start', () => {
            const { store, state } = createTimerStore();
            store.dispatch(timerActions.start());
            jest.advanceTimersByTime(2 * TICK_MS);
            store.dispatch(timerActions.pause());
            jest.advanceTimersByTime(5 * TICK_MS);
            expect(selectRemaining(state())).toBe(8);
            expect(selectTimerStatus(state())).toBe(TIMER_STATUS.PAUSED);

            store.dispatch(timerActions.start());
            jest.advanceTimersByTime(TICK_MS);
            expect(selectRemaining(state())).toBe(7);
        });

        it('stops ticking on reset', () => {
            const { store, state } = createTimerStore();
            store.dispatch(timerActions.start());
            jest.advanceTimersByTime(2 * TICK_MS);
            store.dispatch(timerActions.reset());
            jest.advanceTimersByTime(5 * TICK_MS);

            expect(selectRemaining(state())).toBe(10);
            expect(selectTimerStatus(state())).toBe(TIMER_STATUS.IDLE);
        });

        it('finishes at zero and sends a toast through the event bus', () => {
            const { store, state } = createTimerStore();
            store.dispatch(timerActions.setDuration(2));
            store.dispatch(timerActions.start());
            jest.advanceTimersByTime(5 * TICK_MS);

            expect(selectRemaining(state())).toBe(0);
            expect(selectTimerStatus(state())).toBe(TIMER_STATUS.FINISHED);
            expect(send).toHaveBeenCalledTimes(1);
            expect(send).toHaveBeenCalledWith(SHOW_TOAST, {
                title: "Time's up!",
                message: '2 seconds passed',
                variant: 'success'
            });
        });

        it('restarts from the full duration after finishing', () => {
            const { store, state } = createTimerStore();
            store.dispatch(timerActions.setDuration(1));
            store.dispatch(timerActions.start());
            jest.advanceTimersByTime(TICK_MS);
            store.dispatch(timerActions.start());

            expect(selectRemaining(state())).toBe(1);
            expect(selectTimerStatus(state())).toBe(TIMER_STATUS.RUNNING);
        });

        it('stops the interval when the module is removed', () => {
            const { store, remove } = createTimerStore();
            const listener = jest.fn();
            store.dispatch(timerActions.start());
            remove();
            store.subscribe(listener);

            jest.advanceTimersByTime(5 * TICK_MS);

            expect(listener).not.toHaveBeenCalled();
        });
    });
});
