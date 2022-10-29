import { createRef, h } from "preact";
import { PureComponent } from "preact/compat";
import { LinkTypes } from "../../Common/WindowEventTypes";
import { Links } from "./LinkContainer";

export const GlobalLinks: {
    [key in LinkTypes]: {
        [key: string]: Link
    }
} = {
    commits: {},
    branches: {},
    files: {}
 };

const selectedLinks: {
    [key in LinkTypes]: Link<unknown> | null
} = {
    commits: null,
    branches: null,
    files: null
}

const selectedIds: {
    [key in LinkTypes]: string | undefined
} = {
    commits: undefined,
    branches: undefined,
    files: undefined
}

interface Props<T> extends h.JSX.HTMLAttributes<HTMLAnchorElement> {
    selectTarget?: () => Link
    selectAction?: (arg: Link<T>) => void
    type?: LinkTypes
    linkId?: string
    linkData?: T
}

interface State {
    selected: boolean
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

class Link<T = unknown> extends PureComponent<Props<T>, State> {
    ref = createRef<HTMLAnchorElement>();
    type!: LinkTypes;

    componentDidMount() {
        this.type = this.props.type || this.context;
        if (this.props.linkId) {
            GlobalLinks[this.type][this.props.linkId] = this as Link<unknown>;

            if (this.props.linkId && selectedIds[this.type] === this.props.linkId) {
                selectedLinks[this.type] = this as Link<unknown>;
            }
        }
    }

    onClick = () => {
        this.triggerAction();
    }

    triggerAction(alwaysTrigger = false) {
        const prevLink = selectedLinks[this.type];

        selectedLinks[this.type] = (this.props.selectTarget ? this.props.selectTarget() : this) as Link<unknown>;

        const selectedLink = selectedLinks[this.type];
        if (prevLink && prevLink.ref && prevLink !== selectedLink) {
            prevLink.setState({selected: false});
        }

        selectedIds[this.type] = selectedLink?.props.linkId;

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
        if (this.props.linkId) {
            delete GlobalLinks[this.type][this.props.linkId];
        }
    }
    render() {
        const props = {...this.props};
        delete props.linkData;
        delete props.selectAction;
        delete props.selectTarget;
        delete props.type;

        if (!this.type) {
            // Set type from context provider (LinkContainer)
            this.type = this.context;
        }

        const classNames = props.class ? [props.class] : [];
        delete props.class;

        if (this.state.selected || this.props.linkId && selectedIds[this.type] === this.props.linkId) {
            classNames.push("selected");
        }

        return <a ref={this.ref} class={classNames.join(" ")} href="#" onClick={this.onClick} {...props}>{props.children}</a>;
    }
}

Link.contextType = Links;

export default Link;
