import { clone } from './clone';

export * from './toolkit';

/**
 * Assigns the properties of the payload to the state using an optional callback.
 * @template T
 * @param {T} state - The state object to which the payload properties will be assigned.
 * @param {Partial<T>} payload - The payload object containing properties to assign to the state.
 * @param {(state: T, key: keyof T, value: any) => void} [assigner] - Optional callback to customize the assignment behavior.
 */
export const assignPayloadToState = (
    state,
    payload,
    assigner = (assignee, key, value) => {
        assignee[key] = clone(value);
    }
) => {
    for (const key of Object.keys(payload)) {
        if (key in state) {
            assigner(state, key, payload[key]);
        }
    }
};

/**
 * @template T
 * Assigner function that assigns a value to a key in the assignee if the value is not undefined.
 * @param {T} assignee - The object to assign the value to.
 * @param {keyof T} key - The key to assign the value to.
 * @param {any} value - The value to assign.
 */
export const safeAssigner = (assignee, key, value) => {
    if (value !== undefined) {
        assignee[key] = clone(value);
    }
};
