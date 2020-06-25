import { h } from "preact";
import { CommitObj } from "src/Data/Actions";
import { Store } from "src/Data/Renderer/store";
import { StaticLink } from "@weedzcokie/router-tsx";
import { normalizeRemoteName } from "src/Data/Branch";

export default function CommitMessage(props: {commit: CommitObj}) {
    const message = props.commit.message.split("\n");
    const title = message.shift();
    return (
        <div>
            <h4>{props.commit.sha}</h4>
            {
                Store.heads[props.commit.sha] && (
                    <ul>
                        {Store.heads[props.commit.sha].map(ref => <li>
                            <StaticLink href={`/branch/${encodeURIComponent(ref.name)}`}>{ref.normalizedName}</StaticLink>
                            {ref.remote && <span>:<StaticLink href={`/branch/${encodeURIComponent(ref.remote)}`}>{normalizeRemoteName(ref.remote)}</StaticLink></span>}
                        </li>)}
                    </ul>
                )
            }
            <p>
                <span>Parents:</span>
                <ul class="parent-list">
                    {props.commit.parents.map(parent => <li><StaticLink href={`/commit/${parent.sha}`}>{parent.sha.substring(0,7)}</StaticLink></li>)}
                </ul>
            </p>
            <p class="date">Date: {new Date(props.commit.date * 1000).toLocaleString()}</p>
            {props.commit.date !== props.commit.authorDate && <p class="date">Authored: {new Date(props.commit.authorDate * 1000).toLocaleString()}</p>}
            <p class="author">author: {props.commit.author.name} &lt;{props.commit.author.email}&gt;</p>
            {props.commit.committer.email !== props.commit.author.email && <p class="author">commiter: {props.commit.committer.name} &lt;{props.commit.committer.email}&gt;</p>}
            <hr />
            <div class="msg">
                <h4>{title}</h4>
                {message.filter(line => !!line).map(line => <pre>{line}</pre>)}
            </div>
        </div>
    );
}