type CSSVariableName = "--branch-list-width" | "--font";

function loadCSSVariable(variable: CSSVariableName) {
    const value = localStorage.getItem(`styles${variable}`);
    if (!value) {
        return;
    }
    return value;
}

export function loadStylesFromLocalstorage() {
    for (const variableName of ["--branch-list-width", "--font"] as CSSVariableName[]) {
        const value = loadCSSVariable(variableName);
        if (value) {
            document.documentElement.style.setProperty(variableName, value);
        }
    }
}

export function setCSSVariable(variable: CSSVariableName, value: string) {
    document.documentElement.style.setProperty(variable, value);
    window.localStorage.setItem(`styles${variable}`, value);
}
