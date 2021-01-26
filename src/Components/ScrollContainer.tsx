import { h, createRef, Component } from "preact";

type Props<T> = {
    items: T[]
    itemHeight: number
    containerId?: string
    className?: string
    renderItems: (items: T[], start: number) => Array<h.JSX.Element>
}
type State = {
    startRenderAt: number
    itemsToRender: number
    totalHeight: number
}

export default class ScrollContainer<T> extends Component<Props<T>, State> {
    timeout!: number;
    state = {
        startRenderAt: 0,
        itemsToRender: 0,
        totalHeight: 0,
    }
    containerRef = createRef<HTMLDivElement>();
    observer: ResizeObserver | null = null;
    componentDidMount() {
        if (this.containerRef.current) {
            this.containerRef.current.onscroll = this.scrollHandler;
            this.observer = new ResizeObserver(entries => {
                for (const entry of entries) {
                    const cr = entry.contentRect;
                    this.setState({
                        itemsToRender: Math.ceil(cr.height / this.props.itemHeight) + 1
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
    componentWillReceiveProps(nextProps: Props<T>) {
        this.setState({
            totalHeight: nextProps.itemHeight * nextProps.items.length
        });
    }
    checkScrollPosition = () => {
        if (this.containerRef.current) {
            const startCommit = Math.floor(this.containerRef?.current.scrollTop / this.props.itemHeight);
            if (startCommit !== this.state.startRenderAt) {
                this.setState({
                    startRenderAt: startCommit
                });
            }
        }
    }
    scrollHandler = (_: Event) => {
        clearTimeout(this.timeout);
        this.timeout = window.setTimeout(this.checkScrollPosition, 30);
    }
    render() {
        return (
            <div ref={this.containerRef} id={this.props.containerId} className={this.props.className}>
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
