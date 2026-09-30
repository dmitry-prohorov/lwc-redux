import { createEpicMiddleware } from 'c/reduxObservable';
import { Subject, operators } from 'c/rxjs';

const { takeUntil } = operators;

const collectEpics = (eggs) => eggs.reduce((epics, egg) => (egg.epics ? epics.concat(egg.epics) : epics), []);

/**
 * redux-eggs extension that runs the `epics` declared by eggs (modules), like getSagaExtension does for sagas.
 * Epics start when their egg is added and are stopped when it is removed, so timers and subscriptions
 * opened by an epic never outlive the module. Epics shared by several eggs are reference counted.
 * @param {object} [options] options of createEpicMiddleware, e.g. { dependencies }
 */
export const getObservableExtension = (options) => {
    const epicMiddleware = createEpicMiddleware(options);
    // epic -> { count, stop$ }
    const running = new Map();

    return {
        middleware: epicMiddleware,
        afterAdd(eggs) {
            collectEpics(eggs).forEach((epic) => {
                const entry = running.get(epic);
                if (entry) {
                    entry.count += 1;
                    return;
                }
                const stop$ = new Subject();
                running.set(epic, { count: 1, stop$ });
                epicMiddleware.run((...args) => epic(...args).pipe(takeUntil(stop$)));
            });
        },
        // stop before the reducers are removed, so a stopping epic cannot dispatch into missing state
        beforeRemove(eggs) {
            collectEpics(eggs).forEach((epic) => {
                const entry = running.get(epic);
                if (!entry) {
                    return;
                }
                entry.count -= 1;
                if (entry.count === 0) {
                    running.delete(epic);
                    entry.stop$.next();
                    entry.stop$.complete();
                }
            });
        }
    };
};
