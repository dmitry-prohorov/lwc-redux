import undoable, { ActionCreators, includeAction } from 'c/reduxUndo';
import { createCounterSlice } from './counter';

export const undoCounterSlice = createCounterSlice('undoCounter');
export const undoCounterActions = { ...undoCounterSlice.actions, ...ActionCreators };

// Only value changes are recorded in the history, changing the step is not undoable
const reducer = undoable(undoCounterSlice.reducer, {
    limit: 20,
    filter: includeAction([
        undoCounterSlice.actions.increment.type,
        undoCounterSlice.actions.decrement.type,
        undoCounterSlice.actions.reset.type
    ])
});

const EMPTY_HISTORY = reducer(undefined, { type: '@@INIT' });
const selectHistory = (state) => state.undoCounter || EMPTY_HISTORY;

export const selectUndoCount = (state) => selectHistory(state).present.value;
export const selectUndoStep = (state) => selectHistory(state).present.step;
export const selectCanUndo = (state) => selectHistory(state).past.length > 0;
export const selectCanRedo = (state) => selectHistory(state).future.length > 0;
export const selectHistoryValues = (state) => selectHistory(state).past.map((entry) => entry.value);

export const undoCounterModule = {
    id: 'examples-undo-counter',
    reducersMap: { undoCounter: reducer }
};
