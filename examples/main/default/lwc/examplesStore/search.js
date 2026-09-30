import { createSlice } from 'c/reduxToolkit';
import { effects } from 'c/reduxSaga';
import { searchContacts } from './api';
import { showToast } from './notifications';

const { call, delay, put, takeLatest } = effects;

export const DEBOUNCE_MS = 300;

const initialState = { query: '', results: [], status: 'idle', error: null };

export const searchSlice = createSlice({
    name: 'search',
    initialState,
    reducers: {
        setQuery(state, { payload }) {
            state.query = payload;
        },
        searchStarted(state) {
            state.status = 'loading';
            state.error = null;
        },
        searchSucceeded(state, { payload }) {
            state.status = 'idle';
            state.results = payload;
        },
        searchFailed(state, { payload }) {
            state.status = 'failed';
            state.error = payload;
        },
        clearResults(state) {
            state.status = 'idle';
            state.results = [];
        }
    }
});

export const searchActions = searchSlice.actions;

export function* searchWorker({ payload: query }) {
    // takeLatest cancels this worker when a new query arrives, so delay() acts as a debounce
    yield delay(DEBOUNCE_MS);
    if (!query || !query.trim()) {
        yield put(searchActions.clearResults());
        return;
    }
    yield put(searchActions.searchStarted());
    try {
        const results = yield call(searchContacts, query);
        yield put(searchActions.searchSucceeded(results));
        yield showToast(
            results.length
                ? {
                      title: 'Search finished',
                      message: `Found ${results.length} contact(s) for "${query}"`,
                      variant: 'success'
                  }
                : { title: 'Search finished', message: `No contacts match "${query}"`, variant: 'info' }
        );
    } catch (e) {
        yield put(searchActions.searchFailed(e.message));
        yield showToast({ title: 'Search failed', message: e.message, variant: 'error' });
    }
}

export function* searchSaga() {
    yield takeLatest(searchActions.setQuery.type, searchWorker);
}

const selectSearch = (state) => state.search || initialState;
export const selectQuery = (state) => selectSearch(state).query;
export const selectResults = (state) => selectSearch(state).results;
export const selectSearchStatus = (state) => selectSearch(state).status;

// Sagas listed in a module start when the module is added and are cancelled when it is removed.
// Requires <c-redux-provider use-saga>.
export const searchModule = {
    id: 'examples-search',
    reducersMap: { search: searchSlice.reducer },
    sagas: [searchSaga]
};
