import { h } from "preact";
import { CommitObj } from "src/Data/Actions";
import { formatTimeAgo } from "src/Data/Utils";
import { GlobalLinks } from "src/Data/Renderer/store";
import Link from "../Link";

export default function CommitMessage(props: {commit: CommitObj}) {
    const commitDate = new Date(props.commit.date * 1000);
    const authorDate = props.commit.date !== props.commit.authorDate ? new Date(props.commit.authorDate * 1000) : commitDate;
    return (
        <div>
            <h4>{props.commit.sha}</h4>
            <div className="msg">
                <h4>{props.commit.message.summary}</h4>
                <pre>{props.commit.message.body}</pre>
            </div>
            <p>
                <span>Parents:</span>
                <ul className="parent-list">
                    {props.commit.parents.map(parent => <li><Link type="commits" selectTarget={GlobalLinks.commits[parent.sha]}>{parent.sha.substring(0,7)}</Link></li>)}
                </ul>
            </p>
            <p className="date">Date: {commitDate.toISOString().substring(0, 19)}Z ({formatTimeAgo(commitDate)})</p>
            {props.commit.date !== props.commit.authorDate && <p className="date">Authored: {authorDate.toISOString().substring(0, 19)}Z ({formatTimeAgo(authorDate)})</p>}
            <p className="author">author: {props.commit.author.name} &lt;{props.commit.author.email}&gt;</p>
            {props.commit.committer.email !== props.commit.author.email && <p className="author">commiter: {props.commit.committer.name} &lt;{props.commit.committer.email}&gt;</p>}
        </div>
    );
}
