// jsdom does not apply the user agent stylesheet, so getComputedStyle(element).display is an empty string.
// <c-redux-provider> skips state updates for components without a computed display (detached elements),
// therefore we emulate the browser default for attached elements: custom elements are `display: inline`.
const getComputedStyle = window.getComputedStyle.bind(window);

window.getComputedStyle = (element, pseudoElement) => {
    const style = getComputedStyle(element, pseudoElement);
    if (style.display || !element.isConnected) {
        return style;
    }
    return new Proxy(style, {
        get(target, prop) {
            if (prop === 'display') {
                return 'inline';
            }
            const value = Reflect.get(target, prop);
            return typeof value === 'function' ? value.bind(target) : value;
        }
    });
};
