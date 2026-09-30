import { createSlice } from 'c/reduxToolkit';
import { combineEpics, ofType } from 'c/reduxObservable';
import { interval, operators } from 'c/rxjs';
import { sendToast } from './notifications';

const { filter, ignoreElements, map, switchMap, takeUntil, tap, withLatestFrom } = operators;

export const TICK_MS = 1000;
export const TIMER_STATUS = { IDLE: 'idle', RUNNING: 'running', PAUSED: 'paused', FINISHED: 'finished' };

const initialState = { duration: 10, remaining: 10, status: TIMER_STATUS.IDLE };

export const timerSlice = createSlice({
    name: 'timer',
    initialState,
    reducers: {
        setDuration(state, { payload }) {
            if (state.status === TIMER_STATUS.RUNNING) {
                return;
            }
            const duration = Math.max(1, Math.round(Number(payload)) || 1);
            state.duration = duration;
            state.remaining = duration;
            state.status = TIMER_STATUS.IDLE;
        },
        start(state) {
            if (state.remaining === 0) {
                state.remaining = state.duration;
            }
            state.status = TIMER_STATUS.RUNNING;
        },
        pause(state) {
            if (state.status === TIMER_STATUS.RUNNING) {
                state.status = TIMER_STATUS.PAUSED;
            }
        },
        reset(state) {
            state.remaining = state.duration;
            state.status = TIMER_STATUS.IDLE;
        },
        tick(state) {
            state.remaining = Math.max(0, state.remaining - 1);
        },
        finished(state) {
            state.status = TIMER_STATUS.FINISHED;
        }
    }
});

export const timerActions = timerSlice.actions;

const selectTimer = (state) => state.timer || initialState;
export const selectDuration = (state) => selectTimer(state).duration;
export const selectRemaining = (state) => selectTimer(state).remaining;
export const selectTimerStatus = (state) => selectTimer(state).status;

// start -> a tick every second until the timer is paused, reset or finished.
// switchMap restarts the interval when start is dispatched again.
export const tickEpic = (action$) =>
    action$.pipe(
        ofType(timerActions.start.type),
        switchMap(() =>
            interval(TICK_MS).pipe(
                map(() => timerActions.tick()),
                takeUntil(
                    action$.pipe(ofType(timerActions.pause.type, timerActions.reset.type, timerActions.finished.type))
                )
            )
        )
    );

// reads the state after every tick and finishes the timer at zero
export const finishEpic = (action$, state$) =>
    action$.pipe(
        ofType(timerActions.tick.type),
        withLatestFrom(state$),
        filter(([, state]) => selectRemaining(state) === 0),
        map(() => timerActions.finished())
    );

// side effect only: notify the UI through the event bus, emit no actions
export const notifyEpic = (action$, state$) =>
    action$.pipe(
        ofType(timerActions.finished.type),
        withLatestFrom(state$),
        tap(([, state]) =>
            sendToast({ title: "Time's up!", message: `${selectDuration(state)} seconds passed`, variant: 'success' })
        ),
        ignoreElements()
    );

export const timerEpic = combineEpics(tickEpic, finishEpic, notifyEpic);

// Epics listed in a module start when the module is added and stop when it is removed,
// so the interval never outlives the component. Requires <c-redux-provider use-observable>.
export const timerModule = {
    id: 'examples-timer',
    reducersMap: { timer: timerSlice.reducer },
    epics: [timerEpic]
};
