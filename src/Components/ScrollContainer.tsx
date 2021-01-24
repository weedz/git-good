import { h, createRef } from "preact";
import { PureComponent } from "preact/compat";

type Props<T> = {
    items: T[]
    itemHeight: number
    containerId?: string
    className?: string
    renderItems: (items: T[], start: number) => Array<preact.JSX.Element>
}
type State = {
    startRenderAt: number
}

export default class ScrollContainer<T> extends PureComponent<Props<T>, State> {
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
            const startCommit = Math.floor(this.containerRef?.current.scrollTop / this.props.itemHeight);
            this.setState({
                startRenderAt: startCommit
            });
        }
    }
    render() {
        const itemsToRender = Math.ceil((this.containerRef.current?.clientHeight || window.innerHeight) / this.props.itemHeight) + 1;

        return (
            <div ref={this.containerRef} id={this.props.containerId} className={this.props.className}>
                <ul
                    style={{
                        position: "relative",
                        height: `${this.props.itemHeight * this.props.items.length}px`
                }}>
                    {this.props.renderItems(this.props.items.slice(this.state.startRenderAt, this.state.startRenderAt + itemsToRender), this.state.startRenderAt)}
                </ul>
            </div>
        );
    }
}
