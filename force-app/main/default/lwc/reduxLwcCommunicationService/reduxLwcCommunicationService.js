import { Subject } from 'c/rxjs';
// @ts-nocheck
export class ReduxLwcCommunicationService {
     /**
     * @type {Subject}
     */
      #stream$;

    constructor() {
        this.#stream$ = new Subject();
    }

    send(fn,...args) {
        this.#stream$.next({fn, args})
    }

    getStream() {
        return this.#stream$.asObservable();
    }

    clear() {
        this.#stream$.unsubscribe();
    }
}