import { LightningElement } from 'lwc';
import { ReduxMixin } from 'c/reduxMixin';
import { searchActions, searchModule, selectQuery, selectResults, selectSearchStatus } from 'c/examplesStore';

const mapStateToProps = (state) => ({
    query: selectQuery(state),
    results: selectResults(state),
    isSearching: selectSearchStatus(state) === 'loading'
});

const mapDispatchToProps = { setQuery: searchActions.setQuery };

export default class ExampleSagaSearch extends ReduxMixin(LightningElement) {
    query = '';
    results = [];
    isSearching = false;

    connectedCallback() {
        // searchModule contains a saga, which is started when the module is added
        // and cancelled when this component disconnects.
        this[ReduxMixin.Connect](mapStateToProps, mapDispatchToProps, { modules: [searchModule] });
    }

    get hasResults() {
        return this.results.length > 0;
    }

    handleQueryChange(event) {
        this.setQuery(event.detail.value);
    }
}
