import { h } from "preact";
import { LoadCommitReturn } from "src/Data/Actions";
import { GlobalLinks, setState, Store } from "src/Data/Renderer/store";
import { showLocalMenu, showRemoteMenu, showTagMenu } from "../BranchList/Menu";
import Link from "../Link";
import HeadColors from "./HeadColors";
import { showCommitMenu } from "./Menu";

type Props = {
    graph: {
        [sha: string]: {
            descendants: LoadCommitReturn[]
            colorId: number
        }
    }
    commit: any
};

function selectCommit(c: Link) {
    setState({diffPaneSrc: c.props.linkData});
}

export default function CommitListItem({commit, graph}: Props) {
    const commitLink = (
        <Link selectAction={selectCommit} activeClassName="selected" linkData={commit.sha} onContextMenu={showCommitMenu}>
            <span className="msg">{commit.message.substring(0, commit.message.indexOf("\n")>>>0 || 60)}</span>
        </Link>
    ) as unknown as Link;
    GlobalLinks.commits[commit.sha] = commitLink;

    return (
        <li className="short" data-sha={commit.sha}>
            <div className="commit-refs-container">
                {Store.heads[commit.sha] &&
                    <ul className="commit-refs">
                        {Store.heads[commit.sha].map(ref => {
                            let menu;
                            if (ref.name.startsWith("refs/heads/")) {
                                menu = showLocalMenu;
                            } else if (ref.name.startsWith("refs/remotes/")) {
                                menu = showRemoteMenu;
                            } else if (ref.name.startsWith("refs/tags/")) {
                                menu = showTagMenu;
                            }
                            return <li><Link onContextMenu={menu} selectTarget={GlobalLinks.branches[ref.name]} style={{backgroundColor: HeadColors[graph[commit.sha].colorId].background}} data-ref={ref.name}>{ref.normalizedName}</Link></li>
                        })}
                    </ul>
                }
            </div>
            <div className="graph-container">
                <span className="graph-indicator" style={{backgroundColor: HeadColors[graph[commit.sha].colorId].color}}></span>
                {graph[commit.sha].descendants.length > 0 &&
                <ul className="commit-graph">
                    {graph[commit.sha].descendants.map(child => <li><Link selectTarget={GlobalLinks.commits[child.sha]} style={{color: HeadColors[graph[child.sha].colorId].color}}>{child.sha.substring(0,7)}</Link></li>)}
                </ul>
                }
            </div>
            
            {commitLink}
        </li>
    );
}
