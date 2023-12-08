import { h } from "preact";
import { RefType, type BranchObj, type LoadCommitReturn } from "../../../Common/Actions";
import { LinkTypes } from "../../../Common/WindowEventTypes";
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
        <ul class="commit-graph">
            {props.graphCommit.descendants.map(child => {
                const commit = props.graph.get(child.sha);
                if (!commit) {
                    console.error("Invalid graph data! Commit not found:", child.sha);
                    return;
                }
                return (
                    <li key={child.sha}>
                        <Link selectTarget={() => GlobalLinks[LinkTypes.COMMITS][child.sha]} style={{ color: HeadColors[commit.colorId].color }}>{child.sha.substring(0, 7)}</Link>
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
        <div class="graph-container">
            <span class={props.isMerge ? "graph-indicator small" : "graph-indicator"} style={{ backgroundColor: HeadColors[props.graphCommit.colorId].color }} />
            {props.graphCommit.descendants.length > 0 && <CommitGraph graph={props.graph} graphCommit={props.graphCommit} />}
        </div>
    );
}

function CommitReferences(props: {
    head: BranchObj[]
    graphCommit: CommonProps["graphCommit"]
}) {
    return (
        <ul class="commit-refs">
            {props.head.map(ref => {
                let menu;
                if (ref.type === RefType.LOCAL) {
                    menu = showLocalMenu;
                } else if (ref.type === RefType.REMOTE) {
                    menu = showRemoteRefMenu;
                } else if (ref.type === RefType.TAG) {
                    menu = showTagMenu;
                }
                return <li key={ref.name}><Link linkType={LinkTypes.BRANCHES} onContextMenu={menu} selectTarget={() => GlobalLinks[LinkTypes.BRANCHES][ref.name]} style={{ backgroundColor: HeadColors[props.graphCommit.colorId].background }} data-ref={ref.name}>{ref.normalizedName}</Link></li>
            })}
        </ul>
    );
}

function selectCommit(c: Link<string>) {
    if (c.props.linkData) {
        setDiffpaneSrc(c.props.linkData);
    }
}

function formatCommitTime(date: Date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString(10).padStart(2, "0")}-${date.getDate().toString(10).padStart(2, "0")}`
        + " @ "
        + `${date.getHours().toString(10).padStart(2, "0")}:${date.getMinutes().toString(10).padStart(2, "0")}`;
}

export default function CommitListItem(props: Props) {
    const head = Store.heads.get(props.commit.sha);
    const graphCommit = props.graph.get(props.commit.sha);
    if (!graphCommit) {
        // PANIC!
        console.error("Invalid graph data! Commit not found:", props.commit.sha);
        return null;
    }

    const commitDate = new Date(props.commit.date);
    const commitDateStr = formatCommitTime(commitDate);

    return (
        <li class="short" style={props.style}>
            <div class="commit-refs-container">
                {head && <CommitReferences graphCommit={graphCommit} head={head} />}
            </div>
            <GraphContainer isMerge={props.commit.parents.length > 1} graphCommit={graphCommit} graph={props.graph} />
            <Link style={{
                display: "flex"
            }} selectAction={selectCommit} linkId={props.commit.sha} linkData={props.commit.sha} data-sha={props.commit.sha} onContextMenu={showCommitMenu} title={props.commit.message}>
                <span class="msg" style="flex-grow: 1">{props.commit.message.substring(0, props.commit.message.indexOf("\n") >>> 0 || 60)}</span>
                <span>{commitDateStr}</span>
            </Link>
        </li>
    );
}
