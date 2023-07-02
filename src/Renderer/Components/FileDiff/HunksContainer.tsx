import { h } from "preact";
import { type LineObj } from "../../../Common/Actions";
import ScrollListView from "../ScrollListView";

interface Line {
    type: string
    content: string
    line?: LineObj
}

interface Props {
    width: number
    onRef?: (ref: HunksContainer) => void
    hideOldGlyphs?: boolean
    hideNewGlyphs?: boolean
}

const ITEM_HEIGHT = 17;

export default class HunksContainer extends ScrollListView<Line, Props> {
    componentDidMount() {
        super.componentDidMount();
        this.props.onRef?.(this);
    }
    render() {
        const lines: h.JSX.Element[] = [];

        const type: h.JSX.Element[] = [];
        const oldGlyphs: h.JSX.Element[] = [];
        const newGlyphs: h.JSX.Element[] = [];

        this.props.items.slice(this.state.startRenderAt, this.state.startRenderAt + this.state.itemsToRender).map((line,idx) => {
            const key = this.state.startRenderAt + idx;
            const top = key * ITEM_HEIGHT;
            if (line.type === "header") {
                lines.push(
                    <li key={key} class="header" style={{position: "absolute", top, height: ITEM_HEIGHT, width: "100%"}}>
                        <div>{line.content}</div>
                    </li>
                );
                type.push(<li key={key} />);
                newGlyphs.push(<li key={key} />);
                oldGlyphs.push(<li key={key} />);
            } else if (line.line) {
                lines.push(
                    <li key={key} style={{
                        position: "absolute",
                        top,
                        height: ITEM_HEIGHT,
                        width: "100%"
                        }} class={line.line.type && `diff-line ${line.line.type === "+" ? "new" : "old"}` || "diff-line"}
                    >
                        <div class="diff-line-content">{line.content}</div>
                    </li>
                );
                type.push(
                    <li key={key} style={{
                        position: "absolute",
                        top,
                        height: ITEM_HEIGHT
                    }}>
                        <span class="diff-type">{line.line.type}</span>
                    </li>
                );
                if (!this.props.hideOldGlyphs) {
                    if (line.line.oldLineno !== -1) {
                        oldGlyphs.push(<li key={key} style={{
                            position: "absolute",
                            top,
                            height: ITEM_HEIGHT
                        }}><span class="diff-line-number">{line.line.oldLineno}</span></li>);
                    } else {
                        oldGlyphs.push(<li key={key} />);
                    }
                }
                if (!this.props.hideNewGlyphs) {
                    if (line.line.newLineno !== -1) {
                        newGlyphs.push(<li key={key} style={{
                            position: "absolute",
                            top,
                            height: ITEM_HEIGHT
                        }}><span class="diff-line-number">{line.line.newLineno}</span></li>);
                    } else {
                        newGlyphs.push(<li key={key} />);
                    }
                }
            } else {
                lines.push(<li key={key} />);
                type.push(<li key={key} />);
                !this.props.hideNewGlyphs && newGlyphs.push(<li key={key} />);
                !this.props.hideOldGlyphs && oldGlyphs.push(<li key={key} />);
            }
        });

        return (
            <div ref={this.containerRef} class="hunks inline" style={{
                display: "flex",
                flex: 1,
                overflow: "auto",
                position: "relative",
            }}>
                <ul style={{
                    position: "relative",
                    height: this.state.totalHeight,
                    width: 40
                }}>
                    {oldGlyphs}
                </ul>
                <ul style={{
                    position: "relative",
                    height: this.state.totalHeight,
                    width: 40
                }}>
                    {newGlyphs}
                </ul>
                <ul style={{
                    position: "relative",
                    height: this.state.totalHeight,
                    width: 10
                }}>
                    {type}
                </ul>
                <ul style={{
                    position: "absolute",
                    left: 90,
                    width: `max(calc(100% - 90px), ${this.props.width}px)`,
                    height: this.state.totalHeight,
                    flex: 1,
                }}>
                    {lines}
                </ul>
            </div>
        );
    }
}
