import { Component, createRef, h } from "preact";
import { LinkTypes } from "src/Data/Renderer/store";
import { Links } from "./LinkContainer";

const selectedLinks: {
    [key in LinkTypes]: Link | null
} = {
    commits: null,
    branches: null,
    files: null
}

type Props<T> = {
    activeClassName?: string
    selectTarget?: Link
    selectAction?: (arg: Link<T>) => void
    linkData?: T
    type?: LinkTypes
} & preact.JSX.HTMLAttributes<HTMLAnchorElement>

export function unselectLink(type: LinkTypes) {
    const prevLink = selectedLinks[type];
    if (prevLink) {
        prevLink.setState({});
        selectedLinks[type] = null;
    }
}

export default class Link<T = never> extends Component<Props<T>> {
    ref = createRef<HTMLAnchorElement>();
    type!: LinkTypes;

    constructor(props: Props<T>) {
        super(props);
        if (this.props.type) {
            this.type = this.props.type;
        }
    }

    onSelect = () => {
        const prevLink = selectedLinks[this.type];

        // nothing to see here.
        // @ts-ignore
        selectedLinks[this.type] = this.props?.selectTarget?.__c as Link || this;
        const selectedLink = selectedLinks[this.type];
        if (selectedLink && selectedLink !== prevLink) {
            if ("selectAction" in selectedLink.props) {
                selectedLink.props.selectAction && selectedLink.props.selectAction(selectedLink);
            }
            selectedLink.ref.current?.scrollIntoView({
                block: "nearest"
            });
            selectedLink.setState({});
        }

        if (prevLink) {
            prevLink.setState({});
        }
    }
    componentWillUnmount() {
        if (selectedLinks[this.type] === this) {
            selectedLinks[this.type] = null;
        }
    }
    render() {
        let classNames = this.props.className || "";
        if (selectedLinks[this.type] === this) {
            classNames += ` ${this.props.activeClassName}`;
        }

        const link = <a ref={this.ref} className={classNames} href="#" onClick={this.onSelect} {...this.props}>{this.props.children}</a>;

        if (!this.type) {
            return <Links.Consumer>
                {
                    type => {
                        this.type = type;
                        return link;
                    }
                }
            </Links.Consumer>
        }

        return link;
    }
}
