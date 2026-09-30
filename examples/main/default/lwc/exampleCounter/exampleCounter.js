import { LightningElement, api } from 'lwc';
import { ReduxMixin } from 'c/reduxMixin';
import { counterActions, counterModule, selectCount, selectStep } from 'c/examplesStore';

// state -> component fields. Called on every store update.
const mapStateToProps = (state) => ({
    count: selectCount(state),
    step: selectStep(state)
});

// An object of action creators is bound to dispatch and assigned to the component:
// this.increment() dispatches counterActions.increment()
const mapDispatchToProps = {
    increment: counterActions.increment,
    decrement: counterActions.decrement,
    setStep: counterActions.setStep,
    reset: counterActions.reset
};

export default class ExampleCounter extends ReduxMixin(LightningElement) {
    @api label = 'Counter';

    count = 0;
    step = 1;

    connectedCallback() {
        // `modules` are registered in the nearest store when the component connects
        // and removed again when the last component using them disconnects.
        this[ReduxMixin.Connect](mapStateToProps, mapDispatchToProps, { modules: [counterModule] });
    }

    handleIncrement() {
        this.increment();
    }

    handleDecrement() {
        this.decrement();
    }

    handleReset() {
        this.reset();
    }

    handleStepChange(event) {
        this.setStep(event.detail.value);
    }
}
