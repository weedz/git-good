const contextMenuState: {data: Record<string, string>} = {
    data: {}
};
export function setContextMenuData(data: Record<string, string>) {
    contextMenuState.data = data;
}
export function getContextMenuData(): Readonly<typeof contextMenuState.data> {
    return contextMenuState.data;
}
