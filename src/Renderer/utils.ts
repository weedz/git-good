export function debounce<TArgs>(fn: (args: TArgs) => unknown, ms: number) {
    const args: {arg: TArgs | undefined} = { arg: undefined };
    let timeout: number = 0;

    const invoke = () => {
        timeout = 0;
        args.arg !== undefined && fn(args.arg);
    };

    return (arg: TArgs) => {
        args.arg = arg;
        if (!timeout) {
            timeout = window.setTimeout(invoke, ms);
        }
    }
}

export function shallowDiffers(a: Record<PropertyKey, unknown>, b: Record<PropertyKey, unknown>) {
    const objA_keys = Object.keys(a);
    for (let i = 0, len = objA_keys.length; i < len; ++i) {
        if (!(objA_keys[i] in b)) {
            return true;
        }
    }
    const objB_keys = Object.keys(b);
    for (let i = 0, len = objB_keys.length; i < len; ++i) {
        if (a[objB_keys[i]] !== b[objB_keys[i]]) {
            return true;
        }
    }
    return false;
}
