import { h } from "preact";
import { PureComponent } from "preact/compat";
import { LoadCommitReturn, RefType } from "src/Data/Actions";
import { GlobalLinks, updateStore, Store } from "src/Data/Renderer/store";
import { showLocalMenu, showRemoteRefMenu, showTagMenu } from "../BranchList/Menu";
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
    commit: LoadCommitReturn
    style: h.JSX.CSSProperties
};

function selectCommit(c: Link<string>) {
    updateStore({diffPaneSrc: c.props.linkData});
}

// prefer-stateless-function is disabled for PureComponents from react but is not recognized from preact.
// eslint-disable-next-line react/prefer-stateless-function
export default class CommitListItem extends PureComponent<Props> {
    render() {
        const commitLink = (
            <Link selectAction={selectCommit} linkData={this.props.commit.sha} data-sha={this.props.commit.sha} onContextMenu={showCommitMenu}>
                <span className="msg">{this.props.commit.message.substring(0, this.props.commit.message.indexOf("\n")>>>0 || 60)}</span>
            </Link>
        ) as unknown as Link;
        GlobalLinks.commits[this.props.commit.sha] = commitLink;
        
        return (
            <li className="short" style={this.props.style}>
                <div className="commit-refs-container">
                    {Store.heads[this.props.commit.sha] &&
                        <ul className="commit-refs">
                            {Store.heads[this.props.commit.sha].map(ref => {
                                let menu;
                                if (ref.type === RefType.LOCAL) {
                                    menu = showLocalMenu;
                                } else if (ref.type === RefType.REMOTE) {
                                    menu = showRemoteRefMenu;
                                } else if (ref.type === RefType.TAG) {
                                    menu = showTagMenu;
                                }
                                return <li><Link type="branches" onContextMenu={menu} selectAction={_ => updateStore({diffPaneSrc: null})} selectTarget={GlobalLinks.branches[ref.name]} style={{backgroundColor: HeadColors[this.props.graph[this.props.commit.sha].colorId].background}} data-ref={ref.name}>{ref.normalizedName}</Link></li>
                            })}
                        </ul>
                    }
                </div>
                <div className="graph-container">
                    <span className={this.props.commit.parents.length > 1 ? "graph-indicator small" : "graph-indicator"} style={{backgroundColor: HeadColors[this.props.graph[this.props.commit.sha].colorId].color}} />
                    {this.props.graph[this.props.commit.sha].descendants.length > 0 &&
                    <ul className="commit-graph">
                        {this.props.graph[this.props.commit.sha].descendants.map(child => <li><Link selectTarget={GlobalLinks.commits[child.sha]} style={{color: HeadColors[this.props.graph[child.sha].colorId].color}}>{child.sha.substring(0,7)}</Link></li>)}
                    </ul>
                    }
                </div>
                {commitLink}
            </li>
        );
    }
}
