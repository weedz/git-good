import { createRef, h } from "preact";
import { PureComponent } from "preact/compat";
import { LinkTypes } from "src/Data/Renderer/store";
import { Links } from "./LinkContainer";

const selectedLinks: {
    [key in LinkTypes]: Link<unknown> | null
} = {
    commits: null,
    branches: null,
    files: null
}

interface Props<T> extends h.JSX.HTMLAttributes<HTMLAnchorElement> {
    selectTarget?: Link
    selectAction?: (arg: Link<T>) => void
    linkData?: T
    type?: LinkTypes
}


export function unselectLink(type: LinkTypes) {
    const prevLink = selectedLinks[type];
    if (prevLink) {
        prevLink.setState({selected: false});
        selectedLinks[type] = null;
    }
}

export function triggerAction(type: LinkTypes) {
    const link = selectedLinks[type];
    if (link) {
        link.triggerAction(true);
    }
}

export default class Link<T = never> extends PureComponent<Props<T>, {selected: boolean}> {
    ref = createRef<HTMLAnchorElement>();
    type!: LinkTypes;

    constructor(props: Props<T>) {
        super(props);
        if (this.props.type) {
            this.type = this.props.type;
        }
    }

    onClick = () => {
        this.triggerAction();
    }

    triggerAction(alwaysTrigger = false) {
        const prevLink = selectedLinks[this.type];

        selectedLinks[this.type] = this.props?.selectTarget as unknown as Link<unknown> || this;

        const selectedLink = selectedLinks[this.type];
        if (prevLink && prevLink.ref && prevLink !== selectedLink) {
            prevLink.setState({selected: false});
        }

        if (selectedLink && (alwaysTrigger || selectedLink !== prevLink)) {
            this.props.selectAction && this.props.selectAction(this);

            if (selectedLink !== this) {
                selectedLink.props.selectAction && selectedLink.props.selectAction(selectedLink);
            }

            if (selectedLink.ref) {
                selectedLink.ref.current?.scrollIntoView({
                    block: "nearest"
                });
    
                if (!alwaysTrigger) {
                    selectedLink.setState({selected: true});
                }
            }
        }
    }
    componentWillUnmount() {
        if (selectedLinks[this.type] === this) {
            selectedLinks[this.type] = null;
        }
    }
    render() {
        const props = {...this.props};
        delete props.linkData;
        delete props.selectAction;
        delete props.selectTarget;
        delete props.type;

        const classNames = props.className ? [props.className] : [];
        delete props.className;

        if (selectedLinks[this.type] === this) {
            classNames.push("selected");
        }

        const link = <a ref={this.ref} className={classNames.join(" ")} href="#" onClick={this.onClick} {...props}>{props.children}</a>;

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
