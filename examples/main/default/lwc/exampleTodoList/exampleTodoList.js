import { LightningElement } from 'lwc';
import { ReduxMixin } from 'c/reduxMixin';
import {
    FILTERS,
    addTodo,
    fetchTodos,
    selectFilter,
    selectTodoStats,
    selectTodosError,
    selectTodosStatus,
    selectVisibleTodos,
    todosActions
} from 'c/examplesStore';

const FILTER_OPTIONS = [
    { label: 'All', value: FILTERS.ALL },
    { label: 'Active', value: FILTERS.ACTIVE },
    { label: 'Completed', value: FILTERS.COMPLETED }
];

const mapStateToProps = (state) => ({
    todos: selectVisibleTodos(state),
    stats: selectTodoStats(state),
    filter: selectFilter(state),
    isLoading: selectTodosStatus(state) === 'loading',
    error: selectTodosError(state)
});

// A function receives dispatch and returns the props to assign to the component.
// Thunks (functions) can be dispatched because the provider is created with `use-thunk`.
const mapDispatchToProps = (dispatch) => ({
    loadTodos: () => dispatch(fetchTodos()),
    createTodo: (title) => dispatch(addTodo(title)),
    toggleTodo: (id) => dispatch(todosActions.toggleTodo(id)),
    removeTodo: (id) => dispatch(todosActions.removeTodo(id)),
    changeFilter: (filter) => dispatch(todosActions.setFilter(filter))
});

export default class ExampleTodoList extends ReduxMixin(LightningElement) {
    todos = [];
    stats = { total: 0, completed: 0, active: 0 };
    filter = FILTERS.ALL;
    isLoading = false;
    error;
    newTitle = '';
    filterOptions = FILTER_OPTIONS;

    connectedCallback() {
        // No `modules` here: the todos module is registered by the provider (see reduxExamples),
        // so its state survives when this component is destroyed and created again.
        this[ReduxMixin.Connect](mapStateToProps, mapDispatchToProps);
        if (!this.stats.total) {
            this.loadTodos();
        }
    }

    get hasTodos() {
        return this.todos.length > 0;
    }

    get statsLabel() {
        return `${this.stats.active} active, ${this.stats.completed} completed`;
    }

    handleTitleChange(event) {
        this.newTitle = event.detail.value;
    }

    async handleAdd() {
        const result = await this.createTodo(this.newTitle);
        if (!result.error) {
            this.newTitle = '';
        }
    }

    handleToggle(event) {
        this.toggleTodo(event.target.dataset.id);
    }

    handleRemove(event) {
        this.removeTodo(event.target.dataset.id);
    }

    handleFilterChange(event) {
        this.changeFilter(event.detail.value);
    }

    handleReload() {
        this.loadTodos();
    }
}
