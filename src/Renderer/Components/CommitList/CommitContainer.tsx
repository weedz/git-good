import { Component } from "preact";
import { type LoadCommitReturn } from "../../../Common/Actions";
import ScrollContainer from "../ScrollContainer";
import CommitListItem from "./CommitListItem";

type Props = {
    commits: LoadCommitReturn[]
    loadMore: () => void
    graph: Map<string, {
        descendants: LoadCommitReturn[]
        colorId: number
    }>;
}

export default class CommitContainer extends Component<Props> {
    checkScroll = (el: HTMLElement) => {
        const bottom = el.scrollTop + el.clientHeight;
        const percentScrolled = bottom / el.scrollHeight;
        // FIXME: Use a bettr value here? Maybe take into account the total height of the scroll container instead of just always using 90%
        if (percentScrolled > .9) {
            this.props.loadMore();
        }
    }
    render() {
        return <ScrollContainer scrollCallback={this.checkScroll} items={this.props.commits} itemHeight={20} containerId="commits-container" renderItems={(commits, start) => commits.map((commit, idx) => (
            <CommitListItem
                style={{ position: "absolute", top: `${(start + idx) * 20}px`, height: "20px" }}
                key={commit.sha}
                graph={this.props.graph}
                commit={commit}
            />
        ))} />
    }
}
