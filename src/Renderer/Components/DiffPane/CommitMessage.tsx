import { h } from "preact";
import { type CommitObj } from "../../../Common/Actions";
import { formatTimeAgo } from "../../../Common/Utils";
import { LinkTypes } from "../../../Common/WindowEventTypes";
import Link, { GlobalLinks } from "../Link";

export default function CommitMessage(props: {commit: CommitObj}) {
    const commitDate = new Date(props.commit.date * 1000);
    const authorDate = props.commit.date !== props.commit.authorDate ? new Date(props.commit.authorDate * 1000) : commitDate;

    let signature;
    if (props.commit.signature) {
        const commitSignature = props.commit.signature;
        signature = <span class={`commit-signature pointer ${commitSignature.verified ? "good" : "unknown"}`} onClick={() => navigator.clipboard.writeText(commitSignature.data)} title={commitSignature.data}>Signed</span>
    }

    return (
        <div>
            <div class="pane commit-header">
                {signature}
                <span class="commit-sha pointer" title="Copy sha" onClick={() => navigator.clipboard.writeText(props.commit.sha)}>{props.commit.sha.substring(0, 8)}</span>
            </div>
            <div class="msg">
                <h4>{props.commit.message.summary}</h4>
                <pre>{props.commit.message.body}</pre>
            </div>
            <p>
                <span>Parents:</span>
                <ul class="parent-list">
                    {props.commit.parents.map(parent => <li key={parent.sha}><Link linkType={LinkTypes.COMMITS} selectTarget={() => GlobalLinks[LinkTypes.COMMITS][parent.sha]}>{parent.sha.substring(0,7)}</Link></li>)}
                </ul>
            </p>
            <p class="date">Date: {commitDate.toISOString().substring(0, 19)}Z ({formatTimeAgo(commitDate)})</p>
            {props.commit.date !== props.commit.authorDate && <p class="date">Authored: {authorDate.toISOString().substring(0, 19)}Z ({formatTimeAgo(authorDate)})</p>}
            <p class="author">author: {props.commit.author.name} &lt;{props.commit.author.email}&gt;</p>
            {props.commit.committer.email !== props.commit.author.email && <p class="author">commiter: {props.commit.committer.name} &lt;{props.commit.committer.email}&gt;</p>}
        </div>
    );
}
