import { h } from "preact";
import { PureComponent } from "preact/compat";
import { LoadCommitReturn } from "../../Data/Actions";
import ScrollContainer from "../ScrollContainer";
import CommitListItem from "./CommitListItem";

type Props = {
    commits: LoadCommitReturn[]
    graph: {
        [sha: string]: {
            descendants: LoadCommitReturn[]
            colorId: number
        }
    }
}

// eslint-disable-next-line react/prefer-stateless-function
export default class CommitContainer extends PureComponent<Props> {
    render() {
        return <ScrollContainer items={this.props.commits} itemHeight={20} containerId="commits-container" renderItems={(commits, start) => commits.map((commit, idx) => (
            <CommitListItem
                style={{position: "absolute", top: `${(start + idx) * 20}px`, height: "20px"}}
                key={commit.sha}
                graph={this.props.graph}
                commit={commit}
            />
        ))} />
    }
}
