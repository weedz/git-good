import { Component, createRef } from "preact";

type Props<T> = {
    items: T[]
    itemHeight: number
    scrollCallback?: (el: HTMLElement) => void
}
type State = {
    startRenderAt: number
    itemsToRender: number
    totalHeight: number
}

export default abstract class ScrollListView<T, P = unknown> extends Component<Props<T> & P, State> {
    timeout!: number;
    sync = false;
    state = {
        startRenderAt: 0,
        itemsToRender: 0,
        totalHeight: 0,
    }
    lastScrollPosition = {
        left: 0,
        top: 0,
    };
    containerRef = createRef<HTMLDivElement>();
    observer: ResizeObserver | null = null;
    componentDidMount() {
        if (this.props.items.length > 0 ) {
            this.setHeight(this.props);
        }
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
    setHeight(props: Props<T>) {
        this.setState({
            totalHeight: props.itemHeight * props.items.length
        });
    }

    static getDerivedStateFromProps(props: Props<unknown>, state: State) {
        const totalHeight = props.itemHeight * props.items.length;
        if (totalHeight != state.totalHeight) {
            return { totalHeight };
        }
        return null;
    }
    checkScrollPosition = () => {
        this.timeout = 0;
        if (this.containerRef.current) {
            this.lastScrollPosition = {
                left: this.containerRef.current.scrollLeft,
                top: this.containerRef.current.scrollTop,
            };
            const startLine = Math.floor(this.containerRef.current.scrollTop / this.props.itemHeight);
            if (startLine !== this.state.startRenderAt) {
                this.setState({
                    startRenderAt: startLine
                });
            }
            if (!this.sync) {
                this.props.scrollCallback?.(this.containerRef.current);
            }
            this.sync = false;
        }
    }
    scrollHandler = (_: Event) => {
        if (!this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = window.setTimeout(this.checkScrollPosition, 60);
        }
    }
}
