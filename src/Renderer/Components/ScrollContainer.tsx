import { type h } from "preact";
import ScrollListView from "./ScrollListView.js";

type Props<T> = {
    containerId?: string
    class?: string
    renderItems: (items: T[], start: number) => Array<h.JSX.Element>
}

export default class ScrollContainer<T> extends ScrollListView<T, Props<T>> {
    render() {
        return (
            <div ref={this.containerRef} id={this.props.containerId} class={`scroll-container ${this.props.class || ""}`}>
                <ul
                    style={{
                        position: "relative",
                        height: `${this.state.totalHeight}px`
                    }}>
                    {this.props.renderItems(this.props.items.slice(this.state.startRenderAt, this.state.startRenderAt + this.state.itemsToRender), this.state.startRenderAt)}
                </ul>
            </div>
        );
    }
}
