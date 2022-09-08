import { h } from "preact";
import { BranchObj, LoadCommitReturn, RefType } from "../../../Common/Actions";
import { Store, setDiffpaneSrc } from "../../Data/store";
import { showLocalMenu, showRemoteRefMenu, showTagMenu } from "../Branches/Menu";
import Link, { GlobalLinks } from "../Link";
import HeadColors from "./HeadColors";
import { showCommitMenu } from "./Menu";

type Props = {
    graph: Map<string, {
        descendants: LoadCommitReturn[]
        colorId: number
    }>
    commit: LoadCommitReturn
    style: h.JSX.CSSProperties
};

interface CommonProps {
    graph: Map<string, {
        descendants: LoadCommitReturn[]
        colorId: number
    }>
    graphCommit: {
        descendants: LoadCommitReturn[]
        colorId: number
    }
}
function CommitGraph(props: CommonProps) {
    return (
        <ul className="commit-graph">
            {props.graphCommit.descendants.map(child => {
                const commit = props.graph.get(child.sha);
                if (!commit) {
                    console.error("Invalid graph data! Commit not found:", child.sha);
                    return;
                }
                return (
                    <li key={child.sha}>
                        <Link selectTarget={() => GlobalLinks.commits[child.sha]} style={{ color: HeadColors[commit.colorId].color }}>{child.sha.substring(0, 7)}</Link>
                    </li>
                )
            })}
        </ul>
    );
}

function GraphContainer(props: CommonProps & {
    isMerge: boolean
}) {
    return (
        <div className="graph-container">
            <span className={props.isMerge ? "graph-indicator small" : "graph-indicator"} style={{ backgroundColor: HeadColors[props.graphCommit.colorId].color }} />
            {props.graphCommit.descendants.length > 0 && <CommitGraph graph={props.graph} graphCommit={props.graphCommit} />}
        </div>
    );
}

function CommitReferences(props: {
    head: BranchObj[]
    graphCommit: CommonProps["graphCommit"]
}) {
    return (
        <ul className="commit-refs">
            {props.head.map(ref => {
                let menu;
                if (ref.type === RefType.LOCAL) {
                    menu = showLocalMenu;
                } else if (ref.type === RefType.REMOTE) {
                    menu = showRemoteRefMenu;
                } else if (ref.type === RefType.TAG) {
                    menu = showTagMenu;
                }
                return <li key={ref.name}><Link type="branches" onContextMenu={menu} selectTarget={() => GlobalLinks.branches[ref.name]} style={{ backgroundColor: HeadColors[props.graphCommit.colorId].background }} data-ref={ref.name}>{ref.normalizedName}</Link></li>
            })}
        </ul>
    );
}

function selectCommit(c: Link<string>) {
    if (c.props.linkData) {
        setDiffpaneSrc(c.props.linkData);
    }
}

export default function CommitListItem(props: Props) {
    const head = Store.heads.get(props.commit.sha);
    const graphCommit = props.graph.get(props.commit.sha);
    if (!graphCommit) {
        // PANIC!
        console.error("Invalid graph data! Commit not found:", props.commit.sha);
        return null;
    }
    return (
        <li className="short" style={props.style}>
            <div className="commit-refs-container">
                {head && <CommitReferences graphCommit={graphCommit} head={head} />}
            </div>
            <GraphContainer isMerge={props.commit.parents.length > 1} graphCommit={graphCommit} graph={props.graph} />
            <Link selectAction={selectCommit} linkId={props.commit.sha} linkData={props.commit.sha} data-sha={props.commit.sha} onContextMenu={showCommitMenu} title={props.commit.message}>
                <span className="msg">{props.commit.message.substring(0, props.commit.message.indexOf("\n") >>> 0 || 60)}</span>
            </Link>
        </li>
    );
}
