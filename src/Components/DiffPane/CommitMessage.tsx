import { h } from "preact";
import { CommitObj } from "src/Data/Actions";
import { GlobalLinks, setState, Store } from "src/Data/Renderer/store";
import { normalizeRemoteName } from "src/Data/Branch";
import Link from "../Link";

export default function CommitMessage(props: {commit: CommitObj}) {
    return (
        <div>
            <h4>{props.commit.sha}</h4>
            {
                Store.heads[props.commit.sha] && (
                    <ul>
                        {Store.heads[props.commit.sha].map(ref => <li>
                            <Link selectAction={_ => setState({selectedBranch: {branch: ref.name}})} selectTarget={GlobalLinks.branches[ref.name]}>{ref.normalizedName}</Link>
                            {ref.remote && <span>:<Link selectAction={_ => setState({selectedBranch: {branch: ref.remote}})} selectTarget={GlobalLinks.branches[ref.remote]}>{normalizeRemoteName(ref.remote)}</Link></span>}
                        </li>)}
                    </ul>
                )
            }
            <p>
                <span>Parents:</span>
                <ul className="parent-list">
                    {props.commit.parents.map(parent => <li><Link selectTarget={GlobalLinks.commits[parent.sha]}>{parent.sha.substring(0,7)}</Link></li>)}
                </ul>
            </p>
            <p className="date">Date: {new Date(props.commit.date * 1000).toLocaleString()}</p>
            {props.commit.date !== props.commit.authorDate && <p className="date">Authored: {new Date(props.commit.authorDate * 1000).toLocaleString()}</p>}
            <p className="author">author: {props.commit.author.name} &lt;{props.commit.author.email}&gt;</p>
            {props.commit.committer.email !== props.commit.author.email && <p className="author">commiter: {props.commit.committer.name} &lt;{props.commit.committer.email}&gt;</p>}
            <hr />
            <div className="msg">
                <h4>{props.commit.message.summary}</h4>
                <pre>{props.commit.message.body}</pre>
            </div>
        </div>
    );
}
