import { h } from "preact";
import { PureComponent } from "preact/compat";
import { LoadCommitReturn } from "../../../Common/Actions";
import ScrollContainer from "../ScrollContainer";
import CommitListItem from "./CommitListItem";

type Props = {
    commits: LoadCommitReturn[]
    loadMore: () => void
    graph: {
        [sha: string]: {
            descendants: LoadCommitReturn[]
            colorId: number
        }
    }
}

// eslint-disable-next-line react/prefer-stateless-function
export default class CommitContainer extends PureComponent<Props> {
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
                style={{position: "absolute", top: `${(start + idx) * 20}px`, height: "20px"}}
                key={commit.sha}
                graph={this.props.graph}
                commit={commit}
            />
        ))} />
    }
}
