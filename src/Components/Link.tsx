import { Component, h } from "preact";

let selectedLink: Link | null;

type Props = {
    activeClassName?: string
    selectTarget?: Link
    selectAction?: (arg: Link) => void
    linkData?: any
} & preact.JSX.HTMLAttributes<HTMLAnchorElement>

export default class Link extends Component<Props> {
    onSelect = () => {
        const prevLink = selectedLink;

        // nothing to see here.
        // @ts-ignore
        selectedLink = this.props?.selectTarget?.__c || this;
        if (selectedLink && selectedLink !== prevLink) {
            selectedLink.setState({});
            selectedLink.props.selectAction && selectedLink.props.selectAction(selectedLink);
        }

        if (prevLink) {
            prevLink.setState({});
        }
    }
    componentWillUnmount() {
        if (selectedLink === this) {
            selectedLink = null;
        }
    }
    render() {
        let classNames = this.props.className || "";
        if (selectedLink === this) {
            classNames += ` ${this.props.activeClassName}`;
        }

        return <a className={classNames} href="#" onClick={this.onSelect} {...this.props}>{this.props.children}</a>
    }
}
