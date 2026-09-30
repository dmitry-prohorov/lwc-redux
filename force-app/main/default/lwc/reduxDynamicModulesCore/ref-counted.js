// copied from https://github.com/microsoft/redux-dynamic-modules

import { getObjectRefCounter } from './refcounter';

/**
 * Enhances the given items with ref counting for add remove purposes
 */
export function getRefCountedManager(
    manager,
    equals,
    retained // Decides if the item is retained even when the ref count reaches 0
) {
    let refCounter = getObjectRefCounter(equals, retained);
    const items = manager.getItems();
    // Set initial ref counting
    items.forEach((item) => refCounter.add(item));

    const ret = { ...manager };

    // Wrap add method
    ret.add = (input) => {
        if (!input) {
            return;
        }

        const nonNullItems = input.filter((i) => i);
        const notAddedItems = nonNullItems.filter((i) => refCounter.getCount(i) === 0);
        manager.add(notAddedItems);
        if (manager.connect) {
            manager.connect(nonNullItems);
        }
        nonNullItems.forEach(refCounter.add);
    };

    // Wrap remove
    ret.remove = (input) => {
        if (!input) {
            return;
        }
        input.forEach((item) => {
            if (item) {
                refCounter.remove(item);
                if (refCounter.getCount(item) === 0) {
                    manager.remove([item]);
                }
            }
        });
    };

    ret.dispose = () => {
        manager.dispose();
    };

    return ret;
}
