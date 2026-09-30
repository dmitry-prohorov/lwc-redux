import { createAsyncThunk, createEntityAdapter, createSelector, createSlice } from 'c/reduxToolkit';
import { fetchTodos as fetchTodosApi, createTodo as createTodoApi } from './api';

export const FILTERS = { ALL: 'all', ACTIVE: 'active', COMPLETED: 'completed' };

const todosAdapter = createEntityAdapter();

// createAsyncThunk dispatches todos/fetch/pending|fulfilled|rejected, handled by the thunk middleware
export const fetchTodos = createAsyncThunk('todos/fetch', () => fetchTodosApi());
export const addTodo = createAsyncThunk('todos/add', (title) => createTodoApi(title));

export const todosSlice = createSlice({
    name: 'todos',
    initialState: todosAdapter.getInitialState({ status: 'idle', error: null, filter: FILTERS.ALL }),
    reducers: {
        toggleTodo(state, { payload: id }) {
            const todo = state.entities[id];
            if (todo) {
                todo.completed = !todo.completed;
            }
        },
        removeTodo: todosAdapter.removeOne,
        setFilter(state, { payload }) {
            state.filter = payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTodos.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchTodos.fulfilled, (state, { payload }) => {
                state.status = 'idle';
                todosAdapter.setAll(state, payload);
            })
            .addCase(fetchTodos.rejected, (state, { error }) => {
                state.status = 'failed';
                state.error = error.message;
            })
            .addCase(addTodo.fulfilled, (state, { payload }) => {
                todosAdapter.addOne(state, payload);
            })
            .addCase(addTodo.rejected, (state, { error }) => {
                state.error = error.message;
            });
    }
});

export const todosActions = todosSlice.actions;

const EMPTY_TODOS = todosSlice.getInitialState();
const selectTodosState = (state) => state.todos || EMPTY_TODOS;
const adapterSelectors = todosAdapter.getSelectors(selectTodosState);

export const selectAllTodos = adapterSelectors.selectAll;
export const selectTodosStatus = (state) => selectTodosState(state).status;
export const selectTodosError = (state) => selectTodosState(state).error;
export const selectFilter = (state) => selectTodosState(state).filter;

// Memoized selectors: they only recompute when their inputs change
export const selectVisibleTodos = createSelector([selectAllTodos, selectFilter], (todos, filter) => {
    switch (filter) {
        case FILTERS.ACTIVE:
            return todos.filter((todo) => !todo.completed);
        case FILTERS.COMPLETED:
            return todos.filter((todo) => todo.completed);
        default:
            return todos;
    }
});

export const selectTodoStats = createSelector([selectAllTodos], (todos) => {
    const completed = todos.filter((todo) => todo.completed).length;
    return { total: todos.length, completed, active: todos.length - completed };
});

export const todosModule = {
    id: 'examples-todos',
    reducersMap: { todos: todosSlice.reducer }
};
