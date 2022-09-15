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

const EXTRA_ITEMS_TO_RENDE = 5;

export default abstract class ScrollListView<T, P = unknown> extends Component<Props<T> & P, State> {
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
            this.containerRef.current.addEventListener("scroll", this.checkScrollPosition);
            this.observer = new ResizeObserver(entries => {
                for (const entry of entries) {
                    const cr = entry.contentRect;
                    this.setState({
                        itemsToRender: Math.ceil(cr.height / this.props.itemHeight) + EXTRA_ITEMS_TO_RENDE*2
                    });
                }
            });
            this.observer.observe(this.containerRef.current);
        }
    }
    componentWillUnmount() {
        if (this.containerRef.current) {
            this.containerRef.current.removeEventListener("scroll", this.checkScrollPosition);
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
        if (this.containerRef.current) {
            this.lastScrollPosition = {
                left: this.containerRef.current.scrollLeft,
                top: this.containerRef.current.scrollTop,
            };
            const startLine = Math.max(0, Math.floor(this.containerRef.current.scrollTop / this.props.itemHeight) - EXTRA_ITEMS_TO_RENDE);
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
}
