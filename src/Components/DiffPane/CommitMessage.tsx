import { h } from "preact";
import { CommitObj } from "src/Data/Actions";
import { formatTimeAgo } from "src/Data/Utils";
import Link, { GlobalLinks } from "../Link";
import { clipboard } from "electron";

export default function CommitMessage(props: {commit: CommitObj}) {
    const commitDate = new Date(props.commit.date * 1000);
    const authorDate = props.commit.date !== props.commit.authorDate ? new Date(props.commit.authorDate * 1000) : commitDate;

    let signature;
    if (props.commit.signature) {
        const commitSignature = props.commit.signature;
        signature = <span className={`commit-signature pointer ${commitSignature.verified ? "good" : "unknown"}`} onClick={() => clipboard.writeText(commitSignature.data)} title={commitSignature.data}>Signed</span>
    }

    return (
        <div>
            <div className="pane commit-header">
                {signature}
                <span className="commit-sha pointer" title="Copy sha" onClick={() => clipboard.writeText(props.commit.sha)}>{props.commit.sha.substring(0, 8)}</span>
            </div>
            <div className="msg">
                <h4>{props.commit.message.summary}</h4>
                <pre>{props.commit.message.body}</pre>
            </div>
            <p>
                <span>Parents:</span>
                <ul className="parent-list">
                    {props.commit.parents.map(parent => <li key={parent.sha}><Link type="commits" selectTarget={() => GlobalLinks.commits[parent.sha]}>{parent.sha.substring(0,7)}</Link></li>)}
                </ul>
            </p>
            <p className="date">Date: {commitDate.toISOString().substring(0, 19)}Z ({formatTimeAgo(commitDate)})</p>
            {props.commit.date !== props.commit.authorDate && <p className="date">Authored: {authorDate.toISOString().substring(0, 19)}Z ({formatTimeAgo(authorDate)})</p>}
            <p className="author">author: {props.commit.author.name} &lt;{props.commit.author.email}&gt;</p>
            {props.commit.committer.email !== props.commit.author.email && <p className="author">commiter: {props.commit.committer.name} &lt;{props.commit.committer.email}&gt;</p>}
        </div>
    );
}
