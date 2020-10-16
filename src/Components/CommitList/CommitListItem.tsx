import { h } from "preact";
import { LoadCommitReturn } from "src/Data/Actions";
import { setState, Store } from "src/Data/Renderer/store";
import Link from "../Link";
import HeadColors from "./HeadColors";
import { showCommitMenu } from "./Menu";

type Props = {
    commits: any
    graph: {
        [sha: string]: {
            descendants: LoadCommitReturn[]
            colorId: number
        }
    }
    commit: any
};

export default function CommitListItem({commit, graph, commits}: Props) {
    const commitLink = (
        <Link selectAction={(c) => setState({diffPaneSrc: c.props.linkData})} activeClassName="selected" linkData={commit.sha} onContextMenu={showCommitMenu}>
            <span className="msg">{commit.message.substring(0, commit.message.indexOf("\n")>>>0 || 60)}</span>
        </Link>
    );
    commits[commit.sha] = commitLink;

    return (
        <li className="short" data-sha={commit.sha}>
            <div className="commit-refs-container">
                {Store.heads[commit.sha] &&
                    <ul className="commit-refs">
                        {Store.heads[commit.sha].map(ref => <li style={{color: HeadColors[graph[commit.sha].colorId]}}>{ref.normalizedName}</li>)}
                    </ul>
                }
            </div>
            <span className="graph-indicator" style={{backgroundColor: HeadColors[graph[commit.sha].colorId]}}></span>
            <ul className="commit-graph">
                {graph[commit.sha].descendants.map(child => <li><Link selectTarget={commits[child.sha]} style={{color: HeadColors[graph[child.sha].colorId]}}>{child.sha.substring(0,7)}</Link></li>)}
            </ul>
            {commitLink}
        </li>
    );
}
