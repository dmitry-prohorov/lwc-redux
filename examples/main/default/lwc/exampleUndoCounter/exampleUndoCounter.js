import { LightningElement } from 'lwc';
import { ReduxMixin } from 'c/reduxMixin';
import {
    selectCanRedo,
    selectCanUndo,
    selectHistoryValues,
    selectUndoCount,
    undoCounterActions,
    undoCounterModule
} from 'c/examplesStore';

const mapStateToProps = (state) => ({
    count: selectUndoCount(state),
    canUndo: selectCanUndo(state),
    canRedo: selectCanRedo(state),
    history: selectHistoryValues(state).join(' → ')
});

const mapDispatchToProps = {
    increment: undoCounterActions.increment,
    decrement: undoCounterActions.decrement,
    undo: undoCounterActions.undo,
    redo: undoCounterActions.redo,
    clearHistory: undoCounterActions.clearHistory
};

export default class ExampleUndoCounter extends ReduxMixin(LightningElement) {
    count = 0;
    canUndo = false;
    canRedo = false;
    history = '';

    connectedCallback() {
        this[ReduxMixin.Connect](mapStateToProps, mapDispatchToProps, { modules: [undoCounterModule] });
    }

    get undoDisabled() {
        return !this.canUndo;
    }

    get redoDisabled() {
        return !this.canRedo;
    }

    handleIncrement() {
        this.increment();
    }

    handleDecrement() {
        this.decrement();
    }

    handleUndo() {
        this.undo();
    }

    handleRedo() {
        this.redo();
    }

    handleClear() {
        this.clearHistory();
    }
}
