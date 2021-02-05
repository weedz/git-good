import { h, createRef, Component } from "preact";
import { LineObj } from "src/Data/Actions";

type Lines = Array<{
    type: string
    content: string
    line?: LineObj
}>

type Props = {
    lines: Lines
    width: number
}
type State = {
    startRenderAt: number
    itemsToRender: number
    totalHeight: number
}

const ITEM_HEIGHT = 17;

export default class HunksContainer extends Component<Props, State> {
    timeout!: number;
    state = {
        startRenderAt: 0,
        itemsToRender: 0,
        totalHeight: 0,
    }
    observer: ResizeObserver | null = null;
    containerRef = createRef<HTMLDivElement>();
    constructor(props: Props) {
        super(props);

        this.setState({
            totalHeight: ITEM_HEIGHT * props.lines.length,
        });
    }
    componentDidMount() {
        if (this.containerRef.current) {
            this.containerRef.current.onscroll = this.scrollHandler;
            this.observer = new ResizeObserver(entries => {
                for (const entry of entries) {
                    const cr = entry.contentRect;
                    this.setState({
                        itemsToRender: Math.ceil(cr.height / ITEM_HEIGHT) + 1
                    });
                }
            });
            this.observer.observe(this.containerRef.current);
        }
    }
    componentWillUnmount() {
        if (this.containerRef.current) {
            this.containerRef.current.onscroll = null;
        }
        if (this.observer) {
            this.observer.disconnect();
        }
    }
    componentWillReceiveProps(nextProps: Props) {
        this.setState({
            totalHeight: ITEM_HEIGHT * nextProps.lines.length,
        });
    }
    checkScrollPosition = () => {
        this.timeout = 0;
        if (this.containerRef.current) {
            const startLine = Math.floor(this.containerRef?.current.scrollTop / ITEM_HEIGHT);
            if (startLine !== this.state.startRenderAt) {
                this.setState({
                    startRenderAt: startLine
                });
            }
        }
    }
    scrollHandler = (_: Event) => {
        if (!this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = window.setTimeout(this.checkScrollPosition, 30);
        }
    }
    render() {
        const lines: h.JSX.Element[] = [];

        const type: h.JSX.Element[] = [];
        const oldGlyphs: h.JSX.Element[] = [];
        const newGlyphs: h.JSX.Element[] = [];

        this.props.lines.slice(this.state.startRenderAt, this.state.startRenderAt + this.state.itemsToRender).map((line,idx) => {
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
