type CSSVariableName =
    | "--branch-list-width"
    | "--font"
    | "--border-color"
    | "--background-color"
    | "--text-color";

export const cssDefaultValues: {
    readonly [CSSVar in CSSVariableName]: string;
} = {
    "--branch-list-width": "200px",
    "--background-color": "#000000",
    "--border-color": "#999999",
    "--font": "JetBrainsMonoNL Nerd Font Mono",
    "--text-color": "#DDDDDD",
} as const;

export function getSavedCSSVariable(variable: CSSVariableName) {
    const value = localStorage.getItem(`styles${variable}`);
    if (!value) {
        return cssDefaultValues[variable];
    }
    return value;
}

export function loadStylesFromLocalstorage() {
    for (
        const variableName of [
            "--branch-list-width",
            "--font",
            "--border-color",
            "--background-color",
            "--text-color",
        ] as CSSVariableName[]
    ) {
        const value = getSavedCSSVariable(variableName);
        if (value !== undefined) {
            document.documentElement.style.setProperty(variableName, value);
        }
    }
}

export function setCSSVariable(variable: CSSVariableName, value: string) {
    document.documentElement.style.setProperty(variable, value);
    globalThis.localStorage.setItem(`styles${variable}`, value);
}
