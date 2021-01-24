import { h, createRef } from "preact";
import { PureComponent } from "preact/compat";
import { LineObj } from "src/Data/Actions";

type Props = {
    lines: {
        type: string
        content: string
        line?: LineObj
    }[]
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
        const itemsToRender = Math.ceil((this.containerRef.current?.clientHeight || window.innerHeight) / ITEM_HEIGHT) + 1;


        console.log(this.containerRef.current?.clientHeight, this.state.startRenderAt, itemsToRender);

        return (
            <div ref={this.containerRef} className="hunks inline">
                <ul style={{
                    position: "relative",
                    height: `${ITEM_HEIGHT * this.props.lines.length}px`
                }}>
                    {this.props.lines.slice(this.state.startRenderAt, this.state.startRenderAt + itemsToRender).map((line,idx) => {
                        console.log(idx * ITEM_HEIGHT);
                        if (line.type === "header") {
                            return <li className="header" style={{position: "absolute", top: `${(this.state.startRenderAt + idx) * ITEM_HEIGHT}px`, height: `${ITEM_HEIGHT}px`}}>
                                <span>{line.content}</span>
                            </li>
                        } else if (line.line) {
                            return (
                                <li style={{position: "absolute", top: `${(this.state.startRenderAt + idx) * ITEM_HEIGHT}px`, height: `${ITEM_HEIGHT}px`}} className={line.type && `diff-line ${line.line.type === "+" ? "new" : "old"}` || "diff-line"}>
                                    <span className="diff-line-number">{line.line.oldLineno !== -1 && line.line.oldLineno}</span>
                                    <span className="diff-line-number">{line.line.newLineno !== -1 && line.line.newLineno}</span>
                                    <span className="diff-type">{line.line.type}</span>
                                    <span className="diff-line-content">{line.content}</span>
                                </li>
                            );
                        }
                    })}
                </ul>
            </div>
        );
    }
}
