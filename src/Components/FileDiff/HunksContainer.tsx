import { h, createRef } from "preact";
import { PureComponent } from "preact/compat";
import { LineObj } from "src/Data/Actions";

type Props = {
    lines: Array<{
        type: string
        content: string
        line?: LineObj
    }>
}
type State = {
    startRenderAt: number
}

const ITEM_HEIGHT = 17;

export default class HunksContainer extends PureComponent<Props, State> {
    state = {
        startRenderAt: 0
    }
    containerRef = createRef<HTMLDivElement>();
    componentDidMount() {
        if (this.containerRef.current) {
            this.containerRef.current.onscroll = this.scrollHandler;
        }
    }
    componentWillUnmount() {
        if (this.containerRef.current) {
            this.containerRef.current.onscroll = null;
        }
    }
    scrollHandler = (_: Event) => {
        if (this.containerRef.current) {
            const startCommit = Math.floor(this.containerRef?.current.scrollTop / ITEM_HEIGHT);
            this.setState({
                startRenderAt: startCommit
            });
        }
    }
    render() {
        const itemsToRender = Math.ceil(window.innerHeight / ITEM_HEIGHT) + 1;

        const totalHeight = ITEM_HEIGHT * this.props.lines.length;

        const lines: h.JSX.Element[] = [];

        const type: h.JSX.Element[] = [];
        const oldGlyphs: h.JSX.Element[] = [];
        const newGlyphs: h.JSX.Element[] = [];

        this.props.lines.slice(this.state.startRenderAt, this.state.startRenderAt + itemsToRender).map((line,idx) => {
            const top = (this.state.startRenderAt + idx) * ITEM_HEIGHT;
            if (line.type === "header") {
                lines.push(
                    <li className="header" style={{position: "absolute", top: `${top}px`, height: `${ITEM_HEIGHT}px`, width: "100%"}}>
                        <div>{line.content}</div>
                    </li>
                );
                type.push(<li />);
                newGlyphs.push(<li />);
                oldGlyphs.push(<li />);
            } else if (line.line) {
                lines.push(
                    <li style={{position: "absolute", top: `${top}px`, height: `${ITEM_HEIGHT}px`, width: "100%"}} className={line.line.type && `diff-line ${line.line.type === "+" ? "new" : "old"}` || "diff-line"}>
                        <div className="diff-line-content">{line.content}</div>
                    </li>
                );
                type.push(
                    <li style={{
                        position: "absolute",
                        top: `${top}px`,
                        height: `${ITEM_HEIGHT}px`
                    }}>
                        <span className="diff-type">{line.line.type}</span>
                    </li>
                );
                if (line.line.oldLineno !== -1) {
                    oldGlyphs.push(<li style={{
                        position: "absolute",
                        top: `${top}px`,
                        height: `${ITEM_HEIGHT}px`
                    }}><span className="diff-line-number">{line.line.oldLineno}</span></li>);
                } else {
                    oldGlyphs.push(<li />);
                }
                if (line.line.newLineno !== -1) {
                    newGlyphs.push(<li style={{
                        position: "absolute",
                        top: `${top}px`,
                        height: `${ITEM_HEIGHT}px`
                    }}><span className="diff-line-number">{line.line.newLineno}</span></li>);
                } else {
                    newGlyphs.push(<li />);
                }
            } else {
                lines.push(<li />);
                type.push(<li />);
                newGlyphs.push(<li />);
                oldGlyphs.push(<li />);
            }
        });

        return (
            <div ref={this.containerRef} className="hunks inline" style={{
                display: "flex"
            }}>
                <ul style={{
                    position: "relative",
                    height: `${totalHeight}px`,
                    width: "40px"
                }}>
                    {oldGlyphs}
                </ul>
                <ul style={{
                    position: "relative",
                    height: `${totalHeight}px`,
                    width: "40px"
                }}>
                    {newGlyphs}
                </ul>
                <ul style={{
                    position: "relative",
                    height: `${totalHeight}px`,
                    width: "10px"
                }}>
                    {type}
                </ul>
                <ul style={{
                    position: "relative",
                    height: `${totalHeight}px`,
                    flex: "1",
                }}>
                    {lines}
                </ul>
            </div>
        );
    }
}
