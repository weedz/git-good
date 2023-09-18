import { Component, createRef, h, type AnyComponent } from "preact";
import "./style.css";

export class Notification {
    readonly id: number;
    readonly item;

    timer!: number;
    expireTime: number | null;

    ref = createRef<NotificationComponent>();

    constructor(title: Props["title"], body: Props["body"], classes: string[], private deleteCallback: (id: number) => void, timeout: number | null = null) {
        this.id = (Math.random() * Number.MAX_SAFE_INTEGER)>>>0;
        this.expireTime = timeout;
        this.refreshExpireTime();
        this.item = <NotificationComponent ref={this.ref} key={this.id} body={body} title={title} close={this.delete} clearTimer={this.clearTimer} classList={classes} resetTimer={this.refreshExpireTime} />;
    }

    update(data: {title?: Props["title"], body?: Props["body"], time?: number | null}) {
        if (data.title !== undefined) {
            this.ref.current?.setState({title: data.title});
        }
        if (data.body !== undefined) {
            this.ref.current?.setState({body: data.body});
        }
        if (data.time !== undefined) {
            this.expireTime = data.time;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore, `Element.matches` does exist :+1:
            if (!this.ref.current?.base?.matches(":hover")) {
                this.refreshExpireTime();
            }
        }
    }

    addClass(className: string) {
        this.ref.current?.addClass(className);
    }
    deleteClass(className: string) {
        this.ref.current?.deleteClass(className);
    }

    private refreshExpireTime = () => {
        this.clearTimer();
        if (this.expireTime) {
            this.timer = window.setTimeout(this.delete, this.expireTime);
        }
    }
    delete = () => {
        this.clearTimer();
        this.deleteCallback(this.id);
    }
    clearTimer = () => {
        window.clearTimeout(this.timer);
    }
}

interface Props {
    title: string
    body: null | string | AnyComponent | h.JSX.Element
    classList: string[]
    close: () => void
    clearTimer: () => void
    resetTimer: () => void
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
        for (let i = 0, len = props.classList.length; i < len; ++i) {
            this.classes.add(props.classList[i]);
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
            <li class={`notification ${Array.from(this.classes.values()).join(" ")}`} onMouseEnter={this.props.clearTimer} onMouseLeave={this.props.resetTimer}>
                <header>
                    <div class="toolbar">
                        {/* FIXME: Change "expand" icons */}
                        <span class="expand" onClick={() => this.toggleClass("expanded")}>{this.classes.has("expanded") ? "-" : "+"}</span>
                        <span class="close" onClick={this.props.close}>x</span>
                    </div>
                    <h4>{this.state.title}</h4>
                </header>
                {this.state.body}
            </li>
        );
    }
}
