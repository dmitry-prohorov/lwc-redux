import { LightningElement } from 'lwc';
import { ReduxMixin } from 'c/reduxMixin';
import {
    TIMER_STATUS,
    selectDuration,
    selectRemaining,
    selectTimerStatus,
    timerActions,
    timerModule
} from 'c/examplesStore';

const mapStateToProps = (state) => ({
    duration: selectDuration(state),
    remaining: selectRemaining(state),
    status: selectTimerStatus(state)
});

const mapDispatchToProps = {
    setDuration: timerActions.setDuration,
    start: timerActions.start,
    pause: timerActions.pause,
    reset: timerActions.reset
};

export default class ExampleRxjsTimer extends ReduxMixin(LightningElement) {
    duration = 10;
    remaining = 10;
    status = TIMER_STATUS.IDLE;

    connectedCallback() {
        // timerModule declares epics: they run while this component is connected
        this[ReduxMixin.Connect](mapStateToProps, mapDispatchToProps, { modules: [timerModule] });
    }

    get isRunning() {
        return this.status === TIMER_STATUS.RUNNING;
    }

    get isNotRunning() {
        return !this.isRunning;
    }

    get progress() {
        return Math.round(((this.duration - this.remaining) / this.duration) * 100);
    }

    get startLabel() {
        return this.status === TIMER_STATUS.PAUSED ? 'Resume' : 'Start';
    }

    handleDurationChange(event) {
        this.setDuration(event.detail.value);
    }

    handleStart() {
        this.start();
    }

    handlePause() {
        this.pause();
    }

    handleReset() {
        this.reset();
    }
}
