import { AnyComponent, Component, createRef, h } from "preact";
import { v4 as uuid } from "uuid";
import "./style.css";

export class Notification {
    readonly id: string;
    readonly item;

    timer!: number;

    ref = createRef<NotificationComponent>();

    constructor(title: Props["title"], body: Props["body"], classes: string[], private deleteCallback: (id: string) => void, timeout: number | null = null) {
        this.id = uuid();
        this.refreshExpireTime(timeout);
        this.item = <NotificationComponent ref={this.ref} key={this.id} body={body} title={title} close={this.delete} clearTimer={this.clearTimer} classList={classes} />;
    }

    update(data: {title?: Props["title"], body?: Props["body"], time?: number | null}) {
        if (data.title !== undefined) {
            this.ref.current?.setState({title: data.title});
        }
        if (data.body !== undefined) {
            this.ref.current?.setState({body: data.body});
        }
        if (data.time !== undefined) {
            this.refreshExpireTime(data.time);
        }
    }

    addClass(className: string) {
        this.ref.current?.addClass(className);
    }
    deleteClass(className: string) {
        this.ref.current?.deleteClass(className);
    }

    private refreshExpireTime(timeout: number | null) {
        this.clearTimer();
        if (timeout) {
            this.timer = window.setTimeout(this.delete, timeout);
        }
    }
    delete = () => {
        this.clearTimer();
        this.deleteCallback(this.id);
    }
    clearTimer = () => {
        clearTimeout(this.timer);
    }
}

interface Props {
    title: string
    body: null | AnyComponent | h.JSX.Element
    classList: string[]
    close: () => void
    clearTimer: () => void
}

interface State {
    title: Props["title"]
    body: Props["body"]
}

class NotificationComponent extends Component<Props, State> {
    classes: Set<string> = new Set();

    constructor(props: Props) {
        super(props);
        this.state = {
            title: props.title,
            body: props.body,
        };
        for (const className of props.classList) {
            this.classes.add(className);
        }
    }
    addClass(className: string) {
        this.classes.add(className);
        this.forceUpdate();
    }
    deleteClass(className: string) {
        this.classes.delete(className);
        this.forceUpdate();
    }
    toggleClass(className: string) {
        if (this.classes.has(className)) {
            this.deleteClass(className);
        } else {
            this.addClass(className);
        }
    }
    render() {
        return (
            <li className={`notification ${Array.from(this.classes.values()).join(" ")}`} onMouseEnter={this.props.clearTimer}>
                <header>
                    <div className="toolbar">
                        {/* FIXME: Change "expand" icons */}
                        <span className="expand" onClick={() => this.toggleClass("expanded")}>{this.classes.has("expanded") ? "-" : "+"}</span>
                        <span className="close" onClick={this.props.close}>x</span>
                    </div>
                    <h4>{this.state.title}</h4>
                </header>
                {this.state.body}
            </li>
        );
    }
}
