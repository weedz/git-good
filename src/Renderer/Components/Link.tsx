import { Component, createRef, type AnchorHTMLAttributes } from "preact";
import { LinkTypes } from "../../Common/WindowEventTypes.js";
import { Links } from "./LinkContainer.js";

export const GlobalLinks: {
  [key in LinkTypes]: {
    [key: string]: Link;
  };
} = {
  [LinkTypes.COMMITS]: {},
  [LinkTypes.BRANCHES]: {},
  [LinkTypes.FILES]: {},
};

const selectedLinks: {
  [key in LinkTypes]: Link<unknown> | null;
} = {
  [LinkTypes.COMMITS]: null,
  [LinkTypes.BRANCHES]: null,
  [LinkTypes.FILES]: null,
};

const selectedIds: {
  [key in LinkTypes]: string | undefined;
} = {
  [LinkTypes.COMMITS]: undefined,
  [LinkTypes.BRANCHES]: undefined,
  [LinkTypes.FILES]: undefined,
};

interface Props<T> extends AnchorHTMLAttributes<HTMLAnchorElement> {
  selectTarget?: () => Link;
  selectAction?: (arg: Link<T>) => void;
  linkType?: LinkTypes;
  linkId?: string;
  linkData?: T;
}

interface State {
  selected: boolean;
}

export function unselectLink(type: LinkTypes) {
  const prevLink = selectedLinks[type];
  if (prevLink) {
    prevLink.setState({ selected: false });
    selectedLinks[type] = null;
  }
}

export function triggerAction(type: LinkTypes) {
  const link = selectedLinks[type];
  if (link) {
    link.triggerAction(true);
  }
}

class Link<T = unknown> extends Component<Props<T>, State> {
  ref = createRef<HTMLAnchorElement>();
  type!: LinkTypes;

  componentDidMount() {
    this.type = this.props.linkType ?? this.context;
    if (this.props.linkId) {
      GlobalLinks[this.type][this.props.linkId] = this as Link<unknown>;

      if (this.props.linkId && selectedIds[this.type] === this.props.linkId) {
        selectedLinks[this.type] = this as Link<unknown>;
      }
    }
  }

  onClick = () => {
    this.triggerAction();
  };

  triggerAction(alwaysTrigger = false) {
    const prevLink = selectedLinks[this.type];

    selectedLinks[this.type] = (
      this.props.selectTarget ? this.props.selectTarget() : this
    ) as Link<unknown>;

    const selectedLink = selectedLinks[this.type];
    if (prevLink && prevLink.ref && prevLink !== selectedLink) {
      prevLink.setState({ selected: false });
    }

    selectedIds[this.type] = selectedLink?.props.linkId;

    if (selectedLink && (alwaysTrigger || selectedLink !== prevLink)) {
      if (this.props.selectAction) {
        this.props.selectAction(this);
      }

      if (selectedLink !== this) {
        if (selectedLink.props.selectAction) {
          selectedLink.props.selectAction(selectedLink);
        }
      }

      if (selectedLink.ref) {
        selectedLink.ref.current?.scrollIntoView({
          block: "nearest",
        });

        if (!alwaysTrigger) {
          selectedLink.setState({ selected: true });
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
    const props = { ...this.props };
    delete props.linkData;
    delete props.selectAction;
    delete props.selectTarget;
    delete props.linkType;

    // TODO: handle if `class` is a Signal
    const classNames = typeof props.class === "string" ? [props.class] : [];
    delete props.class;

    if (
      this.state.selected ||
      (this.props.linkId && selectedIds[this.type] === this.props.linkId)
    ) {
      classNames.push("selected");
    }

    return (
      <a
        ref={this.ref}
        class={classNames.join(" ")}
        // └╴  Type 'string | SignalLike<string | undefined>' is not assignable to type 'Signalish<string> | undefined'.
        //        Type 'SignalLike<string | undefined>' is not assignable to type 'Signalish<string> | undefined'.
        //          Type 'SignalLike<string | undefined>' is not assignable to type 'SignalLike<string>'.
        //            Type 'string | undefined' is not assignable to type 'string'.
        //              Type 'undefined' is not assignable to type 'string'. ts (2322) [143, 9]
        href={"#" as any} // FIXME: ??? wut (see above ??)
        onClick={this.onClick}
        {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {props.children}
      </a>
    );
  }
}

Link.contextType = Links;

export default Link;
