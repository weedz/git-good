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
