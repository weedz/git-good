import { Component, createRef } from "preact";

type Props<T> = {
    items: T[]
    itemHeight: number
}
type State = {
    startRenderAt: number
    itemsToRender: number
    totalHeight: number
}

export default abstract class ScrollListView<T, P = unknown> extends Component<Props<T> & P, State> {
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
        this.timeout = 0;
        if (this.containerRef.current) {
            const startLine = Math.floor(this.containerRef?.current.scrollTop / this.props.itemHeight);
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
}
