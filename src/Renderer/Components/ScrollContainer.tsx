import { h } from "preact";
import ScrollListView from "./ScrollListView";

type Props<T> = {
    containerId?: string
    className?: string
    renderItems: (items: T[], start: number) => Array<h.JSX.Element>
}

export default class ScrollContainer<T> extends ScrollListView<T, Props<T>> {
    render() {
        return (
            <div ref={this.containerRef} id={this.props.containerId} className={`scroll-container ${this.props.className || ""}`}>
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
