import { getObjectRefCounter } from 'c/reduxDynamicModulesCore';
import { Subject, operators } from 'c/rxjs';
const { ignoreElements, switchMap } = operators;

/**
 * Creates an epic manager which manages epics being run in the system
 */
export function getEpicManager(epicMiddleware) {
    let runningEpics = {};
    // @ts-ignore
    let epicRefCounter = getObjectRefCounter();

    return {
        /**
         * Dynamically add epics.
         *
         * We should consider these potential problem:
         * * Epic could add repeatedly
         * * Epic could as a dependency of two or more modules
         * * Module hot load. React-hot-loader will rerender your react root
         * component which means it will invoke all of your logic again. So this is
         * minor worry.
         */
        add(epics = []) {
            epics.forEach((epic) => {
                const epicKey = epic.toString();
                // Check if epic already exists
                // eslint-disable-next-line no-prototype-builtins
                if (!runningEpics.hasOwnProperty(epicKey)) {
                    const replaceableWrapper = createReplaceableWrapper();
                    // we put replaceable Observable wrapper into epicMiddleware
                    epicMiddleware.run(replaceableWrapper);
                    // let's roll epic. Here we make epic run truly
                    replaceableWrapper.replaceWith(epic);
                    /**
                     * We store the reference of replaceableWrapper, so we can check if it exists next time
                     *
                     * Is there a limit on length of the key (string) in JS object?
                     * See https://stackoverflow.com/questions/13367391/is-there-a-limit-on-length-of-the-key-string-in-js-object
                     */
                    runningEpics[epicKey] = replaceableWrapper;
                }
                /**
                 * We follow practice on official document https://redux-dynamic-modules.js.org/#/reference/ModuleCounting
                 * So we use RefCounter to determine when we should remove epic
                 */
                epicRefCounter.add(epic);
            });
        },
        /**
         * Remove epics
         * Actually it will replace the real epic with a empty epic
         *
         * __Note:__
         * Under some circumstances here https://redux-observable.js.org/docs/recipes/AddingNewEpicsAsynchronously.html
         * We can't do a actual replacement.
         * But we can try to replace real epic with empty epic, it works as we expected. This benefit is given by rxjs switchMap
         */
        remove(epics = []) {
            epics.forEach((epic) => {
                epicRefCounter.remove(epic);

                const epicKey = epic.toString();
                const replaceableWrapper = runningEpics[epicKey];
                // Check if no module reference epic, we will remove epic
                if (replaceableWrapper && !epicRefCounter.getCount(epic)) {
                    // Replace the epic with empty epic, so no more unnecessary logic can cause any side effects.
                    replaceableWrapper.replaceWith(emptyEpic);
                    // Delete unnecessary replaceableWrapper reference
                    delete runningEpics[epicKey];
                }
            });
        },
        dispose() {
            runningEpics = null;
            epicRefCounter = undefined;
        }
    };
}

/**
 * create a wrapper which can be replace by a real epic.
 * And we can also use this wrapper along with {@link emptyEpic} to remove real epic logic
 */
function createReplaceableWrapper() {
    const epic$ = new Subject();

    // Wrap epic$ as a replaceable Observable
    const replaceableWrapper = (...args) =>
        epic$.pipe(
            // @ts-ignore
            switchMap((epic) => epic(...args))
        );

    // Expose a method. The wrapper can be replaced by real epic, and make it run
    replaceableWrapper.replaceWith = (epic) => {
        epic$.next(epic);
        replaceableWrapper._epic = epic;
    };
    replaceableWrapper.epicRef = () => replaceableWrapper._epic;

    return replaceableWrapper;
}

/**
 * Empty epic
 * This epic do nothing and we need it to be used for real epic replacement
 */
function emptyEpic(action$) {
    return action$.pipe(ignoreElements());
}
