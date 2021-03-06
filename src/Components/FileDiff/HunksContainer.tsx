import { h } from "preact";
import { LineObj } from "../../Data/Actions";
import ScrollListView from "../ScrollListView";

type Line = {
    type: string
    content: string
    line?: LineObj
}

const ITEM_HEIGHT = 17;

export default class HunksContainer extends ScrollListView<Line, {width: number}> {
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
                    <li key={key} className="header" style={{position: "absolute", top, height: ITEM_HEIGHT, width: "100%"}}>
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
                        }} className={line.line.type && `diff-line ${line.line.type === "+" ? "new" : "old"}` || "diff-line"}
                    >
                        <div className="diff-line-content">{line.content}</div>
                    </li>
                );
                type.push(
                    <li key={key} style={{
                        position: "absolute",
                        top,
                        height: ITEM_HEIGHT
                    }}>
                        <span className="diff-type">{line.line.type}</span>
                    </li>
                );
                if (line.line.oldLineno !== -1) {
                    oldGlyphs.push(<li key={key} style={{
                        position: "absolute",
                        top,
                        height: ITEM_HEIGHT
                    }}><span className="diff-line-number">{line.line.oldLineno}</span></li>);
                } else {
                    oldGlyphs.push(<li key={key} />);
                }
                if (line.line.newLineno !== -1) {
                    newGlyphs.push(<li key={key} style={{
                        position: "absolute",
                        top,
                        height: ITEM_HEIGHT
                    }}><span className="diff-line-number">{line.line.newLineno}</span></li>);
                } else {
                    newGlyphs.push(<li key={key} />);
                }
            } else {
                lines.push(<li key={key} />);
                type.push(<li key={key} />);
                newGlyphs.push(<li key={key} />);
                oldGlyphs.push(<li key={key} />);
            }
        });

        return (
            <div ref={this.containerRef} className="hunks inline" style={{
                display: "flex",
                flex: 1
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
