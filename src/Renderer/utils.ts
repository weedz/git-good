export function debounce<TArgs>(fn: (args: TArgs) => unknown, ms: number) {
  const args: { arg: TArgs | undefined; } = { arg: undefined };
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
  };
}

export function shallowDiffers(a: Record<PropertyKey, unknown>, b: Record<PropertyKey, unknown>) {
  for (const key in a) {
    if (!(key in b)) {
      return true;
    }
  }
  for (const key in b) {
    if (a[key] !== b[key]) {
      return true;
    }
  }
  return false;
}
